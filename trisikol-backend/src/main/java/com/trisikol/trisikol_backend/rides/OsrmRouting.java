package com.trisikol.trisikol_backend.rides;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.math.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Component
public class OsrmRouting implements RoadRouting {
    private final String baseUrl;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final JsonMapper json = JsonMapper.builder().build();
    public OsrmRouting(@Value("${trisikol.routing.base-url:https://router.project-osrm.org}") String baseUrl) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }
    public Route route(Point pickup, Point dropoff) {
        String coordinates = pickup.lng() + "," + pickup.lat() + ";" + dropoff.lng() + "," + dropoff.lat();
        var request = HttpRequest.newBuilder(URI.create(baseUrl + "/route/v1/driving/" + coordinates
                + "?overview=full&geometries=geojson&alternatives=false&steps=false&radiuses=100;100"))
                .timeout(Duration.ofSeconds(10)).GET().build();
        try {
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            var data = json.readTree(response.body());
            String code = data.path("code").asText();
            if (code.equals("NoRoute") || code.equals("NoSegment")) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "No road route found. Move both pins closer to accessible roads.");
            }
            if (response.statusCode() != 200 || !code.equals("Ok")) throw unavailable();
            var route = data.path("routes").path(0);
            double meters = route.path("distance").asDouble();
            if (!Double.isFinite(meters) || meters <= 0 || meters > 100000) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Choose a road trip shorter than 100 km for this demo.");
            }
            var geometry = route.path("geometry");
            if (!geometry.path("type").asText().equals("LineString")) throw unavailable();
            List<List<Double>> positions = new ArrayList<>();
            for (var point : geometry.path("coordinates")) {
                double lng = point.path(0).asDouble(Double.NaN), lat = point.path(1).asDouble(Double.NaN);
                if (!Double.isFinite(lat) || !Double.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw unavailable();
                positions.add(List.of(lat, lng));
            }
            if (positions.size() < 2) throw unavailable();
            // Round up to a metre, so displayed distance matches charged started-km boundaries.
            return new Route(BigDecimal.valueOf(meters).movePointLeft(3).setScale(3, RoundingMode.CEILING), positions);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt(); throw unavailable();
        } catch (ResponseStatusException error) { throw error; }
        catch (Exception error) { throw unavailable(); }
    }
    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Road routing is unavailable. Please retry.");
    }
}
