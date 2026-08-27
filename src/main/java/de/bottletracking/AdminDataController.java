package de.bottletracking;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminDataController {
    private final JdbcTemplate jdbc;

    public AdminDataController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/api/admin/stations")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createStation(@RequestBody StationRequest request) {
        jdbc.update("INSERT INTO stations (name, color) VALUES (?, ?)", request.name(), request.color());
        return jdbc.queryForMap("SELECT id, name, color FROM stations WHERE name = ?", request.name());
    }

    @PutMapping("/api/admin/stations/{id}")
    public Map<String, Object> updateStation(@PathVariable long id, @RequestBody StationRequest request) {
        jdbc.update("UPDATE stations SET name = ?, color = ? WHERE id = ?", request.name(), request.color(), id);
        return jdbc.queryForMap("SELECT id, name, color FROM stations WHERE id = ?", id);
    }

    @DeleteMapping("/api/admin/stations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStation(@PathVariable long id) {
        jdbc.update("UPDATE rooms SET station_id = NULL WHERE station_id = ?", id);
        jdbc.update("DELETE FROM stations WHERE id = ?", id);
    }

    @PutMapping("/api/admin/rooms/{id}")
    public Map<String, Object> updateRoom(@PathVariable long id, @RequestBody RoomRequest request) {
        jdbc.update("UPDATE rooms SET name = ?, station_id = ? WHERE id = ?", request.name(), request.stationId(), id);
        return jdbc.queryForMap("SELECT id, name, station_id FROM rooms WHERE id = ?", id);
    }

    @DeleteMapping("/api/admin/rooms/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoom(@PathVariable long id) {
        jdbc.update("UPDATE bottles SET current_room_id = NULL WHERE current_room_id = ?", id);
        jdbc.update("DELETE FROM rooms WHERE id = ?", id);
    }

    @PutMapping("/api/admin/bottles/{id}")
    public Map<String, Object> updateBottle(@PathVariable long id, @RequestBody BottleRequest request) {
        jdbc.update("UPDATE bottles SET code = ?, status = ?, note = ?, current_room_id = ? WHERE id = ?",
            request.code(), request.status(), request.note(), request.roomId(), id);
        return jdbc.queryForMap("SELECT id, code, status, note, current_room_id FROM bottles WHERE id = ?", id);
    }

    @DeleteMapping("/api/admin/bottles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBottle(@PathVariable long id) {
        jdbc.update("DELETE FROM bottle_history WHERE bottle_id = ?", id);
        jdbc.update("DELETE FROM bottles WHERE id = ?", id);
    }

    public record StationRequest(String name, String color) { }
    public record RoomRequest(String name, Long stationId) { }
    public record BottleRequest(String code, String status, String note, Long roomId) { }
}
