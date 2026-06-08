package com.sreeshanth.backend.model;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
public class User implements UserDetails {
    // String id (UUID) preserves the contract used by JWT subjects, the
    // @AuthenticationPrincipal, and the rag-service per-user scope `user_<id>`.
    @Id
    @Column(length = 36)
    private String id;

    private String name;

    @Column(unique = true)
    private String phone;

    private String email;
    private String password;

    // Profile fields
    private String dob;

    // Embedded inline in the users table; columns prefixed to avoid clashing
    // with User's own `name`/`address` columns.
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "name", column = @Column(name = "primary_location_name")),
        @AttributeOverride(name = "latitude", column = @Column(name = "primary_location_latitude")),
        @AttributeOverride(name = "longitude", column = @Column(name = "primary_location_longitude")),
        @AttributeOverride(name = "address", column = @Column(name = "primary_location_address")),
        @AttributeOverride(name = "dateAdded", column = @Column(name = "primary_location_date_added"))
    })
    private Location primaryLocation;

    @ElementCollection
    @CollectionTable(name = "user_saved_locations", joinColumns = @JoinColumn(name = "user_id"))
    private List<Location> savedLocations = new ArrayList<>();

    // Health fields
    private String height;
    private String weight;
    @Column(length = 2000)
    private String medicalConditions;
    private String bloodType;

    @ElementCollection
    @CollectionTable(name = "user_past_reports", joinColumns = @JoinColumn(name = "user_id"))
    private List<Report> pastReports = new ArrayList<>();

    /** Assign a UUID id on first insert (kept as a String to match the old Mongo id). */
    @PrePersist
    public void ensureId() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

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
