plugins {
    kotlin("jvm") version "2.2.20"
}

group = "catalyst"
version = "0.1.0"

kotlin {
    jvmToolchain(21)
}

dependencies {
    // The JSON tree API only - every API response is picked apart field by field (see Json.kt), so
    // no serialization compiler plugin is needed and nothing is trusted just because it parsed.
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")

    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}
