# AntiGravity Continuation Prompt — Smart Road Monitoring & Pothole Training

You are continuing an existing capstone project that was previously developed with Codex.

## PROJECT NAME

**Smart Road Monitoring & Commuter Assistant**

Your task is to CONTINUE the existing repository from its current state.

Do **not** rebuild the project from scratch.

Do **not** assume the previous implementation is complete just because files exist.

Inspect the repository, identify what has already been implemented, what is unfinished, what is mocked, what is broken, and then continue development from the first genuinely unfinished task.

---

# 1. PROJECT CONTEXT

This project combines four main components.

## A. CCTV Traffic Monitoring

Public CCTV streams in Palembang are used for:

- vehicle detection
- anonymous vehicle tracking
- vehicle counting
- traffic volume analysis
- traffic trend analysis
- congestion classification

Technology:

- YOLO
- ByteTrack
- OpenCV / FFmpeg
- FastAPI
- PostgreSQL/PostGIS

CCTV is **NOT** used for pothole detection.

## B. Pothole Detection

Potholes are detected using manually recorded road videos.

```text
Manual Road Recording
        ↓
Frame Extraction
        ↓
YOLO Pothole Model
        ↓
Pothole Detection
        ↓
GPS Matching
        ↓
PostgreSQL/PostGIS
        ↓
Dashboard / Route Warning
```

The pothole model should eventually be trained using legitimate public pothole datasets and locally collected Palembang road data.

## C. User Commute Routes

Users can create:

```text
Rute Berangkat
Rute Pulang
```

The system associates nearby CCTV traffic conditions and potholes near the route, then generates a commute briefing.

## D. n8n Automation

The system automatically sends commute information before users leave for work or return home.

Example:

```text
🚦 Info perjalanan pulang

Jl. Sudirman lagi padat nih.
Volume kendaraan sedang meningkat.

Ada 1 titik jalan berlubang di rute kamu.

Hati-hati di jalan.
```

Automation flow:

```text
Schedule Trigger
      ↓
Get User Route
      ↓
FastAPI Briefing Endpoint
      ↓
Message Formatter
      ↓
Telegram
```

---

# 2. EXISTING TECH STACK

The existing project may contain:

## Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL
- PostGIS
- psycopg

## Computer Vision
- Ultralytics YOLO
- OpenCV
- FFmpeg
- ByteTrack

## Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Leaflet
- OpenStreetMap
- Recharts

## Automation
- n8n
- Telegram

## Infrastructure
- Docker Compose
- `.env`
- `.env.example`

## Testing
- pytest
- FastAPI TestClient
- frontend lint
- TypeScript typecheck

Do not add unnecessary frameworks unless there is a clear engineering reason.

---

# 3. FIRST ACTION — AUDIT THE EXISTING REPOSITORY

Before changing anything, inspect the repository.

Read at minimum:

```text
README.md
docker-compose.yml
.env.example
Makefile
backend/
frontend/
vision/
training/
datasets/
scripts/
n8n/
docs/
tests/
```

Also inspect:

- Git status
- dependency files
- migrations
- database models
- API routes
- pothole worker
- traffic worker
- YOLO integration
- ByteTrack integration
- dataset scripts
- model training scripts
- n8n workflow JSON

Create:

```text
docs/ANTIGRAVITY_CONTINUATION_AUDIT.md
```

Document:

- already implemented
- working
- partially implemented
- mocked
- TODO
- broken
- missing
- external dependency required
- credentials required
- dataset required
- model required

Do not trust README claims. Verify actual code and actual commands.

---

# 4. DO NOT REBUILD WORKING COMPONENTS

Preserve all working code.

Only refactor when:

- code is broken
- architecture prevents further development
- security issue exists
- duplicate implementations exist
- tests prove current behavior is incorrect

Do not replace working functionality with placeholders.

---

# 5. CHECK CURRENT PROJECT STATE

Run relevant commands:

```bash
git status
git log --oneline -10
python --version
node --version
npm --version
docker --version
docker compose version
ffmpeg -version
```

Inspect installed Python and Node dependencies. Do not blindly reinstall everything.

---

# 6. START INFRASTRUCTURE

If Docker Compose exists, inspect it first.

Start:

```text
PostgreSQL/PostGIS
FastAPI
Next.js
n8n
```

Expected default ports may be:

```text
Frontend   : 3000
FastAPI    : 8000
PostgreSQL : 5432
n8n        : 5678
```

Use actual project configuration if different.

Verify:

```text
GET /health
```

Fix startup errors.

---

# 7. DATABASE VALIDATION

