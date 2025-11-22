package com.sreeshanth.backend.controller;

import com.sreeshanth.backend.model.Location;
import com.sreeshanth.backend.model.User;
import com.sreeshanth.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    // Existing PUT for full user update (unchanged)
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User updatedUserData) {
        return userRepository.findById(id)
            .map(existingUser -> {
                // Update only the fields that can be changed in the profile
                existingUser.setName(updatedUserData.getName());
                existingUser.setEmail(updatedUserData.getEmail());
                existingUser.setPhone(updatedUserData.getPhone());
                existingUser.setDob(updatedUserData.getDob());
                existingUser.setPrimaryLocation(updatedUserData.getPrimaryLocation());
                existingUser.setSavedLocations(updatedUserData.getSavedLocations());
                existingUser.setHeight(updatedUserData.getHeight());
                existingUser.setWeight(updatedUserData.getWeight());
                existingUser.setMedicalConditions(updatedUserData.getMedicalConditions());
                existingUser.setBloodType(updatedUserData.getBloodType());
                existingUser.setPastReports(updatedUserData.getPastReports());

                User savedUser = userRepository.save(existingUser);
                savedUser.setPassword(null); // Ensure password is not sent back
                return ResponseEntity.ok(savedUser);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // New: Add a saved location
    @PostMapping("/{id}/saved-locations")
    public ResponseEntity<?> addSavedLocation(@AuthenticationPrincipal User user, @RequestBody Location newLocation) {
        if (user == null) {
            return ResponseEntity.status(401).body("User not authenticated");
        }
        // Check for duplicate name (case-insensitive)
        boolean exists = user.getSavedLocations().stream()
            .anyMatch(loc -> loc.getName().equalsIgnoreCase(newLocation.getName()));
        if (exists) {
            return ResponseEntity.status(409).body("Location with this name already exists");
        }
        newLocation.setDateAdded(Instant.now().toString()); // Auto-set dateAdded
        user.getSavedLocations().add(newLocation);
        userRepository.save(user);
        return ResponseEntity.ok(user.getSavedLocations());
    }

    // New: Get all saved locations
    @GetMapping("/{id}/saved-locations")
    public ResponseEntity<?> getSavedLocations(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("User not authenticated");
        }
        return ResponseEntity.ok(user.getSavedLocations());
    }

    // New: Update a saved location by name
    @PutMapping("/{id}/saved-locations/{locationName}")
    public ResponseEntity<?> updateSavedLocation(@AuthenticationPrincipal User user, @PathVariable String locationName, @RequestBody Location updatedLocation) {
        if (user == null) {
            return ResponseEntity.status(401).body("User not authenticated");
        }
        Optional<Location> existing = user.getSavedLocations().stream()
            .filter(loc -> loc.getName().equalsIgnoreCase(locationName))
            .findFirst();
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Location loc = existing.get();
        loc.setName(updatedLocation.getName());
        loc.setAddress(updatedLocation.getAddress());
        loc.setLatitude(updatedLocation.getLatitude());
        loc.setLongitude(updatedLocation.getLongitude());
        // dateAdded remains unchanged
        userRepository.save(user);
        return ResponseEntity.ok(user.getSavedLocations());
    }

    // New: Delete a saved location by name
    @DeleteMapping("/{id}/saved-locations/{locationName}")
    public ResponseEntity<?> deleteSavedLocation(@AuthenticationPrincipal User user, @PathVariable String locationName) {
        if (user == null) {
            return ResponseEntity.status(401).body("User not authenticated");
        }
        boolean removed = user.getSavedLocations().removeIf(loc -> loc.getName().equalsIgnoreCase(locationName));
        if (!removed) {
            return ResponseEntity.notFound().build();
        }
        userRepository.save(user);
        return ResponseEntity.ok(user.getSavedLocations());
    }
}