# Doctor Booking System — Backend

Node.js + Express + PostgreSQL + Sequelize backend implementing:

- JWT authentication, role-based access (`ADMIN`, `USER`)
- Admin-configurable clinic timezone
- Doctor management, weekly availability, breaks/leave
- Timezone-safe slot generation and booking
- Race-condition-proof double-booking prevention (transactions + row locks + DB unique index + DB exclusion constraint)
- Security hardening: rate limiting, strict validation, pinned JWT algorithm, no internal error leakage
- Swagger / OpenAPI 3 docs at `/api-docs`, and an automated test suite (`npm test`)

---

## Quick start (for reviewers)

Requires Node.js 18+ and Docker.

```bash
git clone <this-repo-url>
cd doctor-booking-backend
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run seed
npm run dev
```

- **Swagger UI:** http://localhost:5000/api-docs
- **Demo admin:** `admin@clinic.com` / `Admin@123` (register a patient via `POST /api/auth/register`)
- **Tests:** `npm test` (28 tests: auth, roles, timezones, slots, concurrent double-booking)
- **Docs without running anything:** open [`docs/openapi.json`](docs/openapi.json) in https://editor.swagger.io (File, then Import file)

---

## 1. Project layout

```
doctor-booking-backend/
├── server.js                 # entry point
├── docker-compose.yml        # spins up PostgreSQL only
├── .env.example              # copy to .env
├── .sequelizerc              # tells sequelize-cli where things live
└── src/
    ├── app.js                # express app (middleware + routes)
    ├── config/config.js      # sequelize-cli DB config (reads .env)
    ├── models/               # Sequelize models
    ├── migrations/           # DB schema, run in order
    ├── seeders/               # seed admin user + default clinic timezone
    ├── middlewares/          # auth, role guard, validation, error handler
    ├── validators/           # express-validator rule sets
    ├── services/             # slot generation + booking transaction logic
    ├── controllers/          # request handlers
    └── routes/               # route definitions
```

---

## 2. Prerequisites

- **Node.js 18+** and npm — check with `node -v`
- **PostgreSQL** — since you don't have it yet, the easiest path is **Docker** (Step 3, Option A). If you'd rather not use Docker, Option B below installs it natively.

---

## 3. Get PostgreSQL running

### Option A — Docker (recommended, easiest)

1. Install Docker Desktop if you don't have it: https://www.docker.com/products/docker-desktop/
2. From the project folder, run:
   ```bash
   docker compose up -d
   ```
   This starts a PostgreSQL 16 container with:
   - user: `postgres`
   - password: `postgres`
   - database: `doctor_booking`
   - port: `5432`
3. Check it's healthy:
   ```bash
   docker compose ps
   ```
   You should see `doctor_booking_postgres` as `healthy`/`running`.

That's it — skip to Step 4. (To stop it later: `docker compose down`. To wipe data too: `docker compose down -v`.)

### Option B — Install PostgreSQL natively

- **Windows**: download the installer from https://www.postgresql.org/download/windows/, run it, and remember the password you set for the `postgres` user.
- **macOS**: `brew install postgresql@16 && brew services start postgresql@16`
- **Linux (Debian/Ubuntu)**: `sudo apt update && sudo apt install postgresql postgresql-contrib`

Then create the database and (if needed) set a password:
```bash
sudo -u postgres psql
```
```sql
ALTER USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE doctor_booking;
\q
```

---

## 4. Configure the project

```bash
cd doctor-booking-backend
cp .env.example .env
npm install
```

Open `.env` and adjust if your DB credentials differ from the defaults (they match Option A above out of the box):

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=doctor_booking
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=change_this_to_a_long_random_secret_string
```

> If you used Option B and picked a different password/DB name, update `.env` to match.

---

## 5. Create tables and seed data

```bash
npm run migrate   # creates all tables, indexes and DB-level integrity constraints
npm run seed       # creates an admin user + default clinic timezone (Asia/Kolkata)
```

Seeded admin login:
```
email:    admin@clinic.com
password: Admin@123
```

(Change this password after first login, or edit the seeder before running it.)

---

## 6. Run the server

```bash
npm run dev     # nodemon, auto-restarts on changes
# or
npm start
```

You should see:
```
Database connection established successfully.
Server running on http://localhost:5000
```

Check it's alive: `GET http://localhost:5000/health`

