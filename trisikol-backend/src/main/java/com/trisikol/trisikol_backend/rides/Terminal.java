package com.trisikol.trisikol_backend.rides;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity @Table(name = "terminals")
public class Terminal {
    @Id Long id;
    @Column(nullable = false, length = 100) String name;
    @Column(nullable = false, precision = 10, scale = 7) BigDecimal latitude;
    @Column(nullable = false, precision = 10, scale = 7) BigDecimal longitude;
    protected Terminal() {}
    public Long getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
}
