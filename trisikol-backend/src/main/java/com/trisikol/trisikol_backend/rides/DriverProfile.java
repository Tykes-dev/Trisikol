package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.*;

@Entity @Table(name = "driver_profiles")
public class DriverProfile {
    @Id Long accountId;
    @Column(nullable = false) boolean enabled = true;
    @Column(nullable = false, length = 30) String bodyNumber = "";
    @Column(nullable = false, length = 30) String plateNumber = "";
    @Column(nullable = false, length = 100) String vehicleModel = "";
    protected DriverProfile() {}
    DriverProfile(Long id) { accountId = id; }
    public Long getAccountId() { return accountId; }
    public boolean isEnabled() { return enabled; }
    public String getBodyNumber() { return bodyNumber; }
    public String getPlateNumber() { return plateNumber; }
    public String getVehicleModel() { return vehicleModel; }
}
