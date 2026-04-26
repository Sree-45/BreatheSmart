package com.sreeshanth.backend.service;

import com.sreeshanth.backend.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Generates a short personalized daily air-quality summary for a user.
 *
 * Distinct from the RAG flow on purpose:
 *  - RAG (in Python) handles retrieval-grounded recommendations with sources.
 *  - This Spring AI ChatClient handles a simple, non-retrieval direct LLM call —
 *    a one-shot summary suitable for a daily push or login banner.
 *
 * Demonstrating both technologies side by side for clear separation of concerns.
 */
@Service
public class AiSummaryService {

    private static final Logger log = LoggerFactory.getLogger(AiSummaryService.class);

    private final ChatClient chatClient;

    public AiSummaryService(ChatModel chatModel) {
        this.chatClient = ChatClient.builder(chatModel).build();
    }

    public String generateDailySummary(User user, Map<String, Object> airQualityData) {
        Integer age = computeAge(user.getDob());
        String conditions = user.getMedicalConditions() != null && !user.getMedicalConditions().isBlank()
                ? user.getMedicalConditions()
                : "no reported conditions";
        String city = user.getPrimaryLocation() != null ? user.getPrimaryLocation().getName() : "your area";
        Object aqi = airQualityData != null ? airQualityData.getOrDefault("aqi", "unknown") : "unknown";
        Object pollutant = airQualityData != null ? airQualityData.getOrDefault("dominantPollutant", "unknown") : "unknown";

        String system = """
                You write short, friendly daily air-quality digests for a personal health app.
                Reply with exactly two sentences and no markdown or formatting.
                The first sentence states today's air quality and dominant pollutant in plain language.
                The second sentence gives one specific action tailored to the user's profile.
                """;

        String userMsg = String.format(
                "User: age %s, conditions: %s, city: %s. Today's AQI is %s with %s as the dominant pollutant. Write the digest.",
                age == null ? "unknown" : age, conditions, city, aqi, pollutant
        );

        try {
            return chatClient.prompt()
                    .system(system)
                    .user(userMsg)
                    .call()
                    .content();
        } catch (Exception e) {
            // Degrade gracefully: a templated digest is better than a broken banner.
            log.warn("AiSummaryService falling back to deterministic digest: {}", e.getMessage());
            return buildFallbackDigest(city, aqi, pollutant, conditions);
        }
    }

    private static String buildFallbackDigest(String city, Object aqi, Object pollutant, String conditions) {
        String aqiText = aqi == null || "unknown".equals(aqi.toString()) ? "currently unavailable" : aqi.toString();
        String pollutantText = pollutant == null || "unknown".equals(pollutant.toString()) ? "particulate matter" : pollutant.toString();
        String action = "no reported conditions".equals(conditions)
                ? "Limit prolonged outdoor exertion if AQI exceeds 100."
                : "Given your conditions, keep windows closed and avoid outdoor exercise until levels improve.";
        return String.format(
                "Air quality in %s today is %s with %s leading the mix. %s",
                city, aqiText, pollutantText, action
        );
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