Inspect:

- Alembic migrations
- database models
- foreign keys
- spatial columns
- indexes
- seed data

Expected domain entities may include:

```text
users
cameras
traffic_snapshots
vehicle_events
routes
potholes
```

Verify PostGIS is enabled.

Do not recreate or destroy existing database data unless absolutely necessary.

---

# 8. CCTV TRAFFIC MODULE

The CCTV module should support:

```text
CCTV Stream
     ↓
Stream Adapter
     ↓
YOLO Vehicle Detection
     ↓
ByteTrack
     ↓
Vehicle Counting
     ↓
Traffic Analytics
     ↓
Database
```

Vehicle classes:

```text
car
motorcycle
bus
truck
```

Do not perform face recognition, driver recognition, license plate identity tracking, or vehicle owner identification.

Tracking must remain anonymous.

---

# 9. CCTV STREAM ABSTRACTION

The vision pipeline should not depend directly on one CCTV website.

Expected abstraction:

```text
BaseStreamSource
LocalVideoSource
HLSStreamSource
RTSPStreamSource
```

If this already exists, keep it. If incomplete, finish it.

Add reconnect logic with exponential backoff. A single broken stream must not crash all workers.

---

# 10. PALEMBANG CCTV INTEGRATION RULES

Real Palembang CCTV integration must only use publicly available and legitimate streams.

Target public site may include:

```text
https://cctv.palembang.go.id/
```

Rules:

- do not bypass authentication
- do not brute force endpoints
- do not access admin resources
- do not steal tokens
- do not scan private IP ranges
- do not exploit vulnerabilities
- do not invent stream URLs

Allowed investigation:

- public HTML
- public JavaScript
- Browser DevTools
- Network
- Fetch/XHR
- Media
- obvious public HLS/MJPEG/WebRTC endpoints

If no usable public stream can be verified, keep demo/local video mode working.

---

# 11. DEMO CCTV MODE

Support:

```text
DEMO_MODE=true
```

Demo flow:

```text
Local Traffic Video
        ↓
YOLO
        ↓
ByteTrack
        ↓
Traffic Analytics
        ↓
PostgreSQL
        ↓
Dashboard
```

Do not claim demo traffic is real Palembang traffic.

---

# 12. TRAFFIC ANALYTICS

Verify the system calculates:

- vehicles per minute
- rolling 5-minute volume
- rolling 15-minute volume
- vehicle composition
- congestion score
- traffic status
- traffic trend

Traffic status:

```text
LANCAR
SEDANG
PADAT
MACET
```

Traffic trend:

```text
MENURUN
STABIL
MENINGKAT
```

Do not let an LLM decide congestion. Traffic classification must be deterministic.

Thresholds should be configurable per camera.

---

# 13. VEHICLE COUNTING VALIDATION

Check for duplicate counting.

A vehicle must not be counted once per frame.

Use:

- ByteTrack ID
- virtual line crossing
- crossing state
- direction

Supported directions may be:

```text
A_TO_B
B_TO_A
```

---

# 14. USER ROUTE SYSTEM

Verify users can create:

```text
Rute Berangkat
Rute Pulang
```

Store route geometry using PostGIS LineString.

Find:

- CCTV cameras near route
- potholes near route

Configuration may include:

```text
CAMERA_ROUTE_BUFFER_METERS
POTHOLE_ROUTE_BUFFER_METERS
```

---

# 15. COMMUTE BRIEFING

Verify endpoint:

```text
GET /api/routes/{id}/briefing
```

Structured data must come from actual stored analytics. Do not fabricate traffic or pothole information.

---

# 16. NATURAL LANGUAGE FORMATTER

Template mode must work without paid AI APIs.

An optional LLM integration may be supported, but the LLM may only format structured data.

The LLM must not invent:

- roads
- traffic status
- potholes
- route alternatives
- measurements

---

# 17. N8N AUTOMATION

Inspect the existing n8n workflow.

Expected flow:

```text
Schedule Trigger
      ↓
Find active commute route
      ↓
HTTP Request
      ↓
FastAPI briefing
      ↓
Format message
      ↓
Telegram
```

Support:

```text
commute_to_work
commute_home
```

Timezone:

```text
Asia/Jakarta
```

Do not hardcode Telegram secrets.

---

# 18. POTHOLE TRAINING PIPELINE

Continue the custom pothole training pipeline if it already exists.

The final pothole model should use one class:

```text
0 = pothole
```

Pothole detection must NOT use the generic COCO model as if it were trained for potholes.

Use transfer learning from a compatible pretrained YOLO model.

---

