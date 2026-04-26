package com.sreeshanth.backend.controller;

import com.sreeshanth.backend.dto.RagDtos;
import com.sreeshanth.backend.model.User;
import com.sreeshanth.backend.service.AiSummaryService;
import com.sreeshanth.backend.service.RagServiceClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;
import java.util.concurrent.TimeoutException;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = {"http://localhost:5173", "https://localhost:5173"})
@RequiredArgsConstructor
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final RagServiceClient ragServiceClient;
    private final AiSummaryService aiSummaryService;

    /**
     * RAG-grounded health recommendations. Spring Boot is the orchestrator here:
     * it owns the User (Mongo), forwards to the Python rag-service, and returns
     * the recommendation along with the retrieved source chunks so the frontend
     * can render a "Sources used" panel.
     */
    @PostMapping("/recommendations")
    public ResponseEntity<?> getAiRecommendations(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> airQualityData) {

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated."));
        }

        try {
            RagDtos.RecommendResponse response = ragServiceClient.getRecommendation(user, airQualityData);
            return ResponseEntity.ok(response);
        } catch (WebClientResponseException e) {
            log.warn("rag-service /recommend rejected request: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            return ResponseEntity.status(502).body(Map.of(
                    "error", "rag-service rejected the request",
                    "status", e.getStatusCode().value(),
                    "detail", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            return mapDownstreamFailure("recommendations", e);
        }
    }

    /**
     * LangGraph agentic endpoint — proxies to Python /agent/analyze. The agent
     * autonomously chooses tools (fetch_aqi_for_city, get_health_recommendation)
     * and we surface its answer plus the tool-call trace.
     */
    @PostMapping("/agent")
    public ResponseEntity<?> runAgenticAnalysis(
            @AuthenticationPrincipal User user,
            @RequestBody RagDtos.AgentAnalyzeRequest body) {

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated."));
        }
        try {
            RagDtos.AgentAnalyzeResponse response = ragServiceClient.analyzeAgentic(body);
            return ResponseEntity.ok(response);
        } catch (WebClientResponseException e) {
            log.warn("rag-service /agent/analyze rejected: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            return ResponseEntity.status(502).body(Map.of(
                    "error", "rag-service rejected the request",
                    "status", e.getStatusCode().value(),
                    "detail", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            return mapDownstreamFailure("agent", e);
        }
    }

    /**
     * Spring AI ChatClient endpoint — generates a short two-sentence daily digest.
     * Distinct from /recommendations: this is a direct, non-RAG, non-retrieval call
     * suitable for a login banner or daily push notification.
     */
    @PostMapping("/summary")
    public ResponseEntity<?> getDailySummary(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> airQualityData) {

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated."));
        }

        try {
            String summary = aiSummaryService.generateDailySummary(user, airQualityData);
            return ResponseEntity.ok(Map.of("summary", summary));
        } catch (Exception e) {
            log.error("daily summary failed unexpectedly", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to generate daily summary.",
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
        }
    }

    private ResponseEntity<?> mapDownstreamFailure(String endpoint, Exception e) {
        Throwable cause = unwrap(e);
        if (cause instanceof TimeoutException || cause instanceof java.util.concurrent.TimeoutException) {
            log.warn("rag-service /{} timed out", endpoint);
            return ResponseEntity.status(504).body(Map.of(
                    "error", "rag-service timed out",
                    "detail", cause.getMessage() == null ? "" : cause.getMessage()
            ));
        }
        if (cause instanceof WebClientRequestException) {
            log.warn("rag-service /{} unreachable: {}", endpoint, cause.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                    "error", "rag-service unreachable",
                    "detail", cause.getMessage() == null ? "" : cause.getMessage()
            ));
        }
        log.error("rag-service /{} failed", endpoint, e);
        return ResponseEntity.status(503).body(Map.of(
                "error", "rag-service call failed",
                "detail", e.getMessage() == null ? "" : e.getMessage()
        ));
    }

    private static Throwable unwrap(Throwable t) {
        Throwable cur = t;
        while (cur.getCause() != null && cur.getCause() != cur) {
            cur = cur.getCause();
        }
        return cur;
    }
}
