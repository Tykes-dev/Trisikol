# Architecture

The application is split into a React frontend and a Spring Boot REST API.

## Frontend

Organize UI by feature: `auth`, `rides`, `drivers`, and `admin`. Keep feature-specific components, API calls, hooks, and state close to their feature. Shared UI belongs in `src/components`.

## Backend

Organize API code by business capability: `auth`, `users`, `rides`, `drivers`, and `terminals`. Each capability should contain its controller, service, repository, DTOs, and entities. Cross-cutting concerns belong in `config` or `common`.

## Database

Store versioned schema changes in `src/main/resources/db/migration` and apply them through Flyway before application startup.
