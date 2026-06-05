package com.sreeshanth.backend.controller;

import com.sreeshanth.backend.model.User;
import com.sreeshanth.backend.repository.UserRepository;
import com.sreeshanth.backend.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "https://localhost:5173"})
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password is required."));
        }
        if (userRepository.findByPhone(user.getPhone()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Phone number is already registered."));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword())); // BCrypt-hash before persisting
        User savedUser = userRepository.save(user);
        savedUser.setPassword(null); // Don't send password back
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String identifier = credentials.get("identifier");
        String password = credentials.get("password");

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, password)
        );

        User user = (User) authentication.getPrincipal();
        String jwt = jwtService.generateToken(user);

        user.setPassword(null); // Don't include password in the response

        return ResponseEntity.ok(Map.of("token", jwt, "user", user));
    }
}