**API docs (Swagger UI):** http://localhost:5000/api-docs. Log in via `POST /api/auth/login`, click **Authorize** and paste the token.
The raw OpenAPI 3 spec is at http://localhost:5000/api-docs.json (you can import it into Postman). The spec lives in `src/docs/swagger.js`, so update it whenever you change routes.

---

## 7. API walkthrough

All endpoints are prefixed with `/api`. Protected routes need `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Always creates a `USER` |
| POST | `/api/auth/login` | Public | Returns JWT |
| GET | `/api/auth/me` | Any authenticated user | |

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"Admin@123"}'
```

### Admin — clinic settings
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/clinic-settings` | |
| PUT | `/api/admin/clinic-settings` | body: `{ "timezone": "America/New_York" }` (any IANA name) |

### Admin — doctors
| Method | Endpoint |
|---|---|
| GET / POST | `/api/admin/doctors` |
| GET / PUT / DELETE | `/api/admin/doctors/:doctorId` (DELETE soft-deactivates) |

```bash
curl -X POST http://localhost:5000/api/admin/doctors \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"Dr. Asha Menon","specialization":"Cardiology"}'
```

### Admin — doctor availability (recurring weekly schedule)
| Method | Endpoint |
|---|---|
| GET / POST | `/api/admin/doctors/:doctorId/availability` |
| PUT / DELETE | `/api/admin/availability/:availabilityId` |

`dayOfWeek`: `0` = Sunday … `6` = Saturday. Times are **clinic-local** wall-clock times. Overlapping active windows for the same doctor and day are rejected with `409`.

```bash
curl -X POST http://localhost:5000/api/admin/doctors/1/availability \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"dayOfWeek":1,"startTime":"09:00","endTime":"13:00","slotDurationMinutes":30}'
```

### Admin — breaks / leave
| Method | Endpoint |
|---|---|
| GET / POST | `/api/admin/doctors/:doctorId/unavailability` |
| DELETE | `/api/admin/unavailability/:unavailabilityId` |

`startAt` / `endAt` are ISO 8601 datetimes that **must include an offset** (`Z` or `+05:30`); stored as UTC. Existing bookings inside the period are not auto-cancelled; the response lists them in `conflictingAppointments`. `GET` returns current/future entries; add `?includePast=true` for history.

```bash
curl -X POST http://localhost:5000/api/admin/doctors/1/unavailability \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"startAt":"2026-10-01T12:00:00+05:30","endAt":"2026-10-01T13:00:00+05:30","type":"BREAK","reason":"Lunch"}'
```

### Doctors & slots (any authenticated user)
| Method | Endpoint |
|---|---|
| GET | `/api/doctors` |
| GET | `/api/doctors/:doctorId/slots?date=2026-10-01` |

`date` is interpreted as a clinic-local calendar date. Returned slot `startTime`/`endTime` are UTC ISO strings — render them in the viewer's own timezone on the frontend.

### Appointments (USER books; either party can cancel)
| Method | Endpoint |
|---|---|
| POST | `/api/appointments` — body: `{ "doctorId": 1, "startTime": "<one of the slot startTime values>" }` |
| GET | `/api/appointments/me?page=&limit=&status=` |
| DELETE | `/api/appointments/:appointmentId` (users: own future appointments only) |

### Admin — appointments
| Method | Endpoint |
|---|---|
| GET | `/api/admin/appointments?doctorId=&status=&from=&to=&page=&limit=` |

List endpoints are paginated (`page`, `limit` ≤ 100) and return `meta: { page, limit, total, totalPages }`.

```bash
curl -X POST http://localhost:5000/api/appointments \
  -H "Authorization: Bearer <USER_TOKEN>" -H "Content-Type: application/json" \
  -d '{"doctorId":1,"startTime":"2026-10-01T03:30:00.000Z"}'
