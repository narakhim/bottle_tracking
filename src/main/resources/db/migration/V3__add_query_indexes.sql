CREATE INDEX IF NOT EXISTS idx_bottles_current_room ON bottles(current_room_id);
CREATE INDEX IF NOT EXISTS idx_bottle_history_bottle_changed ON bottle_history(bottle_id, changed_at DESC);