# 19. DATASET SOURCES

Use legitimate public pothole datasets.

Potential source:

```text
RDD2022 / Road Damage Detection 2022
```

For single-class pothole training:

```text
D40 -> pothole
```

Other non-pothole classes should not automatically become pothole labels.

Possible additional datasets:

- legitimate public pothole datasets
- public Roboflow pothole datasets with clear attribution/license

Do not blindly merge random internet datasets.

---

# 20. DATASET ATTRIBUTION

Create or update:

```text
docs/datasets.md
```

Record:

- dataset name
- source
- source URL
- license if known
- image count
- original classes
- classes used
- conversion rules

Never remove attribution.

---

# 21. PALEMBANG LOCAL DATASET

Support manually collected Palembang road recordings.

Expected structure:

```text
datasets/raw/palembang/videos/
```

If no local videos exist, do not fabricate them.

Create instructions for adding them later.

---

# 22. FRAME EXTRACTION

Inspect or create:

```text
scripts/dataset/extract_frames.py
```

Expected usage:

```bash
python scripts/dataset/extract_frames.py   --input datasets/raw/palembang/videos   --output datasets/raw/palembang/images   --fps 1
```

Do not extract every frame from high-FPS videos.

---

# 23. IMAGE QUALITY AND DUPLICATE CHECKING

Inspect or create:

```text
scripts/dataset/check_images.py
scripts/dataset/find_duplicates.py
```

Detect or flag:

- blur
- dark images
- corrupted images
- extreme resolution problems
- duplicates / near duplicates

Do not delete source data automatically.

Avoid near-identical frames being split across train, validation, and test.

---

# 24. ANNOTATION

Palembang local images must be annotated manually or reviewed by humans.

Recommended tools:

- CVAT
- Roboflow
- Label Studio

YOLO format:

```text
0 x_center y_center width height
```

Do not label shadows, manholes, road markings, puddles without visible potholes, normal cracks, or dark asphalt patches as potholes.

---

# 25. DO NOT CREATE FAKE GROUND TRUTH

Do not take predictions from the same model and automatically treat them as ground truth labels.

Model-assisted annotation is allowed only if labels are manually reviewed.

---

# 26. LABEL VALIDATION

Inspect or create:

```text
scripts/dataset/validate_labels.py
```

Validate:

- class ID
- coordinate ranges
- width/height > 0
- box inside image
- orphan labels
- orphan images
- invalid values
- NaN values

Block full training when critical label errors exist.

---

# 27. ANNOTATION PREVIEW

Inspect or create:

```text
scripts/dataset/visualize_annotations.py
```

Generate sample annotated previews into:

```text
datasets/reports/annotation_samples/
```

---

# 28. RDD2022 CONVERSION

Inspect or create:

```text
scripts/dataset/convert_rdd2022.py
```

Expected logic:

```text
D40 -> pothole -> class 0
```

Do not alter original raw dataset.

---

# 29. FINAL DATASET BUILD

Inspect or create:

```text
scripts/dataset/build_dataset.py
```

Combine legitimate public pothole datasets with verified Palembang local data.

Create:

```text
datasets/manifests/dataset_manifest.csv
```

Maintain source metadata for every image.

---

# 30. TRAIN / VALIDATION / TEST SPLIT

Default target:

```text
70% train
20% validation
10% test
```

Seed:

```text
42
```

Do not randomly split frames from the same recording session across train, validation, and test.

Prefer grouped splitting by video, recording session, route, or source sequence.

---

# 31. NEGATIVE EXAMPLES

Support road images without potholes:

- normal asphalt
- manhole
- shadow
- puddle
- road patch
- cracked road without pothole

Do not fabricate bounding boxes.

---

# 32. DATASET STATISTICS

Inspect or create:

```text
scripts/dataset/dataset_stats.py
```

Generate:

```text
datasets/reports/dataset_statistics.json
datasets/reports/dataset_statistics.md
```

Do not invent statistics.

---

# 33. YOLO DATASET CONFIG

Expected config:

```text
training/configs/pothole.yaml
```

Example:

```yaml
path: ../../datasets/processed/pothole
train: images/train
val: images/val
test: images/test

names:
  0: pothole
```

Verify paths actually resolve.

---

# 34. MODEL SELECTION AND HARDWARE

Inspect the installed Ultralytics version.

Use a lightweight supported YOLO model.

Prefer:

- nano baseline
- small model comparison if hardware permits

Use transfer learning.

Before training, report:

- CPU
- RAM
- GPU availability
- GPU model
- VRAM
- CUDA availability
- PyTorch version
- Ultralytics version

