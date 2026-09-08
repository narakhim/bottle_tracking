package de.bottletracking;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Benutzerverwaltung. Diese Endpunkte sind durch SecurityConfig auf ADMIN beschränkt. */
@RestController
public class AdminUserController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public AdminUserController(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/api/admin/users")
    public List<Map<String, Object>> users() {
        Map<String, Map<String, Object>> users = new LinkedHashMap<>();
        Map<String, List<String>> viewAuthorities = new LinkedHashMap<>();
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT u.username, u.enabled, a.authority
            FROM app_users u JOIN user_authorities a ON a.username = u.username
            ORDER BY u.username
            """);
        for (Map<String, Object> row : rows) {
                String username = (String) row.get("username");
                users.computeIfAbsent(username, key -> {
                    Map<String, Object> user = new LinkedHashMap<>();
                    user.put("username", key);
                    user.put("enabled", row.get("enabled"));
                    user.put("role", "ROLE_USER");
                    return user;
                });
                String authority = (String) row.get("authority");
                if (authority.startsWith("ROLE_")) users.get(username).put("role", authority);
                    if (authority.startsWith("VIEW_")) viewAuthorities.computeIfAbsent(username, key -> new ArrayList<>()).add(authority);
        }
                users.forEach((username, user) -> user.put("views", viewAuthorities.getOrDefault(username, List.of())));
        return new ArrayList<>(users.values());
    }

    @PostMapping("/api/admin/users")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createUser(@RequestBody CreateUserRequest request) {
        validateNewUser(request);
        String authority = authority(request.role());
        jdbc.update("INSERT INTO app_users (username, password, enabled) VALUES (?, ?, TRUE)", request.username(), passwordEncoder.encode(request.password()));
        jdbc.update("INSERT INTO user_authorities (username, authority) VALUES (?, ?)", request.username(), authority);
        replaceViewAuthorities(request.username(), request.views(), request.role());
        return Map.of("username", request.username(), "role", authority);
    }

    @PutMapping("/api/admin/users/{username}")
    public Map<String, Object> updateUser(@PathVariable String username, @RequestBody UpdateUserRequest request, Authentication authentication) {
        if (username.equals(authentication.getName()) && (Boolean.FALSE.equals(request.enabled()) || isNonAdminRole(request.role()))) {
            throw new IllegalArgumentException("Das eigene Administratorkonto kann nicht deaktiviert oder herabgestuft werden.");
        }
        if (isLastAdmin(username) && (Boolean.FALSE.equals(request.enabled()) || isNonAdminRole(request.role()))) {
            throw new IllegalArgumentException("Mindestens ein aktiver Administrator muss erhalten bleiben.");
        }
        if (request.password() != null && !request.password().isBlank()) {
            if (request.password().length() < 10) throw new IllegalArgumentException("Das Passwort muss mindestens 10 Zeichen lang sein.");
            jdbc.update("UPDATE app_users SET password = ? WHERE username = ?", passwordEncoder.encode(request.password()), username);
        }
        if (request.enabled() != null) jdbc.update("UPDATE app_users SET enabled = ? WHERE username = ?", request.enabled(), username);
        if (request.role() != null) {
            jdbc.update("DELETE FROM user_authorities WHERE username = ?", username);
            jdbc.update("INSERT INTO user_authorities (username, authority) VALUES (?, ?)", username, authority(request.role()));
        }
        if (request.views() != null) replaceViewAuthorities(username, request.views(), request.role());
        return users().stream().filter(user -> username.equals(user.get("username"))).findFirst().orElseThrow();
    }

    @DeleteMapping("/api/admin/users/{username}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable String username, Authentication authentication) {
        if (username.equals(authentication.getName())) throw new IllegalArgumentException("Das eigene Konto kann nicht gelöscht werden.");
        if (isLastAdmin(username)) throw new IllegalArgumentException("Der letzte Administrator kann nicht gelöscht werden.");
        jdbc.update("DELETE FROM app_users WHERE username = ?", username);
    }

    private void validateNewUser(CreateUserRequest request) {
        if (request.username() == null || !request.username().matches("[A-Za-z0-9._-]{3,80}")) {
            throw new IllegalArgumentException("Der Benutzername muss 3 bis 80 Zeichen lang sein.");
        }
        if (request.password() == null || request.password().length() < 10) {
            throw new IllegalArgumentException("Das Passwort muss mindestens 10 Zeichen lang sein.");
        }
    }

    private String authority(String role) {
        if (role == null || "USER".equalsIgnoreCase(role)) return "ROLE_USER";
        if ("MANAGEMENT".equalsIgnoreCase(role)) return "ROLE_MANAGEMENT";
        if ("ADMIN".equalsIgnoreCase(role)) return "ROLE_ADMIN";
        throw new IllegalArgumentException("Unbekannte Benutzerrolle.");
    }

    private boolean isNonAdminRole(String role) {
        return role != null && !"ADMIN".equalsIgnoreCase(role);
    }

    private void replaceViewAuthorities(String username, List<String> views, String role) {
        jdbc.update("DELETE FROM user_authorities WHERE username = ? AND authority LIKE 'VIEW_%'", username);
        List<String> effectiveViews = views == null || views.isEmpty() ? defaultViews(role) : views;
        for (String view : effectiveViews) {
            if (Set.of("VIEW_MANAGE", "VIEW_INVENTORY", "VIEW_ADMIN").contains(view)) {
                jdbc.update("INSERT INTO user_authorities (username, authority) VALUES (?, ?)", username, view);
            }
        }
    }

    private List<String> defaultViews(String role) {
        if ("ADMIN".equalsIgnoreCase(role)) return List.of("VIEW_MANAGE", "VIEW_INVENTORY", "VIEW_ADMIN");
        if ("MANAGEMENT".equalsIgnoreCase(role)) return List.of("VIEW_MANAGE", "VIEW_INVENTORY");
        return List.of("VIEW_MANAGE");
    }

    private boolean isLastAdmin(String username) {
        Integer admins = jdbc.queryForObject("""
            SELECT COUNT(*) FROM app_users u JOIN user_authorities a ON a.username = u.username
            WHERE u.enabled = TRUE AND a.authority = 'ROLE_ADMIN'
            """, Integer.class);
        Boolean isAdmin = jdbc.query("""
            SELECT EXISTS(SELECT 1 FROM user_authorities WHERE username = ? AND authority = 'ROLE_ADMIN')
            """, resultSet -> resultSet.next() && resultSet.getBoolean(1), username);
        return Boolean.TRUE.equals(isAdmin) && admins != null && admins <= 1;
    }

    public record CreateUserRequest(String username, String password, String role, List<String> views) { }
    public record UpdateUserRequest(String password, String role, Boolean enabled, List<String> views) { }
}
