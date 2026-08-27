package de.bottletracking;

import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CurrentUserController {
    @GetMapping("/api/auth/me")
    public Map<String, Object> currentUser(Authentication authentication) {
        return Map.of("username", authentication.getName(), "role", authentication.getAuthorities().iterator().next().getAuthority());
    }

    @PostMapping("/api/auth/logout")
    public Map<String, String> logout() {
        return Map.of("message", "Abmeldung erfolgreich.");
    }
}