If CUDA exists, use GPU.

If no GPU exists, allow CPU smoke testing.

---

# 35. SMOKE TRAINING FIRST

Before full training, run 1–3 epochs with a small subset and lightweight model.

Verify:

- dataset path
- labels
- PyTorch
- Ultralytics
- device
- training configuration

Only run long training after the smoke test succeeds.

---

# 36. FULL TRAINING

Inspect or create:

```text
training/scripts/train_pothole.py
```

Suggested baseline:

```text
epochs: 100
imgsz: 640
batch: auto
patience: 20
seed: 42
```

Use early stopping.

Support `--resume`.

Save weights, training curves, config, environment snapshot, and metrics.

---

# 37. MODEL EVALUATION

Inspect or create:

```text
training/scripts/evaluate_pothole.py
```

Final evaluation should include:

- Precision
- Recall
- F1
- mAP@0.5
- mAP@0.5:0.95
- Precision-Recall curve
- confusion matrix
- prediction samples

Use test set only after model selection.

---

# 38. PALEMBANG-SPECIFIC EVALUATION

If local Palembang test data exists, report results separately.

If it does not exist, clearly report:

```text
Palembang local test set not available yet.
```

Do not fabricate local results.

---

# 39. ERROR ANALYSIS

Inspect or create:

```text
training/scripts/error_analysis.py
```

Collect:

- false positives
- false negatives
- low confidence cases
- correct detections

Document common errors in:

```text
docs/model-error-analysis.md
```

---

# 40. ACTIVE MODEL

After selecting the best actual trained model:

```text
vision/models/pothole/best.pt
```

Create/update:

```text
vision/models/pothole/model_metadata.json
```

Record only actual measured values.

---

# 41. POTHOLE WORKER INTEGRATION

Inspect existing pothole worker.

Use:

```text
POTHOLE_MODEL_PATH=vision/models/pothole/best.pt
POTHOLE_CONFIDENCE_THRESHOLD=0.40
```

Keep these configurable through environment variables.

---

# 42. VIDEO INFERENCE AND DUPLICATE SUPPRESSION

The final worker should support:

```text
Manual Road Video
      ↓
Frames
      ↓
Pothole Detection
      ↓
Temporal Duplicate Suppression
      ↓
GPS Matching
      ↓
Database
```

One physical pothole appearing in many consecutive frames should not create hundreds of records.

---

# 43. GPS MATCHING

Expected process:

```text
Video Timestamp
      ↓
Nearest / Interpolated GPS Timestamp
      ↓
Latitude / Longitude
```

Document GPS accuracy limitations.

---

# 44. POTHOLE SEVERITY

Do not assume:

```text
large bounding box = severe pothole
```

YOLO confidence is not severity.

If no scientifically supported severity estimator exists, use:

```text
unknown
```

or manual review.

---

# 45. FRONTEND VALIDATION

Check pages if present:

```text
/dashboard
/cctv
/cctv/[id]
/map
/routes
/routes/[id]
/potholes
/settings
```

Verify loading states, API errors, camera markers, pothole markers, saved route geometry, traffic charts, and responsive layout.

---

# 46. TESTING

Run all available tests:

```text
backend tests
traffic analytics tests
API tests
PostGIS tests
route matching tests
pothole matching tests
dataset tests
label validation tests
training config tests
GPS tests
frontend lint
frontend typecheck
```

External real-CCTV tests may be optional. Core logic must not be skipped without reason.

---

# 47. FAILURE HANDLING

Test:

- invalid CCTV stream
- CCTV offline
- database unavailable
- missing model
- corrupt video
- invalid GPX
- API timeout
- n8n timeout
- Telegram failure

System should fail gracefully.

---

# 48. SECURITY REVIEW

Check:

```text
.env
.env.example
.gitignore
Docker configuration
n8n credentials
Telegram token
database password
CCTV URLs
```

Never commit secrets.

---

# 49. DOCUMENTATION TO UPDATE

Update or create:

```text
README.md
docs/ANTIGRAVITY_CONTINUATION_AUDIT.md
docs/datasets.md
docs/annotation-guide.md
docs/model-error-analysis.md
docs/PALembang_CCTV_DISCOVERY.md
docs/END_TO_END_TEST.md
training/README.md
```

Do not claim functionality was verified unless it was actually tested.

---

# 50. END-TO-END TARGET

