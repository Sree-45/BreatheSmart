package com.sreeshanth.backend.model;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Lob;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Report {
    private String fileName;
    private String uploadDate;
    @Lob
    private String analysisResult;
}
