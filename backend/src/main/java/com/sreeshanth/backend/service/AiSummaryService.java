package com.sreeshanth.backend.service;

import com.sreeshanth.backend.model.User;
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

        return chatClient.prompt()
                .system(system)
                .user(userMsg)
                .call()
                .content();
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