```text
                 ┌────────────────────┐
                 │ Palembang CCTV     │
                 └─────────┬──────────┘
                           ↓
                   YOLO Vehicle Model
                           ↓
                       ByteTrack
                           ↓
                   Traffic Analytics
                           ↓
                       FastAPI
                           ↓
                   PostgreSQL/PostGIS
                           ↓
                ┌──────────┴──────────┐
                ↓                     ↓
         Next.js Dashboard           n8n
                                      ↓
                                  Telegram


Manual Road Recording
        ↓
Pothole YOLO Model
        ↓
GPS Matching
        ↓
PostGIS
        ↓
Route Warning / Dashboard
```

---

# 51. EXECUTION ORDER

Follow this order:

1. Inspect repository.
2. Check Git status.
3. Read existing documentation.
4. Create continuation audit.
5. Identify unfinished work.
6. Start infrastructure.
7. Fix startup problems.
8. Validate migrations.
9. Validate backend.
10. Validate frontend.
11. Validate demo traffic pipeline.
12. Validate YOLO vehicle detection.
13. Validate ByteTrack.
14. Validate vehicle counting.
15. Validate traffic analytics.
16. Validate routes.
17. Validate commute briefing.
18. Validate n8n.
19. Audit pothole dataset pipeline.
20. Finish dataset tooling.
21. Validate public dataset conversion.
22. Validate Palembang frame extraction.
23. Validate annotations.
24. Validate split strategy.
25. Generate dataset stats.
26. Validate training config.
27. Run smoke training.
28. Fix training problems.
29. Run full training only if hardware/time permits.
30. Evaluate actual trained model.
31. Integrate best.pt.
32. Test pothole video inference.
33. Test GPS matching.
34. Test database integration.
35. Test dashboard integration.
36. Investigate legitimate public Palembang CCTV access if needed.
37. Integrate one real public CCTV only after demo pipeline is stable.
38. Run full automated test suite.
39. Fix failures.
40. Update documentation.
41. Produce final report.

Do not stop at planning. Actually execute commands and fix issues.

---

# 52. IMPORTANT RULES

1. Do not rebuild the entire project.
2. Continue from current repository state.
3. Preserve working components.
4. Do not invent dataset URLs.
5. Do not invent CCTV URLs.
6. Do not fabricate metrics.
7. Do not fabricate training success.
8. Do not fabricate real-time FPS.
9. Do not fabricate Palembang evaluation results.
10. Do not use LLM output as traffic ground truth.
11. Do not use unreviewed pseudo-labels as ground truth.
12. Do not mix CCTV pothole detection into this architecture.
13. Do not perform face recognition.
14. Do not perform plate identity recognition.
15. Do not identify vehicle owners.
16. Keep tracking anonymous.
17. Keep demo mode working.
18. Prefer reproducibility over unnecessary complexity.
19. Fix actual runtime errors.
20. Run tests rather than assuming code works.

---

# 53. FINAL REPORT

At the end provide:

## Repository Status
- branch
- current commit
- modified files
- untracked files

## Working Components
List everything verified working.

## Fixed
List bugs/issues fixed.

## Traffic Module
Report:
- YOLO status
- ByteTrack status
- vehicle counting status
- traffic analytics status
- current tested input source

## CCTV
Report:
- demo source status
- real Palembang CCTV status
- protocol if verified
- measured FPS if tested
- known limitations

## Dataset
Report:
- public datasets found
- datasets downloaded
- Palembang local images
- total dataset size
- train / val / test sizes
- total bounding boxes

Do not include numbers that were not measured.

## Pothole Training
Report:
- model
- pretrained weights
- device
- epochs completed
- best epoch
- Precision
- Recall
- F1
- mAP50
- mAP50-95

Only actual measured metrics.

## Palembang Test

If unavailable, say:

```text
Palembang local test set not available yet.
```

## Pothole Integration
Report:
- best.pt status
- image inference
- video inference
- GPS matching
- database save
- dashboard display

## API
List tested endpoints.

## Frontend
List verified pages.

## n8n
State workflow status.

## Telegram
State test status.

## Tests
List exact commands and actual results.

## Remaining Issues
Only genuine remaining issues.

## Exact Start Commands
Give exact commands to start:
- database
- backend
- traffic worker
- pothole worker
- frontend
- n8n

---

# 54. START NOW

Start by inspecting the repository.

Do not ask generic questions that can be answered by reading the project files.

Only ask me for information when it is genuinely external and unavailable from the repository, such as:

- Telegram token
- a private credential
- a real CCTV URL that cannot be discovered legitimately
- local Palembang training videos that have not been provided

If an external dependency is missing, continue all other implementation work.

Do not stop after creating the audit.

Continue directly into the first unfinished implementation task.

Begin now.
