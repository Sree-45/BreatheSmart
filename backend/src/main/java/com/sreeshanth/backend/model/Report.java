package com.sreeshanth.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Report {
    private String fileName;
    private String uploadDate;
    private String analysisResult;
}
