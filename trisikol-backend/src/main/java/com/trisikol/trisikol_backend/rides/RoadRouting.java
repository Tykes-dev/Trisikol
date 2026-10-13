package com.trisikol.trisikol_backend.rides;
import java.math.BigDecimal;
import java.util.List;

public interface RoadRouting {
    record Point(double lat, double lng) {}
    record Route(BigDecimal distanceKm, List<List<Double>> positions) {}
    Route route(Point pickup, Point dropoff);
}
