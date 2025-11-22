package com.sreeshanth.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.ArrayList;

@Document(collection = "users")
@Data
public class User implements UserDetails {
    @Id
    private String id;
    private String name;
    @Indexed(unique = true)
    private String phone;
    private String email;
    private String password;

    // Profile fields
    private String dob;
    private Location primaryLocation; // Changed from String to Location
    private List<Location> savedLocations = new ArrayList<>();

    // Health fields
    private String height;
    private String weight;
    private String medicalConditions;
    private String bloodType;
    private List<Report> pastReports = new ArrayList<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(); // No roles defined for now
    }

    @Override
    public String getUsername() {
        // Use phone number as the primary unique identifier for UserDetails
        return phone;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}