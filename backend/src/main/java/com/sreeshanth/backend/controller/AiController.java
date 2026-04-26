package com.sreeshanth.backend.controller;

import com.sreeshanth.backend.dto.RagDtos;
import com.sreeshanth.backend.model.User;
import com.sreeshanth.backend.service.AiSummaryService;
import com.sreeshanth.backend.service.RagServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AiController {

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
            return ResponseEntity.status(502).body(Map.of(
                    "error", "rag-service rejected the request",
                    "status", e.getStatusCode().value(),
                    "detail", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(503).body(Map.of(
                    "error", "rag-service unreachable",
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
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
            return ResponseEntity.status(502).body(Map.of(
                    "error", "rag-service rejected the request",
                    "status", e.getStatusCode().value(),
                    "detail", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(503).body(Map.of(
                    "error", "rag-service unreachable",
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
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
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to generate daily summary.",
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
        }
    }
}
