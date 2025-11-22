package com.sreeshanth.backend.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController
@RequestMapping("/api/map")
@CrossOrigin(origins = "*")
public class MapController {

    /**
     * Get map initialization config
     */
    @GetMapping("/config")
    public ResponseEntity<?> getMapConfig() {
        Map<String, Object> config = new HashMap<>();
        
        // Default center (Hyderabad)
        config.put("defaultCenter", Map.of("lat", 17.3850, "lng", 78.4867));
        config.put("defaultZoom", 10);
        
        // Map styling
        config.put("mapStyles", getMapStyles());
        
        // Map options
        Map<String, Object> mapOptions = new HashMap<>();
        mapOptions.put("gestureHandling", "cooperative");
        mapOptions.put("minZoom", 4);
        mapOptions.put("maxZoom", 16);
        mapOptions.put("mapTypeId", "roadmap");
        mapOptions.put("zoomControl", true);
        mapOptions.put("mapTypeControl", false);
        mapOptions.put("scaleControl", true);
        mapOptions.put("streetViewControl", false);
        config.put("mapOptions", mapOptions);
        
        // Heatmap overlay config
        config.put("heatmapOverlay", Map.of(
            "type", "aqi_heatmap",
            "opacity", 0.6,
            "maxZoom", 16,
            "minZoom", 0
        ));
        
        return ResponseEntity.ok(config);
    }

    /**
     * Reverse geocode coordinates to location name
     */
    @PostMapping("/geocode/reverse")
    public ResponseEntity<?> reverseGeocode(@RequestBody GeocodeRequest request) {
        try {
            // This would call Google Maps Geocoding API from backend
            // For now, return a placeholder
            String locationName = String.format("Location (%.4f, %.4f)", 
                request.getLatitude(), request.getLongitude());
            
            return ResponseEntity.ok(Map.of(
                "latitude", request.getLatitude(),
                "longitude", request.getLongitude(),
                "locationName", locationName
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get heatmap tile URL template
     */
    @GetMapping("/heatmap-tiles")
    public ResponseEntity<?> getHeatmapTiles() {
        // Returns the tile URL pattern for AQI heatmap
        Map<String, String> heatmapConfig = new HashMap<>();
        heatmapConfig.put("tileUrlPattern", 
            "https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/{z}/{x}/{y}");
        heatmapConfig.put("apiKeyRequired", "true");
        heatmapConfig.put("tileSize", "256");
        heatmapConfig.put("opacity", "0.6");
        
        return ResponseEntity.ok(heatmapConfig);
    }

    private List<Map<String, Object>> getMapStyles() {
        List<Map<String, Object>> styles = new ArrayList<>();
        
        Map<String, Object> poiStyle = new HashMap<>();
        poiStyle.put("featureType", "poi");
        poiStyle.put("elementType", "labels");
        Map<String, String> styler = new HashMap<>();
        styler.put("visibility", "off");
        poiStyle.put("stylers", Arrays.asList(styler));
        styles.add(poiStyle);
        
        return styles;
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    public static class GeocodeRequest {
        private Double latitude;
        private Double longitude;
    }
}