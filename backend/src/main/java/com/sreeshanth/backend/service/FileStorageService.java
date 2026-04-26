package com.sreeshanth.backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Persists user-uploaded health reports to local disk under
 * <app.uploads.dir>/<userId>/<timestamp>_<safe-filename>.
 *
 * Local filesystem chosen for dev simplicity; a future deployment can swap
 * the implementation for S3/MinIO without touching callers.
 */
@Service
public class FileStorageService {

    private static final Pattern UNSAFE_CHARS = Pattern.compile("[^A-Za-z0-9._-]");
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    @Value("${app.uploads.dir}")
    private String uploadsDir;

    private Path baseDir;

    @PostConstruct
    void init() throws IOException {
        this.baseDir = Paths.get(uploadsDir).toAbsolutePath().normalize();
        Files.createDirectories(this.baseDir);
    }

    public StoredFile store(String userId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty.");
        }

        String original = file.getOriginalFilename() == null ? "report" : file.getOriginalFilename();
        String safeName = UNSAFE_CHARS.matcher(original).replaceAll("_");
        String stamped = LocalDateTime.now().format(TS) + "_" + safeName;

        Path userDir = baseDir.resolve(sanitizeUserId(userId)).normalize();
        if (!userDir.startsWith(baseDir)) {
            throw new SecurityException("Resolved user directory escapes uploads root.");
        }
        Files.createDirectories(userDir);

        Path target = userDir.resolve(stamped);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        return new StoredFile(safeName, target, file.getContentType(), file.getSize());
    }

    private static String sanitizeUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId is required.");
        }
        return UNSAFE_CHARS.matcher(userId).replaceAll("_");
    }

    public record StoredFile(String originalName, Path absolutePath, String contentType, long sizeBytes) {}
}
