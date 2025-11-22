package com.sreeshanth.backend.service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import com.sreeshanth.backend.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class AiService {

    @Value("${gemini.model.name}")
    private String modelName;

    @Value("${gemini.api.key}")
    private String apiKey;

    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 1000; // 1 second

    public String getPersonalizedHealthRecommendations(User user, Map<String, Object> airQualityData) throws IOException {
        // Retry logic with exponential backoff
        for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                // Initialize the Gemini client with API key
                Client client = new Client.Builder()
                    .apiKey(apiKey)
                    .build();
                
                // Build the prompt
                String prompt = buildPrompt(user, airQualityData);
                
                // Generate content using the new client
                GenerateContentResponse response = client.models.generateContent(
                    "models/" + modelName,
                    prompt,
                    null
                );
                
                // Return the text response on success
                return response.text();
                
            } catch (Exception e) {
                String errorMsg = e.getMessage();
                boolean isServerError = errorMsg != null && (
                    errorMsg.contains("503") || 
                    errorMsg.contains("overloaded") || 
                    errorMsg.contains("500") ||
                    errorMsg.contains("temporarily unavailable")
                );
                
                if (isServerError && attempt < MAX_RETRIES - 1) {
                    // Calculate exponential backoff
                    long backoffMs = INITIAL_BACKOFF_MS * (long) Math.pow(2, attempt);
                    System.out.println("Gemini API overloaded. Retry attempt " + (attempt + 1) + " after " + backoffMs + "ms");
                    
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Thread interrupted during retry backoff", ie);
                    }
                } else {
                    // Not a server error or final attempt, throw the exception
                    throw new IOException("Failed to generate AI recommendations: " + errorMsg, e);
                }
            }
        }
        
        throw new IOException("Failed to generate recommendations after " + MAX_RETRIES + " attempts");
    }

    private String buildPrompt(User user, Map<String, Object> airQualityData) {
        int age = 0;
        if (user.getDob() != null && !user.getDob().isEmpty()) {
            try {
                LocalDate birthDate = LocalDate.parse(user.getDob(), DateTimeFormatter.ISO_LOCAL_DATE);
                age = Period.between(birthDate, LocalDate.now()).getYears();
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }

        String medicalConditions = user.getMedicalConditions() != null && !user.getMedicalConditions().isEmpty()
                ? user.getMedicalConditions() : "None listed";

        String bloodType = user.getBloodType() != null && !user.getBloodType().isEmpty()
                ? user.getBloodType() : "Not specified";

        // Simplified AQI data for the prompt
        String aqiInfo = airQualityData.get("indexes") != null ? airQualityData.get("indexes").toString() : "Not available";
        String dominantPollutant = airQualityData.get("dominantPollutant") != null ? airQualityData.get("dominantPollutant").toString() : "Not available";

        return String.format(
            "You are an expert environmental health advisor. Based on the user's profile and the current air quality, provide ONLY personalized health recommendations for this specific user.\n\n" +
            "User Profile:\n" +
            "- Age: %d years\n" +
            "- Medical Conditions: %s\n" +
            "- Blood Type: %s\n" +
            "- Height: %s\n" +
            "- Weight: %s\n\n" +
            "Current Air Quality:\n" +
            "- AQI Data: %s\n" +
            "- Dominant Pollutant: %s\n\n" +
            "Task: Generate a JSON object ONLY with two keys: 'primary' and 'secondary'.\n" +
            "- The 'primary' key should contain the single most important, actionable, and personalized recommendation for this user.\n" +
            "- The 'secondary' key should contain a useful, but less critical, additional recommendation.\n" +
            "Tailor all advice specifically to this user's age, medical conditions, and health profile. " +
            "The output must be ONLY a valid JSON object, with no extra text or markdown formatting.\n\n" +
            "Example format:\n" +
            "{\n" +
            "  \"primary\": \"Given your asthma and the high PM2.5 levels, it is crucial to stay indoors and use an air purifier if available.\",\n" +
            "  \"secondary\": \"Consider wearing a well-fitting N95 mask if you must go outside for short periods.\"\n" +
            "}",
            age, medicalConditions, bloodType, 
            user.getHeight() != null ? user.getHeight() : "Not specified",
            user.getWeight() != null ? user.getWeight() : "Not specified",
            aqiInfo, dominantPollutant
        );
    }
}