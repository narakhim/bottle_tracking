package de.bottletracking;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Erstellt ausschließlich das erste Administratorkonto nach erfolgreicher Flyway-Migration. */
@Component
public class DataInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminPassword;

    public DataInitializer(JdbcTemplate jdbc, PasswordEncoder passwordEncoder,
                           @Value("${app.bootstrap.admin-username}") String adminUsername,
                           @Value("${app.bootstrap.admin-password}") String adminPassword) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        Integer users = jdbc.queryForObject("SELECT COUNT(*) FROM app_users", Integer.class);
        if (users != null && users > 0) return;
        if (adminPassword == null || adminPassword.length() < 10) {
            throw new IllegalStateException("INITIAL_ADMIN_PASSWORD muss beim ersten Start mindestens 10 Zeichen enthalten.");
        }
        jdbc.update("INSERT INTO app_users (username, password, enabled) VALUES (?, ?, TRUE)",
            adminUsername, passwordEncoder.encode(adminPassword));
        jdbc.update("INSERT INTO user_authorities (username, authority) VALUES (?, 'ROLE_ADMIN')", adminUsername);
    }
}
