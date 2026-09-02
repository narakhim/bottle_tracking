package de.bottletracking;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminController {
    @GetMapping("/api/admin/ping")
    public Map<String, String> ping() {
        return Map.of("message", "Admin-Zugriff erlaubt.");
    }
}
