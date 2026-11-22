# OnTrack Project Intelligence

OnTrack is a rule-based project intelligence application for monitoring a project portfolio, assessing project health, tracing findings to source evidence, and tracking recommended follow-up actions.

The application is delivered as a Dockerized modular monolith:

- Next.js frontend
- NestJS REST API
- PostgreSQL database
- Prisma ORM

## 1. Business Interpretation

### Business Objective

The system helps directors and project managers answer:

1. What is happening across the project portfolio?
2. Which projects need attention?
3. Why is a project considered healthy or at risk?
4. Which source update or production record supports a finding?
5. What information is missing or stale?
6. What action is recommended, who should own it, and by when?

The intended information flow is:

```text
SOURCE
  -> PROJECT CONTEXT
  -> EVIDENCE
  -> RULE-BASED INTERPRETATION
  -> ATTENTION STATUS
  -> FOLLOW-UP ACTION
```

### Portfolio Interpretation

The portfolio page combines:

- Project master data
- Latest stored assessment
- Highest finding severity
- Reported progress and status
- Project deadline and last update

A project that has not been assessed is distinguished from a project with an `INSUFFICIENT_DATA` result.

### Assessment Interpretation

An assessment evaluates five dimensions:

| Dimension | Interpretation |
|---|---|
| Schedule Health | Deadline, elapsed timeline, progress against timeline, update freshness |
| Progress Health | Reported percentage, invalid values, stalled progress indicators |
| Operational Health | Incidents, uptime, response time, error rate, deployment health |
| Evidence Health | Completeness and freshness of project evidence |
| Data Quality | Quality of evidence inputs used by the assessment |

Health statuses are:

- `HEALTHY`: no material problem was identified.
- `AT_RISK`: risk exists and monitoring or corrective action is advisable.
- `NEEDS_ATTENTION`: serious attention or immediate action is indicated.
- `INSUFFICIENT_DATA`: available evidence is insufficient to make a reliable conclusion.

`INSUFFICIENT_DATA` does not mean that the project is failing. It means the assessment cannot be made confidently.

### Findings

Every finding contains:

- Category
- Title
- Description
- Severity
- Confidence
- Reasoning
- Impact
- Recommended action
- Evidence IDs when available

Severity values are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`.

Finding severity and confidence are independent:

- Severity describes the seriousness of the observed issue.
- Confidence describes certainty based on available evidence.

### Follow-ups

Only `CRITICAL` and `HIGH` findings are created as automated follow-ups. Follow-ups receive an owner suggestion and due date based on finding category and severity. Resolving or closing a follow-up does not mean the underlying project problem was resolved.

## 2. System Architecture

```text
Browser / Next.js
      |
      | REST API
      v
NestJS API
  |-- Projects
  |-- Imports
  |-- Evidence
  |-- Intelligence
  |-- Follow-ups
      |
      v
Prisma ORM
      |
      v
PostgreSQL
```

### Backend Modules

| Module | Responsibility |
|---|---|
| Projects | Project master data |
| Imports | CSV/JSON ingestion, import batches, idempotency |
| Evidence | Project updates and production records |
| Intelligence | Health calculators, aggregation, findings, follow-up generation |
| Follow-ups | Create, update, list, and audit follow-ups |

### Database Entities

- `projects`
- `project_updates`
- `production_records`
- `import_batches`
- `project_assessments`
- `project_findings`
- `follow_ups`
- `follow_up_history`

The database schema is maintained in [backend/prisma/schema.prisma](backend/prisma/schema.prisma).

## 3. Data Flow

### Import Flow

```text
CSV/JSON file
  -> multipart upload
  -> NestJS imports controller
  -> parser and source validation
  -> import batch tracking
  -> project/evidence upsert
  -> completed or failed import result
```

Import matching uses source identifiers:

- Project: `projectId`
- Project update: `updateId`
- Production record: `sourceRecordId`

Repeated imports do not create duplicate source records.

### Assessment Flow

```text
User presses Run assessment
  -> gather project and evidence
  -> calculate schedule health
  -> calculate progress health
  -> calculate operational health
  -> calculate evidence health
  -> calculate data quality
  -> aggregate overall status and confidence
  -> prioritize findings
  -> persist assessment and findings
  -> create CRITICAL/HIGH follow-ups
```

The assessment engine is rule-based and deterministic. It does not use machine learning or an AI/LLM model.

### Rule Summary

| Dimension | Key Rules |
|---|---|
| Schedule | Deadline passed, deadline under 14 days, progress lag over 5%, stale/no updates |
| Progress | Missing/invalid progress, 0%, below 25%, 75%+, and stall keywords |
| Operational | Incident severity/count, uptime, response time, error rate, deployment failures |
| Evidence | Completeness, update freshness, and number of updates |
| Data Quality | Uses the Evidence Health result and relabels its findings as `DATA_QUALITY` |

### Overall Status

The overall status follows the highest-severity condition:

```text
NEEDS_ATTENTION > AT_RISK > HEALTHY
INSUFFICIENT_DATA is used when no assessable dimension remains
```

An `INSUFFICIENT_DATA` dimension is excluded while another dimension can be assessed.

Overall confidence uses the lowest/most conservative confidence among the dimensions:

```text
LOW
  if any dimension is LOW
MEDIUM
  if no LOW and any dimension is MEDIUM
HIGH
  if all dimensions are HIGH
