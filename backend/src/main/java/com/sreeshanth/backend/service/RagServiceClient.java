package com.sreeshanth.backend.service;

import com.sreeshanth.backend.dto.RagDtos;
import com.sreeshanth.backend.model.User;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Calls the Python FastAPI rag-service. All AI/RAG logic lives there;
 * this client is a thin orchestration layer that maps Spring's domain
 * objects (User, MongoDB) into the rag-service's JSON contract.
 */
@Service
public class RagServiceClient {

    @Value("${rag.service.base-url}")
    private String baseUrl;

    private WebClient webClient;

    @PostConstruct
    void init() {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Sends the user profile + current AQI to /recommend. The Python service
     * runs retrieval against ChromaDB (global guidelines plus the user's own
     * report chunks) and returns a structured recommendation with sources.
     */
    public RagDtos.RecommendResponse getRecommendation(User user, Map<String, Object> airQualityData) {
        RagDtos.RecommendRequest request = new RagDtos.RecommendRequest(
                buildUserProfile(user),
                buildAqiData(airQualityData),
                null
        );

        return webClient.post()
                .uri("/recommend")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(RagDtos.RecommendResponse.class)
                .timeout(Duration.ofSeconds(60))
                .block();
    }

    /**
     * Triggers the LangGraph agent in the rag-service. The agent autonomously
     * decides to call its AQI tool and the RAG tool, and returns a final answer
     * plus the message trace so the frontend can show what tools fired.
     */
    public RagDtos.AgentAnalyzeResponse analyzeAgentic(RagDtos.AgentAnalyzeRequest request) {
        try {
            return webClient.post()
                    .uri("/agent/analyze")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RagDtos.AgentAnalyzeResponse.class)
                    .timeout(Duration.ofSeconds(90))
                    .block();
        } catch (WebClientResponseException e) {
            throw new IllegalStateException(
                    "rag-service /agent/analyze failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    /**
     * Pushes Tika-extracted report text into the per-user vector namespace
     * so future /recommend calls can retrieve from it.
     */
    public RagDtos.IngestReportResponse ingestUserReport(String userId, String reportText, String filename) {
        RagDtos.IngestReportRequest request = new RagDtos.IngestReportRequest(userId, reportText, filename);

        try {
            return webClient.post()
                    .uri("/ingest/report")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RagDtos.IngestReportResponse.class)
                    .timeout(Duration.ofSeconds(45))
                    .block();
        } catch (WebClientResponseException e) {
            throw new IllegalStateException(
                    "rag-service /ingest/report failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    private RagDtos.UserProfile buildUserProfile(User user) {
        return new RagDtos.UserProfile(
                user.getId(),
                computeAge(user.getDob()),
                user.getMedicalConditions(),
                user.getBloodType(),
                user.getHeight(),
                user.getWeight()
        );
    }

    private RagDtos.AqiData buildAqiData(Map<String, Object> airQualityData) {
        if (airQualityData == null) {
            return new RagDtos.AqiData(null, null, null, null);
        }

        Integer aqi = null;
        String category = null;
        String dominantPollutant = stringOrNull(airQualityData.get("dominantPollutant"));

        // The frontend sends Google's `indexes` array; pick the first entry that
        // exposes an AQI number (matches the existing /preferred-aqi logic).
        Object indexesObj = airQualityData.get("indexes");
        if (indexesObj instanceof Iterable<?> iterable) {
            for (Object entry : iterable) {
                if (entry instanceof Map<?, ?> m) {
                    Object aqiVal = m.get("aqi");
                    if (aqiVal instanceof Number num && aqi == null) {
                        aqi = num.intValue();
                        category = stringOrNull(m.get("category"));
                        if (dominantPollutant == null) {
                            dominantPollutant = stringOrNull(m.get("dominantPollutant"));
                        }
                        break;
                    }
                }
            }
        }

        String city = stringOrNull(airQualityData.get("city"));
        return new RagDtos.AqiData(aqi, category, dominantPollutant, city);
    }

    private static String stringOrNull(Object o) {
        return o == null ? null : o.toString();
    }

    private static Integer computeAge(String dob) {
        if (dob == null || dob.isBlank()) return null;
        try {
            LocalDate birth = LocalDate.parse(dob, DateTimeFormatter.ISO_LOCAL_DATE);
            return Period.between(birth, LocalDate.now()).getYears();
        } catch (Exception e) {
            return null;
        }
    }
}