```

---

## 8. Design notes

**Timezone handling.** The clinic's IANA timezone (e.g. `Asia/Kolkata`) is the single source of truth for what a doctor's `09:00–13:00` availability *means*. Availability windows are stored as clinic-local wall-clock times; breaks/leave and appointments are stored as absolute UTC timestamps (`timestamptz` under the hood). The slot-generation service converts availability windows into UTC instants for the requested date using [luxon](https://moment.github.io/luxon/), so a slot is always returned as an unambiguous UTC ISO string — the frontend/client converts it to whatever timezone the viewer is in. This avoids the classic bug of storing "9 AM" without saying in which timezone.

**Preventing double booking.** Layers, from optimistic to absolute:
1. `GET /doctors/:id/slots` computes availability minus breaks/leave minus existing bookings, so clients normally never even see a taken slot.
2. The booking endpoint only accepts a start time that is a currently available generated slot (resolved on the slot's **clinic-local** date) and derives the end time server-side.
3. Booking runs inside a `READ COMMITTED` transaction that locks the doctor row (`SELECT … FOR UPDATE`) and re-checks for conflicts before inserting, so concurrent requests for the same doctor are serialized while bookings for different doctors run in parallel.
4. A **partial unique index** on `(doctor_id, start_time) WHERE status = 'BOOKED'` and an **exclusion constraint** (`btree_gist`, `tstzrange(start_time, end_time) &&`) make it impossible for Postgres to hold two overlapping `BOOKED` appointments for a doctor, even across many server instances or if the app logic is bypassed. Violations become a clean `409 Conflict`.

The test suite fires 10 simultaneous bookings for the same slot and asserts exactly one `201` and nine `409`s.

**Security.** Passwords are bcrypt-hashed (8–72 chars, letter + digit) and never returned; login takes constant time whether or not the email exists; JWTs are HS256-pinned and the user/role is re-loaded from the DB on every request; public registration can never create an admin; all ids, bodies and query params are validated (422); JSON bodies are capped at 10kb; `/api` is rate limited (300 req/15 min/IP, 20 for login/register); CORS can be restricted with `CORS_ORIGIN`; 5xx errors never expose internal messages. In production the server refuses to start with a weak `JWT_SECRET`.

**Scalability.** The API is stateless (JWT), so it can run as multiple instances behind a load balancer; double-booking safety is enforced by Postgres, not process memory. Hot queries are indexed, list endpoints are paginated, the DB pool is configurable (`DB_POOL_MAX`), and the server shuts down gracefully on `SIGTERM`. For multi-instance deployments, switch the rate limiter to a shared store (e.g. Redis) and set `TRUST_PROXY`.

**Roles.** `ADMIN` manages clinic settings, doctors, availability, and unavailability. `USER` browses doctors/slots and books/cancels their own appointments. Admins can also cancel any appointment.

---

## 9. Useful commands

```bash
npm run docs:export        # regenerate docs/openapi.json after changing the spec
npm run lint               # ESLint (npm run lint:fix to auto-fix)
npm test                   # full test suite against a separate <DB_NAME>_test database (created automatically)
npm run migrate:undo       # roll back the last migration
npm run migrate:undo:all   # roll back everything
npm run seed:undo          # remove seeded data
npm run db:create          # create the DB via sequelize-cli (alternative to psql)
npm run db:drop            # drop the DB
```

### Git hooks (Husky)

Installed automatically by `npm install` (via the `prepare` script):

- **pre-commit**: runs ESLint (with --fix) on staged .js files via lint-staged; the commit is blocked on any error or warning.
- **pre-push**: runs the full test suite (`npm test`); the push is blocked if a test fails. Postgres must be running.

In an emergency you can bypass with `--no-verify`, but CI should run the same checks.

## 10. Troubleshooting

- **`ECONNREFUSED` on startup** → Postgres isn't running or `.env` credentials/port don't match. If using Docker, run `docker compose ps` / `docker compose logs postgres`.
- **`password authentication failed`** → `DB_USER`/`DB_PASSWORD` in `.env` don't match Postgres.
- **`relation "users" does not exist`** → you haven't run `npm run migrate` yet.
- **Port 5432 already in use** → you likely already have Postgres running locally; either stop it or change the port mapping in `docker-compose.yml` and `.env`.
