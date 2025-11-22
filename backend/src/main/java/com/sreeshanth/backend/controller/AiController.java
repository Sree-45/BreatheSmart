package com.sreeshanth.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sreeshanth.backend.model.User;
import com.sreeshanth.backend.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @PostMapping("/recommendations")
    public ResponseEntity<?> getAiRecommendations(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> airQualityData) {
        
        if (user == null) {
            // This case handles scenarios where the token is valid but the user principal isn't resolved.
            // It prevents a NullPointerException and returns a clear authorization error.
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated."));
        }

        try {
            String jsonResponse = aiService.getPersonalizedHealthRecommendations(user, airQualityData);
            // Sanitize and parse the JSON response from the AI
            String sanitizedJson = jsonResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            Map<String, String> recommendations = objectMapper.readValue(sanitizedJson, Map.class);
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to generate AI recommendations."));
        }
    }
}
