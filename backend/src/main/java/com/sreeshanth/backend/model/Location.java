package com.sreeshanth.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Location {
    private String name;
    private Double latitude;
    private Double longitude;
    private String address; // New field
    private String dateAdded;
}