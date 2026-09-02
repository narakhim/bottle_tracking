FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
COPY app.js index.html styles.css ./
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/target/bottle-tracking-1.0-SNAPSHOT.jar app.jar
COPY --from=build /workspace/app.js /workspace/index.html /workspace/styles.css ./
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
