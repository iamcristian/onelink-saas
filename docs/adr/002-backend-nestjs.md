# ADR-002: Backend Framework Selection: NestJS with SWC

## Status
Accepted

## Date
2026-10-13

## Context
The backend API requires an architecture that can support clean domain-driven design, robust Dependency Injection (DI) for ports & adapters (hexagonal architecture), automated OpenAPI documentation generation, and high maintainability as a portfolio piece and potential startup backend.

## Decision
Adopt **NestJS 12** with the **SWC compiler**:
- Use NestJS modular architecture (`@Module()`, `@Injectable()`, `@Controller()`).
- Leverage global filters, interceptors, and validation pipes for uniform request handling.
- Use the SWC builder (`builder: "swc"` in `nest-cli.json`) to compile the entire backend in under 100ms.
- Use `@nestjs/swagger` for automated OpenAPI 3.0 specification at `/api/docs`.

## Alternatives Considered
1. **Express (Vanilla)**: Rejected. Lacks opinionated structure, requiring boilerplate for DI, route modularity, and validation. Difficult to maintain at scale.
2. **Fastify (Standalone)**: Considered for raw throughput, but NestJS allows using Fastify as its underlying HTTP adapter if extreme throughput is required later.
3. **Go (Golang) / Rust**: Considered for raw performance, but using TypeScript across both backend and frontend enables 100% type sharing via `@repo/shared` and faster developer velocity.

## Consequences
- **Positive**: Enterprise-grade modular structure, effortless testing via DI mocking, automatic OpenAPI spec generation, and end-to-end type safety with `@repo/shared`.
- **Negative**: Slightly higher memory footprint than raw Go/Rust, requires configuring ts-jest with experimental VM modules for ESM/CJS compatibility in Node 24.
