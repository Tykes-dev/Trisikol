package com.trisikol.test;

import com.trisikol.trisikol_backend.auth.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

/** Real cookie/CSRF HTTP client against isolated random-port test servers only. */
public class TestApi {
    public static final String PASSWORD = "Isolated-tests-only-password!";
    public static final JsonMapper JSON = JsonMapper.builder().build();
    private final int port;
    private final HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
    public TestApi(int port) { this.port = port; }
    public HttpResponse<String> send(String method, String path, String body, boolean csrf) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path)).timeout(Duration.ofSeconds(20));
        if (csrf) {
            var token = JSON.readTree(send("GET", "/auth/csrf", null, false).body());
            request.header(token.get("headerName").asText(), token.get("token").asText());
        }
        if (body != null) request.header("Content-Type", path.equals("/auth/login") ? "application/x-www-form-urlencoded" : "application/json");
        return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }
    public JsonNode get(String path) throws Exception { return request("GET", path, null, 200); }
    public JsonNode request(String method, String path, Object body, int expected) throws Exception {
        var response = send(method, path, body == null ? null : JSON.writeValueAsString(body), !method.equals("GET"));
        assertEquals(expected, response.statusCode(), response.body());
        return response.body().isBlank() ? null : JSON.readTree(response.body());
    }
    public int login(String mobile, String password) throws Exception {
        return send("POST", "/auth/login", "mobile=" + mobile + "&password=" + URLEncoder.encode(password, StandardCharsets.UTF_8), true).statusCode();
    }
    public record Session(Account account, TestApi api) {}
    public static Session create(AccountService accounts, int port, Account.Role role, String mobile) throws Exception {
        var account = accounts.create("Isolated " + role, mobile, PASSWORD, role);
        var api = new TestApi(port); assertEquals(204, api.login(mobile, PASSWORD)); return new Session(account, api);
    }
    public static Map<String, Object> quoteInput(long terminalId) {
        return Map.of("terminalId", terminalId, "pickup", Map.of("lat", 15.21608, "lng", 120.549433),
                "dropoff", Map.of("lat", 15.22, "lng", 120.56), "category", "REGULAR");
    }
}
