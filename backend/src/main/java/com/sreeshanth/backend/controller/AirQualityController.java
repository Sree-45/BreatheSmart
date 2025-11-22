package com.sreeshanth.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/air-quality")
@CrossOrigin(origins = "*")
public class AirQualityController {

    @Value("${google.maps.api.key}")
    private String apiKey;

    @Autowired
    private RestTemplate restTemplate;

    private static final String BASE_URL = "https://airquality.googleapis.com/v1";

    /**
     * Fetch current air quality conditions for a specific location
     */
    @PostMapping("/current")
    public ResponseEntity<?> getCurrentConditions(@RequestBody LocationRequest locationRequest) {
        try {
            String url = BASE_URL + "/currentConditions:lookup?key=" + apiKey;

            Map<String, Object> body = new HashMap<>();
            body.put("location", locationRequest.getLocation());
            body.put("extraComputations", Arrays.asList(
                "HEALTH_RECOMMENDATIONS",
                "POLLUTANT_CONCENTRATION",
                "POLLUTANT_ADDITIONAL_INFO",
                "DOMINANT_POLLUTANT_CONCENTRATION",
                "LOCAL_AQI"
            ));
            body.put("languageCode", "en");

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Fetch historical air quality data
     */
    @PostMapping("/history")
    public ResponseEntity<?> getHistoricalData(@RequestBody HistoryRequest historyRequest) {
        try {
            String url = BASE_URL + "/history:lookup?key=" + apiKey;

            Map<String, Object> body = new HashMap<>();
            body.put("location", historyRequest.getLocation());
            body.put("hours", historyRequest.getHours() != null ? historyRequest.getHours() : 24);
            body.put("extraComputations", Arrays.asList(
                "HEALTH_RECOMMENDATIONS",
                "POLLUTANT_CONCENTRATION",
                "DOMINANT_POLLUTANT_CONCENTRATION",
                "LOCAL_AQI"
            ));
            body.put("languageCode", "en");

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }


    /**
     * Fetch a 24-hour air quality forecast for a line chart.
     * This is based on our curl command and requests a specific 24-hour period.
     */
    @PostMapping("/forecast")
    public ResponseEntity<?> getForecastData(@RequestBody LocationRequest locationRequest) {
        try {
            String url = BASE_URL + "/forecast:lookup?key=" + apiKey;
            
            // --- Start of changes based on the 24-hour curl command ---
            
            // 1. Calculate the 24-hour time period dynamically
            // Get the current time and round UP to the next full hour in UTC
            Instant startTime = Instant.now().truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);
            // Set the end time to exactly 24 hours after the start time
            Instant endTime = startTime.plus(24, ChronoUnit.HOURS);

            // 2. Build the request body
            Map<String, Object> body = new HashMap<>();
            body.put("location", locationRequest.getLocation());
            
            // 3. Add the specific time period
            // Instant.toString() is already in the correct UTC (Z) format
            Map<String, String> period = new HashMap<>();
            period.put("startTime", startTime.toString()); 
            period.put("endTime", endTime.toString());
            body.put("period", period);
            
            // 4. Set pageSize to 24 to get all hours in one response
            body.put("pageSize", 24);
            
            // 5. No 'extraComputations' are added, per your request
            // The API includes the 'indexes' (AQI data) by default.
            
            // --- End of changes ---
            
            System.out.println("📤 Sending 24-hour forecast request with body: " + body);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            System.out.println("📥 Forecast response received: " + (responseBody != null ? "OK" : "NULL"));
            
            if (responseBody != null && responseBody.containsKey("hourlyForecasts")) {
                List<Map<String, Object>> forecasts = (List<Map<String, Object>>) responseBody.get("hourlyForecasts");
                
                if (forecasts != null && !forecasts.isEmpty()) {
                    Map<String, Object> response_data = new HashMap<>();
                    response_data.put("hourlyForecasts", forecasts);
                    if (responseBody.containsKey("regionCode")) {
                        response_data.put("regionCode", responseBody.get("regionCode"));
                    }
                    if (responseBody.containsKey("nextPageToken")) {
                        response_data.put("nextPageToken", responseBody.get("nextPageToken"));
                    }
                    
                    System.out.println("✓ Successfully fetched " + forecasts.size() + " hours of forecast data");
                    return ResponseEntity.ok(response_data);
                } else {
                    System.out.println("⚠️ Response has hourlyForecasts key but list is empty or null");
                }
            } else {
                System.out.println("⚠️ Response missing hourlyForecasts key. Keys: " + 
                    (responseBody != null ? responseBody.keySet() : "NULL RESPONSE"));
            }
            
            // If no forecasts, return empty
            return ResponseEntity.ok(Map.of("hourlyForecasts", new ArrayList<>()));
            
        } catch (Exception e) {
            System.err.println("❌ Forecast fetch error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch forecast: " + e.getMessage()));
        }
    }
    /**
     * Fetch forecast air quality data - uses API's default forecast window
  
     * Get preferred AQI index (prioritizes Indian NAQI)
     */
    @PostMapping("/preferred-aqi")
    public ResponseEntity<?> getPreferredAqi(@RequestBody Map<String, Object> request) {
        try {
            List<?> indexes = (List<?>) request.get("indexes");
            
            if (indexes == null || indexes.isEmpty()) {
                return ResponseEntity.ok(Map.of("aqi", null));
            }

            // Find Indian National AQI first
            for (Object idx : indexes) {
                Map<String, Object> index = (Map<String, Object>) idx;
                String code = (String) index.get("code");
                
                if ("ind_cpcb".equals(code)) {
                    return ResponseEntity.ok(index);
                }
            }

            // Fall back to universal AQI
            for (Object idx : indexes) {
                Map<String, Object> index = (Map<String, Object>) idx;
                String code = (String) index.get("code");
                
                if ("uaqi".equals(code)) {
                    return ResponseEntity.ok(index);
                }
            }

            // Return first available
            return ResponseEntity.ok(indexes.get(0));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Helper method to build forecast request body - NO LONGER USED
     * Keeping for reference only
     */
    private Map<String, Object> buildForecastBodyLegacy(Map<String, Object> location, int hours) {
        Map<String, Object> body = new HashMap<>();
        body.put("location", location);
        
        // Build time period
        Map<String, String> period = new HashMap<>();
        Date start = new Date();
        Date end = new Date(start.getTime() + (hours * 60 * 60 * 1000L));
        
        period.put("startTime", formatISODateTime(start));
        period.put("endTime", formatISODateTime(end));
        body.put("period", period);
        
        body.put("extraComputations", Arrays.asList(
            "HEALTH_RECOMMENDATIONS",
            "DOMINANT_POLLUTANT_CONCENTRATION",
            "LOCAL_AQI"
        ));
        body.put("languageCode", "en");
        
        return body;
    }

    private String formatISODateTime(Date date) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(date);
    }

    /**
     * Request DTOs
     */
    @Data
    @NoArgsConstructor
    public static class LocationRequest {
        private Map<String, Double> location;
    }

    @Data
    @NoArgsConstructor
    public static class HistoryRequest {
        private Map<String, Double> location;
        private Integer hours;
    }
}
