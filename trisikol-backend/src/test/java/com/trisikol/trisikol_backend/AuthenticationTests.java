package com.trisikol.trisikol_backend;

import com.trisikol.trisikol_backend.auth.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthenticationTests {
    @Value("${local.server.port}") int port;
    @Autowired AccountService accounts;
    @Autowired AccountRepository repository;
    @Autowired PasswordEncoder passwords;
    private final JsonMapper json = JsonMapper.builder().build();
    private static final String PASSWORD = "Test-only-password-123!";

    private class Browser {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();
        HttpResponse<String> send(String method, String path, String body, String type, boolean csrf) throws Exception {
            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10));
            if (csrf) {
                JsonNode token = json.readTree(send("GET", "/auth/csrf", null, null, false).body());
                request.header(token.get("headerName").asText(), token.get("token").asText());
            }
            if (type != null) request.header("Content-Type", type);
            return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() :
                HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
        }
        HttpResponse<String> get(String path) throws Exception { return send("GET", path, null, null, false); }
        HttpResponse<String> post(String path, String body) throws Exception { return send("POST", path, body, "application/json", true); }
        HttpResponse<String> login(String mobile, String password) throws Exception {
            return send("POST", "/auth/login", "mobile=" + mobile + "&password=" + URLEncoder.encode(password, StandardCharsets.UTF_8),
                "application/x-www-form-urlencoded", true);
        }
        String sessionId() { return cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("JSESSIONID")).findFirst().orElseThrow().getValue(); }
    }
    private String registration(String mobile) {
        return "{\"name\":\"Test Passenger\",\"mobile\":\"" + mobile + "\",\"password\":\"" + PASSWORD + "\"}";
    }

    @Test void registrationHashesPasswordAndPersistsSessionUntilLogout() throws Exception {
        Browser browser = new Browser();
        assertEquals(201, browser.post("/auth/register", registration("09170000001")).statusCode());
        var saved = repository.findByMobile("09170000001").orElseThrow();
        assertNotEquals(PASSWORD, saved.getPasswordHash());
        assertTrue(passwords.matches(PASSWORD, saved.getPasswordHash()));
        String before = browser.sessionId();
        assertEquals(204, browser.login("09170000001", PASSWORD).statusCode());
        assertNotEquals(before, browser.sessionId());
        var me = browser.get("/auth/me");
        assertEquals(200, me.statusCode());
        assertEquals("PASSENGER", json.readTree(me.body()).get("role").asText());
        assertFalse(me.body().contains("password"));
        assertEquals(200, browser.get("/passenger/profile").statusCode());
        assertEquals(403, browser.get("/admin/profile").statusCode());
        assertEquals(403, browser.get("/driver/profile").statusCode());
        assertEquals(204, browser.post("/auth/logout", "{}").statusCode());
        assertEquals(401, browser.get("/auth/me").statusCode());
    }

    @Test void unauthenticatedRequestsAndMissingCsrfAreRejected() throws Exception {
        Browser browser = new Browser();
        assertEquals(401, browser.get("/admin/profile").statusCode());
        assertEquals(401, browser.get("/auth/me").statusCode());
        assertEquals(403, browser.send("POST", "/auth/register", registration("09170000002"), "application/json", false).statusCode());
        assertEquals(403, browser.send("POST", "/auth/login", "mobile=admin&password=anything", "application/x-www-form-urlencoded", false).statusCode());
        assertEquals(401, browser.login("admin", "anything").statusCode());
    }

    @Test void duplicateInvalidAndForgedRolesCannotCreatePrivilegedAccounts() throws Exception {
        Browser browser = new Browser();
        assertEquals(400, browser.post("/auth/register", "{\"name\":\"A\",\"mobile\":\"123\",\"password\":\"short\"}").statusCode());
        String forged = registration("09170000003").replace("}", ",\"role\":\"ADMIN\"}");
        int code = browser.post("/auth/register", forged).statusCode();
        assertTrue(code == 201 || code == 400);
        if (code == 400) assertEquals(201, browser.post("/auth/register", registration("09170000003")).statusCode());
        assertEquals(Account.Role.PASSENGER, repository.findByMobile("09170000003").orElseThrow().getRole());
        assertEquals(409, browser.post("/auth/register", registration("09170000003")).statusCode());
        assertEquals(401, browser.login("09170000003", "wrong-password").statusCode());
        assertEquals(204, browser.login("09170000003", PASSWORD).statusCode());
        assertEquals(403, browser.post("/admin/drivers", registration("09170000004")).statusCode());
    }

    @Test void adminCanCreateDriverAndDriverCannotAccessAdmin() throws Exception {
        accounts.create("Admin", "09170000005", PASSWORD, Account.Role.ADMIN);
        Browser admin = new Browser();
        assertEquals(204, admin.login("09170000005", PASSWORD).statusCode());
        assertEquals(200, admin.get("/admin/profile").statusCode());
        assertEquals(201, admin.post("/admin/drivers", registration("09170000006")).statusCode());
        Browser driver = new Browser();
        assertEquals(204, driver.login("09170000006", PASSWORD).statusCode());
        assertEquals(200, driver.get("/driver/profile").statusCode());
        assertEquals(403, driver.get("/admin/profile").statusCode());
    }

    @Test void fareChangesRequireAdminAndPreservePreviousPolicies() throws Exception {
        String policy = """
            {"baseFare":45,"baseDistanceKm":1.5,"extraFarePerKm":10,
             "appServiceFeePerKm":1,"changeReason":"Testing administrator fare changes."}
            """;
        Browser anonymous = new Browser();
        assertEquals(401, anonymous.get("/fares/current").statusCode());
        accounts.create("Fare Passenger", "09170000007", PASSWORD, Account.Role.PASSENGER);
        Browser passenger = new Browser();
        assertEquals(204, passenger.login("09170000007", PASSWORD).statusCode());
        var original = passenger.get("/fares/current");
        assertEquals(200, original.statusCode());
        var originalJson = json.readTree(original.body());
        assertEquals(40, originalJson.get("baseFare").asInt());
        assertFalse(original.body().contains("createdBy"));
        assertEquals(403, passenger.get("/admin/fare-policies").statusCode());
        assertEquals(403, passenger.post("/admin/fare-policies", policy).statusCode());

        accounts.create("Fare Admin", "09170000008", PASSWORD, Account.Role.ADMIN);
        Browser admin = new Browser();
        assertEquals(204, admin.login("09170000008", PASSWORD).statusCode());
        assertEquals(403, admin.send("POST", "/admin/fare-policies", policy, "application/json", false).statusCode());
        for (String invalid : new String[] {
                policy.replace("\"baseFare\":45", "\"baseFare\":-1"),
                policy.replace("\"baseDistanceKm\":1.5", "\"baseDistanceKm\":0"),
                policy.replace("\"extraFarePerKm\":10", "\"extraFarePerKm\":10.123"),
                policy.replace("\"appServiceFeePerKm\":1", "\"appServiceFeePerKm\":10001"),
                policy.replace("Testing administrator fare changes.", "short"),
                policy.replace("\"baseFare\":45", "\"baseFare\":null") }) {
            assertEquals(400, admin.post("/admin/fare-policies", invalid).statusCode());
        }
        var created = admin.post("/admin/fare-policies", policy);
        assertEquals(201, created.statusCode());
        var saved = json.readTree(created.body());
        assertEquals("09170000008", saved.get("createdBy").asText());
        assertNotNull(saved.get("createdAt"));
        var current = json.readTree(passenger.get("/fares/current").body());
        assertEquals(45, current.get("baseFare").asInt());
        assertEquals(saved.get("id").asLong(), current.get("policyId").asLong());
        var history = json.readTree(admin.get("/admin/fare-policies").body());
        assertEquals(2, history.size());
        assertEquals(originalJson.get("policyId").asLong(), history.get(1).get("id").asLong());
        assertEquals(40, history.get(1).get("baseFare").asInt());

        accounts.create("Fare Driver", "09170000009", PASSWORD, Account.Role.DRIVER);
        Browser driver = new Browser();
        assertEquals(204, driver.login("09170000009", PASSWORD).statusCode());
        assertEquals(200, driver.get("/fares/current").statusCode());
        assertEquals(403, driver.post("/admin/fare-policies", policy).statusCode());
    }
}
