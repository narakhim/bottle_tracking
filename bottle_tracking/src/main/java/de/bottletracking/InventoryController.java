package de.bottletracking;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InventoryController {
    private final JdbcTemplate jdbc;

    public InventoryController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/api/inventory")
    public Map<String, Object> inventory(Authentication authentication) {
        List<Map<String, Object>> stations = jdbc.queryForList("SELECT id, name, color FROM stations ORDER BY name");
        List<Map<String, Object>> rooms = jdbc.queryForList("""
            SELECT r.id, r.name, s.id AS station_id, s.name AS station, s.color
            FROM rooms r LEFT JOIN stations s ON s.id = r.station_id
            ORDER BY s.name NULLS FIRST, r.name
            """);
        List<Map<String, Object>> bottles = jdbc.queryForList("""
            SELECT b.id, b.code, b.status, b.note, b.current_room_id,
                   r.name AS room, s.name AS station, s.color
            FROM bottles b LEFT JOIN rooms r ON r.id = b.current_room_id
                   LEFT JOIN stations s ON s.id = r.station_id
            ORDER BY b.code
            """);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("user", Map.of("username", authentication.getName(), "role", authentication.getAuthorities().iterator().next().getAuthority()));
        response.put("stations", stations);
        response.put("rooms", rooms);
        response.put("bottles", bottles);
        return response;
    }
}
