import java.util.List;

public class GasflaschenTracker implements AutoCloseable {
    private final Database database;

    public GasflaschenTracker() {
        this.database = new Database();
    }

    public void addRoom(Room room) {
        database.addRoom(room.getName());
    }

    public void addGasflasche(Gasflasche flasche) {
        database.addGasflasche(flasche.getNummer());
    }

    public List<Room> getRooms() {
        return database.getRooms();
    }

    public void moveGasflasche(String nummer, Room neuerRaum) {
        database.moveGasflasche(nummer, neuerRaum.getName());
    }

    @Override
    public void close() {
        database.close();
    }

    public static void main(String[] args) {
        try (GasflaschenTracker tracker = new GasflaschenTracker()) {
            Room room1 = new Room("Room 101");
            Room room2 = new Room("Room 102");
            tracker.addRoom(room1);
            tracker.addRoom(room2);

            tracker.addGasflasche(new Gasflasche("Flasche-01"));
            tracker.addGasflasche(new Gasflasche("Flasche-02"));
            tracker.moveGasflasche("Flasche-01", room1);
            tracker.moveGasflasche("Flasche-01", room2);

            for (Room room : tracker.getRooms()) {
                System.out.println(room.getName() + ": " + room.getGasflaschen());
            }
        }
    }
}