package com.sreeshanth.backend.controller;

import com.sreeshanth.backend.dto.RagDtos;
import com.sreeshanth.backend.model.Report;
import com.sreeshanth.backend.model.User;
import com.sreeshanth.backend.repository.UserRepository;
import com.sreeshanth.backend.service.FileStorageService;
import com.sreeshanth.backend.service.RagServiceClient;
import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Real file-upload endpoint for user health reports — replaces the simulated
 * client-side flow that previously hardcoded "Hypertension (from report)".
 *
 * Flow:
 *   1. Multipart upload accepted at /api/users/{id}/reports.
 *   2. File saved to local disk (FileStorageService).
 *   3. Apache Tika extracts plain text from the PDF/DOCX/image.
 *   4. Extracted text forwarded to Python /ingest/report so future RAG queries
 *      can retrieve from the user's own report alongside global guidelines.
 *   5. A Report row is appended to user.pastReports.
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ReportUploadController {

    private static final int TIKA_MAX_TEXT_BYTES = 10_000_000; // 10MB of extracted text

    private final FileStorageService fileStorage;
    private final RagServiceClient ragServiceClient;
    private final UserRepository userRepository;

    @PostMapping(value = "/{userId}/reports", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadReport(
            @AuthenticationPrincipal User principal,
            @PathVariable String userId,
            @RequestParam("file") MultipartFile file) {

        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated."));
        }
        if (!principal.getId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Cannot upload reports for a different user."));
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty."));
        }

        FileStorageService.StoredFile stored;
        try {
            stored = fileStorage.store(userId, file);
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to save file.", "detail", e.getMessage()));
        }

        String extractedText;
        try {
            Tika tika = new Tika();
            tika.setMaxStringLength(TIKA_MAX_TEXT_BYTES);
            extractedText = tika.parseToString(stored.absolutePath().toFile());
        } catch (IOException | TikaException e) {
            return ResponseEntity.status(415).body(Map.of(
                    "error", "Could not extract text from file.",
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
        }

        if (extractedText == null || extractedText.isBlank()) {
            return ResponseEntity.status(415).body(Map.of(
                    "error", "No text could be extracted from the file. Scanned images without OCR text are not supported."
            ));
        }

        String analysis;
        try {
            RagDtos.IngestReportResponse ingest = ragServiceClient.ingestUserReport(
                    userId, extractedText, stored.originalName()
            );
            analysis = String.format(
                    "Indexed for personalization — %d chunk%s now retrievable for your future recommendations.",
                    ingest.chunks() == null ? 0 : ingest.chunks(),
                    (ingest.chunks() != null && ingest.chunks() == 1) ? "" : "s"
            );
        } catch (IllegalStateException ise) {
             try {
                Files.deleteIfExists(stored.absolutePath());
            } catch (IOException ignore) { }
            // Catch our wrapper exception which may contain the 400 bad request error from python
            if (ise.getMessage().contains("400 Bad Request")) {
                 return ResponseEntity.status(400).body(Map.of(
                    "error", "Document doesn't appear to be a medical report. Please upload healthcare documents, lab reports, or clinical summaries.",
                    "detail", ise.getMessage()
                ));
            }
            return ResponseEntity.status(503).body(Map.of(
                    "error", "rag-service processing failed; report not indexed.",
                    "detail", ise.getMessage()
            ));
        } catch (Exception e) {
            // Soft-fail: keep the file + record the upload even if rag-service is down.
            // The user can retry ingestion later; the file is already on disk.
            try {
                Files.deleteIfExists(stored.absolutePath());
            } catch (IOException ignore) { /* best-effort */ }
            return ResponseEntity.status(503).body(Map.of(
                    "error", "rag-service unreachable; report not indexed.",
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found."));
        }

        User user = userOpt.get();
        Report report = new Report(
                stored.originalName(),
                LocalDate.now().toString(),
                analysis
        );
        if (user.getPastReports() == null) {
            user.setPastReports(new java.util.ArrayList<>());
        }
        user.getPastReports().add(report);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "report", report,
                "pastReports", user.getPastReports()
        ));
    }

    @GetMapping("/{userId}/reports")
    public ResponseEntity<?> listReports(
            @AuthenticationPrincipal User principal,
            @PathVariable String userId) {

        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated."));
        }
        if (!principal.getId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Cannot view reports for a different user."));
        }

        List<Report> reports = userRepository.findById(userId)
                .map(User::getPastReports)
                .orElse(List.of());
        return ResponseEntity.ok(reports);
    }
}
