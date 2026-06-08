# syntax=docker/dockerfile:1.7
# ---- builder stage --------------------------------------------------------
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /build

# Cache Maven deps in a separate layer.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x ./mvnw && ./mvnw -B -ntp dependency:go-offline

COPY src ./src
RUN ./mvnw -B -ntp clean package -DskipTests \
    && cp target/backend-*.jar /build/app.jar

# ---- runtime stage --------------------------------------------------------
FROM eclipse-temurin:21-jre

RUN useradd --create-home --uid 1000 app
WORKDIR /app
COPY --from=builder --chown=app:app /build/app.jar /app/app.jar

USER app
EXPOSE 8081

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:8081/actuator/health || exit 1

ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]
