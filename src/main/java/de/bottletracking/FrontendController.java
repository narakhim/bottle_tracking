package de.bottletracking;

import java.io.File;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FrontendController {
    @GetMapping(value = {"/", "/index.html"}, produces = MediaType.TEXT_HTML_VALUE)
    public Resource index() {
        return new FileSystemResource(new File("index.html"));
    }

    @GetMapping(value = "/app.js", produces = "text/javascript")
    public Resource appScript() {
        return new FileSystemResource(new File("app.js"));
    }

    @GetMapping(value = "/styles.css", produces = "text/css")
    public Resource stylesheet() {
        return new FileSystemResource(new File("styles.css"));
    }
}
