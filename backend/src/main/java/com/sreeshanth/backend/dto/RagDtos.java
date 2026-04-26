package com.sreeshanth.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * DTOs that mirror the Python rag-service contracts.
 * Snake_case fields are mapped explicitly so the JVM side can use camelCase.
 */
public final class RagDtos {

    private RagDtos() {}

    public record UserProfile(
            @JsonProperty("user_id") String userId,
            Integer age,
            @JsonProperty("medical_conditions") String medicalConditions,
            @JsonProperty("blood_type") String bloodType,
            String height,
            String weight
    ) {}

    public record AqiData(
            Integer aqi,
            String category,
            @JsonProperty("dominant_pollutant") String dominantPollutant,
            String city
    ) {}

    public record RecommendRequest(
            @JsonProperty("user_profile") UserProfile userProfile,
            @JsonProperty("aqi_data") AqiData aqiData,
            String question
    ) {}

    public record Source(
            String source,
            String scope,
            String snippet,
            Double score
    ) {}

    public record RecommendResponse(
            Map<String, Object> recommendation,
            List<Source> sources,
            Boolean fallback,
            @JsonProperty("latency_ms") Integer latencyMs
    ) {}

    public record IngestReportRequest(
            @JsonProperty("user_id") String userId,
            @JsonProperty("report_text") String reportText,
            String filename
    ) {}

    public record IngestReportResponse(
            Integer chunks,
            @JsonProperty("user_id") String userId,
            String filename
    ) {}

    public record AgentAnalyzeRequest(
            String city,
            Integer age,
            @JsonProperty("medical_conditions") String medicalConditions,
            String question
    ) {}

    public record AgentTraceStep(
            String type,
            String content,
            @JsonProperty("tool_calls") List<String> toolCalls
    ) {}

    public record AgentAnalyzeResponse(
            String answer,
            List<AgentTraceStep> trace
    ) {}
}
