public class Gasflasche {
    private final String nummer;

    public Gasflasche(String nummer) {
        if (nummer == null || nummer.isBlank()) {
            throw new IllegalArgumentException("Die Flaschennummer darf nicht leer sein.");
        }
        this.nummer = nummer;
    }

    public String getNummer() {
        return nummer;
    }

    @Override
    public String toString() {
        return nummer;
    }
}

