INSERT INTO stations (name, color) VALUES
    ('Nord', 'mint'),
    ('Süd', 'coral'),
    ('West', 'blue'),
    ('Ost', 'yellow');

INSERT INTO rooms (name, station_id)
SELECT 'Room 101', id FROM stations WHERE name = 'Nord';

INSERT INTO rooms (name, station_id)
SELECT 'Room 102', id FROM stations WHERE name = 'Süd';
