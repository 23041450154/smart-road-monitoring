# Implementation Plan

## Scope

Build a runnable MVP of Smart Road Monitoring & Commuter Assistant. Development and tests must work without a public CCTV stream, WhatsApp credential, GPU, or trained pothole model. Production configuration uses PostgreSQL/PostGIS; automated tests use SQLite.

## Work plan

- [x] Inspect the repository and local toolchain.
- [x] Create monorepo structure, environment configuration, and Docker Compose services.
- [x] Add SQLAlchemy models, PostGIS-aware geometry storage, Alembic migration, and deterministic demo seed data.
- [x] Build FastAPI camera, traffic, route, pothole, and commute-briefing endpoints.
- [x] Implement traffic rolling windows, configurable classifications, trends, and spatial route matching.
- [x] Implement independent traffic and pothole workers, stream adapters, anonymous tracking, GPX interpolation, and duplicate suppression.
- [x] Build the responsive Next.js dashboard, charts, maps, route editor, CCTV detail, pothole, and settings pages.
- [x] Add an importable n8n schedule/briefing workflow with a WhatsApp-ready outbox.
- [x] Add developer scripts, CCTV integration guidance, and full README.
- [x] Run backend tests plus frontend lint, typecheck, and production build; fix failures.

## Engineering choices

- The API uses PostgreSQL/PostGIS in Docker and SQLite during isolated tests.
- Route geometry is represented as GeoJSON at the API boundary and persisted as PostGIS `LINESTRING` in production. A portable text representation is used by SQLite tests.
- Nearby camera/pothole queries use PostGIS `ST_DWithin` on PostgreSQL and a deterministic haversine/segment-distance fallback on SQLite.
- CCTV is adapter-driven (`local`, `hls`, `rtsp`) and starts safely even when a stream is unavailable.
- YOLO/ByteTrack imports are lazy so the API remains usable without heavyweight CV packages. Mock modes are explicit and never described as real detections.
- Congestion and briefing status are deterministic; optional LLM formatting is isolated behind a provider interface.

## External inputs intentionally optional

- Authorized public CCTV URL.
- `vision/samples/traffic.mp4` local demo video.
- Trained pothole YOLO weights.
- WhatsApp provider credential and recipient phone mapping (deferred).
- Optional LLM provider configuration.
