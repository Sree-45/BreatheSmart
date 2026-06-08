package com.sreeshanth.backend.model;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Location {
    private String name;
    private Double latitude;
    private Double longitude;
    private String address;
    private String dateAdded;
}
