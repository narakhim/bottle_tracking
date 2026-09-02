package de.bottletracking;

import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InventoryCommandController {
    private final JdbcTemplate jdbc;

    public InventoryCommandController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/api/inventory/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createRoom(@RequestBody RoomRequest request) {
        Long stationId = jdbc.queryForObject("SELECT id FROM stations WHERE name = ?", Long.class, request.station());
        jdbc.update("INSERT INTO rooms (name, station_id) VALUES (?, ?)", request.name(), stationId);
        return jdbc.queryForMap("SELECT id, name, station_id FROM rooms WHERE name = ?", request.name());
    }

    @PostMapping("/api/inventory/assign")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> assign(@RequestBody AssignRequest request, Authentication authentication) {
        var existingRows = jdbc.queryForList("SELECT id, current_room_id, status FROM bottles WHERE code = ?", request.code());
        if (existingRows.isEmpty()) {
            jdbc.update("INSERT INTO bottles (code, status, note, current_room_id) VALUES (?, 'ACTIVE', ?, ?)", request.code(), request.note(), request.roomId());
            long newBottleId = jdbc.queryForObject("SELECT id FROM bottles WHERE code = ?", Long.class, request.code());
            addHistory(newBottleId, null, request.roomId(), "ASSIGNED", authentication.getName(), request.note());
            return jdbc.queryForMap("SELECT id, code, status, note, current_room_id FROM bottles WHERE id = ?", newBottleId);
        }
        Map<String, Object> existing = existingRows.get(0);
        long bottleId = ((Number) existing.get("id")).longValue();
        Long previousRoom = existing.get("current_room_id") == null ? null : ((Number) existing.get("current_room_id")).longValue();
        if (previousRoom == null || previousRoom.longValue() != request.roomId()) {
            jdbc.update("UPDATE bottles SET current_room_id = ?, status = CASE WHEN status = 'MISSING' THEN 'ACTIVE' ELSE status END WHERE id = ?", request.roomId(), bottleId);
            addHistory(bottleId, previousRoom, request.roomId(), "ASSIGNED", authentication.getName(), request.note());
        }
        if (request.note() != null && !request.note().isBlank()) {
            jdbc.update("UPDATE bottles SET note = ? WHERE id = ?", request.note(), bottleId);
        }
        return jdbc.queryForMap("SELECT id, code, status, note, current_room_id FROM bottles WHERE id = ?", bottleId);
    }

    @PatchMapping("/api/inventory/bottles/{id}/status")
    @Transactional
    public Map<String, Object> status(@PathVariable long id, @RequestBody StatusRequest request, Authentication authentication) {
        jdbc.update("UPDATE bottles SET status = ? WHERE id = ?", request.status(), id);
        addHistory(id, null, null, request.status(), authentication.getName(), null);
        return jdbc.queryForMap("SELECT id, code, status, note, current_room_id FROM bottles WHERE id = ?", id);
    }

    @PatchMapping("/api/inventory/bottles/{id}/note")
    public Map<String, Object> note(@PathVariable long id, @RequestBody NoteRequest request) {
        jdbc.update("UPDATE bottles SET note = ? WHERE id = ?", request.note(), id);
        return jdbc.queryForMap("SELECT id, code, status, note, current_room_id FROM bottles WHERE id = ?", id);
    }

    private void addHistory(long bottleId, Long fromRoomId, Long toRoomId, String action, String user, String note) {
        jdbc.update("INSERT INTO bottle_history (bottle_id, from_room_id, to_room_id, action, changed_at, changed_by) VALUES (?, ?, ?, ?, ?, ?)",
            bottleId, fromRoomId, toRoomId, action + (note == null || note.isBlank() ? "" : "_NOTE"), OffsetDateTime.now(), user);
    }

    public record AssignRequest(String code, long roomId, String note) { }
    public record StatusRequest(String status) { }
    public record NoteRequest(String note) { }
    public record RoomRequest(String name, String station) { }
}
