package com.trisikol.trisikol_backend.fare;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "fare_policies")
public class FarePolicy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long terminalId = 1L;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFare;
    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal baseDistanceKm;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal extraFarePerKm;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal appServiceFeePerKm;
    @Column(nullable = false, length = 500)
    private String changeReason;
    @Column(nullable = false, length = 50)
    private String createdBy;
    @Column(nullable = false)
    private Instant createdAt;

    protected FarePolicy() {}
    public FarePolicy(BigDecimal baseFare, BigDecimal baseDistanceKm,
            BigDecimal extraFarePerKm, BigDecimal appServiceFeePerKm,
            String changeReason, String createdBy) {
        this.baseFare = baseFare;
        this.baseDistanceKm = baseDistanceKm;
        this.extraFarePerKm = extraFarePerKm;
        this.appServiceFeePerKm = appServiceFeePerKm;
        this.changeReason = changeReason;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }
    public Long getId() { return id; }
    public Long getTerminalId() { return terminalId; }
    public FarePolicy forTerminal(Long terminalId) { this.terminalId = terminalId; return this; }
    public BigDecimal getBaseFare() { return baseFare; }
    public BigDecimal getBaseDistanceKm() { return baseDistanceKm; }
    public BigDecimal getExtraFarePerKm() { return extraFarePerKm; }
    public BigDecimal getAppServiceFeePerKm() { return appServiceFeePerKm; }
    public String getChangeReason() { return changeReason; }
    public String getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