```

### Follow-up History

When status changes, the backend stores:

- Previous status
- New status
- Change timestamp
- Optional changed-by value
- Notes/reason

Changing status requires a non-empty `notes` value.

## 4. API

The API prefix is `/api/v1`.

### Projects

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/projects` | List projects |
| `GET` | `/projects/:projectId` | Get one project |

### Imports

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/imports/project-master` | Upload project master CSV |
| `POST` | `/imports/project-updates` | Upload project updates CSV |
| `POST` | `/imports/production-data` | Upload production JSON |
| `POST` | `/imports/data-dictionary` | Upload data dictionary PDF |
| `GET` | `/imports/history?limit=50` | Read import batches |

All file endpoints accept multipart form field `file`.

Example:

```bash
curl -F "file=@02_Project_Master.csv" \
  http://localhost:3001/api/v1/imports/project-master
```

### Evidence

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/evidence/project/:projectId` | Get project updates and production records |

### Intelligence

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/intelligence/assess/:projectId` | Run an assessment |
| `GET` | `/intelligence/assessment/:projectId` | Get latest assessment |
| `GET` | `/intelligence/history/:projectId?limit=10` | Get assessment history |
| `GET` | `/intelligence/followups/:projectId` | Get open follow-up recommendations |
| `GET` | `/intelligence/dashboard/summary` | Get portfolio summary |

Optional assessment body:

```json
{
  "asOfDate": "2026-10-06T17:00:00.000Z"
}
```

When `asOfDate` is omitted, the backend uses the assessment execution time. Some calculators currently use the actual current date rather than `asOfDate`.

### Follow-ups

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/follow-ups` | List all follow-ups |
| `GET` | `/follow-ups/project/:projectId` | List follow-ups for a project |
| `POST` | `/follow-ups` | Create a follow-up manually |
| `GET` | `/follow-ups/:id/history` | Get status history |
| `PATCH` | `/follow-ups/:id` | Update status, owner, or due date |
| `PUT` | `/follow-ups/:id` | Replace-compatible update |

Status change example:

```json
{
  "status": "IN_PROGRESS",
  "owner": "Project Manager",
  "dueDate": "2026-11-30T00:00:00.000Z",
  "changedBy": "Director",
  "notes": "Owner has confirmed an investigation plan."
}
```

## 5. Docker Setup

Start all services:

```bash
docker compose up -d --build
```

Stop services:

```bash
docker compose down
```

Service URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/v1`
- PostgreSQL: `localhost:5432`

## 6. Assumptions

1. `projectId`, `updateId`, and `sourceRecordId` are stable source identifiers.
2. Project master is the primary context source.
3. Project updates represent schedule/progress reporting evidence.
4. Production records represent operational evidence.
5. Missing evidence means uncertainty, not proof of failure.
6. Reported project status is source data and is not assumed to be correct.
7. Resolving a follow-up does not verify that the underlying project issue is resolved.
8. Dates use ISO 8601 values and are interpreted in UTC unless application-specific timezone handling is added.

## 7. Known Limitations

1. Assessment `asOfDate` is not yet used consistently by every calculator.
2. Schedule and Evidence calculations currently compare against the actual execution time instead of `asOfDate`.
3. The UI and API do not require authentication or authorization.
4. The weighted score and thresholds defined in `AssessmentScoringService` are not currently used for the final overall status; status aggregation uses severity priority.
5. Data Quality currently duplicates Evidence Health rather than performing independent deep validation.
6. Production JSON record types outside `DEPLOYMENT`, `INCIDENT`, and `PERFORMANCE` are stored as `CUSTOM`; this may prevent specialized operational rules from triggering.
7. Progress stall detection is keyword-based and can create false positives or miss paraphrased issues.
8. Evidence linking is incomplete for some findings that do not associate update or record IDs.
9. Assessment uniqueness is project plus `asOfDate`; multiple assessments can be created if supplied values differ.
10. Follow-up status change notes are required by backend, but changed-by is not automatically tied to an authenticated user.
11. There is no notification or scheduled follow-up escalation workflow.
12. The frontend is designed for operational use but has no formal role-based UI restrictions.
13. Data dictionary upload support exists, but field interpretation is not yet used as a configurable rule metadata source.

## 8. Next Steps

Recommended improvements:

1. Make `asOfDate` a true calculation reference date.
2. Apply configurable weighted scores and dimension thresholds consistently.
3. Separate Data Quality rules from Evidence Freshness rules.
4. Normalize production record types and payload schemas.
5. Add rule-code fields to findings so findings are not identified only by category/title.
6. Add evidence quality scores and more explicit source provenance.
7. Add authentication, authorization, and audit identity.
8. Add scheduled notifications and overdue follow-up escalation.
9. Add PDF/CSV report export.
10. Add assessment rule configuration by project type or organization.
11. Add full automated integration tests for imports, assessments, follow-ups, and history.
12. Improve re-import behavior and conflict reporting for conflicting source data.

## 9. Verification

Backend:

```bash
cd backend
npm run build
npm test
```

Frontend:

```bash
cd frontend
npm run build
```

Docker:

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

## 10. Current Fixture Import

The fixture files are under [backend/test/fixtures](backend/test/fixtures):

- `02_Project_Master.csv`
- `03_Project_Updates.csv`
- `04_Production_Data.json`

These fixtures contain source data for project context and evidence. They do not by themselves create assessments or follow-ups. Run an assessment for each project to create assessed results.
