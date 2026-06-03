# Test Plan

Justin Johnson – 23916760
Vincent Vu – 24237214
Eric Chen – 15405015
Ethan Nguyen – 14167608
Colin Kendall – 29706384

---

## 1.1 Scope

### ✅ In scope

| Feature | Why this matters |
|---|---|
| Tab display | Core feature that is convenient to the user; high user impact |
| Favorite a cafe | Direct user story from requirements; touches all three layers |
| Search + filter cafes | Primary discovery feature; exercises backend query logic and frontend UI |
| Block a user | Safety feature; must verify it's enforced everywhere |
| Send location notification to friends | Key social feature; touches backend fan-out + push service |
| Friend presence on cafe (who's here) | Needs real-time DB reads |

### ❌ Out of scope

| Feature | Why excluded |
|---|---|
| OS compatibility | While we planned to have our app work on multiple OS's, we do not have the time to test it all and our prototype only works locally. |
| Browser compatibility (will only test on Chrome, localhost) | While there are multiple browsers, we do not have the time to test them all. |
| Any Maps API integration | Third-party — they test their own service; we mock map data |
| APNs / FCM push delivery | Requires device registration with Apple or Google; we test notification logic, not delivery |
| Business-side cafe management portal | Stretch feature; not core to main users for now |

---

## 1.2 Quality Goals

**Correctness**
- No critical bugs in the signup, login, or cafe search flow (user can use these features without completely breaking down)
- A blocked user cannot see the blocker's location, activity, or send them messages — verified across all surfaces
- Favoriting a cafe persists correctly after logout and re-login

**Performance**
- p95 response time under 500ms for all read endpoints (cafe search, cafe tab, friend list) running locally
- Backend handles 20 concurrent users without 500-class errors
- Cafe search with filters returns results in under 1 second for a database of 50+ cafes
- Zero unhandled promise rejections or exceptions on all happy paths
- App does not crash when location permissions are denied — falls back gracefully
- No data loss on cafe favorites or group RSVPs after server restart

---

## 1.3 Risks and Priorities

| Area | Why it's risky / costly | Priority |
|---|---|---|
| Block enforcement gaps | A blocked user could still see location; safety concern and user trust | H |
| Concurrent users placing markdowns at the same time | Race condition; data corruption in location cache | H |
| Unauthorized access to other users' data via API manipulation | Security vulnerability; privacy breach | H |
| Auth tokens not expiring, not verified, or stored insecurely on the client | Security vulnerability; privacy breach | H |
| Cafe search returning duplicate results | Annoying but not harmful; easily spotted by users | M |
| Filter combinations returning no results with no feedback | Bad UX but not a data or security issue | M |
| Profile photo upload failing silently | User notices immediately; easy to retest | M |
| Cafe rating display rounding (3.666 vs 3.7) | Cosmetic; no functional impact | L |
| Long cafe names overflowing the card UI | Visual bug; recoverable | L |
| Pagination on long cafe search results | Stretch feature; mock data is small anyway | L |

---

## 1.4 Strategy

**Unit test:** checks one small, isolated piece of logic on its own — for example, verifying that the block-filtering function correctly removes a blocked user from a list, without involving the database or network.

**Integration test:** checks how multiple components work together — for example, verifying that when the frontend sends a login request, the backend correctly validates the credentials, queries the database, and returns a token.

| Component | Test types | Framework | Why this fit |
|---|---|---|---|
| React Native + Expo (Frontend) | Unit, Integration | Jest + React Native Testing Library | Jest is built into Expo by default; RNTL can test components and user interactions without a real device |
| Node.js + Express (Backend) | Unit, Integration | Jest + Supertest | Supertest can fire real HTTP requests at the Express routes without starting a live server, making API testing fast and reliable |
| PostgreSQL (Database) | Integration | Supertest + pg (test database) | Database logic is tested through the backend integration tests using a separate test database so production data is never touched |
| Cross-cutting (concurrency / block enforcement) | Integration, Load | Jest + Supertest + Artillery | Artillery simulates concurrent users for load testing; Jest covers block enforcement across all surfaces |

---

## 1.5 Environment & Assumptions

**Runtime & versions**
- Tests assume Node.js 20+ and npm 10+
- Frontend assumes Expo SDK 51+ with React Native 0.74+
- Local dev runs on Windows (Git Bash terminal)

**Database**
- Integration tests run against a separate local PostgreSQL 18 database named `cafefinder_test` — never the production `cafefinder` database
- The test database is seeded fresh before each test run and wiped after — no shared global state between tests
- Redis location cache is mocked in unit tests; a local Memurai instance is used for integration tests

**External APIs — all mocked**
- Google Maps API is stubbed — tests use hardcoded cafe coordinates instead of live map data
- APNs / FCM push delivery is mocked — tests verify the notification was triggered and the correct users were targeted, not that it physically delivered to a device
- GPS device location is mocked with a fixed coordinate (e.g. a Santa Ana cafe lat/lng)

**Test data**
- Generated fresh per run using a seed script — no manually maintained fixtures
- Seed data includes: 2 test users, 1 blocked relationship, 3 cafes, 1 group event, and 1 RSVP
- No real user emails, passwords, or location data used in tests

---

## 1.6 Team Roles (Subject to change)

| Member | Owns which test categories / components |
|---|---|
| Justin | Authentication / Security |
| Eric | Location testing |
| Colin | Block enforcements and check-in expiry |
| Vincent | Cafe filtering and searching |
| Ethan | Favorites testing |

---

## Test Implementation + Report

### 2.1 Required Minimums (subject to change)

| Category | Required? | Minimum |
|---|---|---|
| Unit tests | Block filter function · Notification recipient filter · Auth token validation · Cafe search filter logic · Check-in expiry logic | ≥ 5 tests |
| Integration tests | POST /auth/signup + login · Block enforcement end-to-end · GET /cafes with filters | ≥ 3 tests |

---

### 2.2 Tests by category (what you wrote)

Last updated: 06/02, 1:08 PM (commit 7ea6e6c)

| Category | Count | 2+ examples |
|---|---|---|
| Unit | 43 | `rating formula never produces more than one decimal place` · `calls onExpire immediately when check-in has already expired` |
| Integration | 48 | `authenticated query includes bidirectional block exclusion subquery` · `login response does not expose password_hash` |

---

### 2.3 Where the tests live + how to run them

**Location:** `inf43/cafe_app_prototype/backend`

Run commands (the TA will copy-paste these on a fresh clone):

```bash
cd cafe_app_prototype
./test.sh
```

Approximate run-times:

| Category | Time | Where it runs |
|---|---|---|
| Unit | ~0.2 s | local + CI |
| Integration | ~1 s | local + CI |

---

### 2.4 Coverage achieved

Last updated: 06/02, 1:18 PM (commit 7ea6e6c)

> Just report the number. 50%+ is fine — you're not chasing 100%. The point is that you measured it (not guessed) and can talk about the gaps.

| Test type | Tool | Coverage % |
|---|---|---|
| Unit | Jest `--coverage` | 0% of `server.js` — unit tests exercise replicated inline logic, not the source file directly |
| Integration | Jest `--coverage` | 87% statements · 90% lines of `server.js` |
| Combined (overall) | Jest `--coverage` (merged) | 87% statements · 90% lines of `server.js` |

**What's NOT covered and why:**
The uncovered ~13% of `server.js` is the `ALTER TABLE` branch inside the cafes startup callback and the `location_lat`/`location_lng` update endpoint (those columns exist in the schema but no API route writes to them). These are not tested because they require a live database and have no mock path. Unit tests don't cover source files directly as it would require database access to reach one function and `require()` calls will fail.

---

### 2.5 Plan-vs-implementation gap

| What the plan called for | What you actually shipped | What blocked you / what you'd add next |
|---|---|---|
| Notifications / check-in broadcast — WebSocket push to group members (`LOC_REQ` message type, activity log table) | Auth (register, login, JWT) | WebSocket / push notifications never implemented — HTTP polling was used instead. Can't test what doesn't exist. Implement the WebSocket server, then integration tests for connect/broadcast/disconnect |
| Server-side cafe search — `GET /api/cafes?search=cafe_name` with `ILIKE` SQL query | Favorites CRUD | Server-side search and filtering is entirely client-side (frontend JS). The architecture doc planned `GET /api/cafes?search=` but the endpoint just does `SELECT * FROM cafes` with no parameters. Add query params to the endpoint, then integration tests for each filter combination |
| Server-side filtering — `GET /api/cafes?status=open` | Block/unblock | — |
| Group system — `POST /api/groups`, group members table, invite flow, RSVP | Location visibility with block filter | Group system not built at all. Would need schema, endpoints, and both unit (invite logic) and integration (full RSVP flow) tests |
| Business profiles — cafe page creation, menu, event hosting | `GET /api/cafes` (no filters) | — |
| Friends list — implicit in notifications ("send to friends") | Frontend search + filter + sort | E2E flows — no Playwright / Detox setup. The plan implied full flows: register → check-in → appear on map → get blocked → disappear. We have each piece tested in isolation but never stitched into one test |
| Reviews / markdown — user-authored reviews tied to cafe location | Check-in expiry | React Native component rendering — `jest-expo` / `@testing-library/react-native` not configured. Any test that needs to render `<CafeMap>`, `<ProfileScreen>`, etc. and assert on what the user sees |
| Reporting — report log → suspension/removal pipeline | Profile photo upload | Business features, reviews, reporting not built. Would need schema + endpoints before any tests are meaningful |
| Blocking (full spec) — block removes location AND chat from both sides, blocks RSVP on events | — | — |

---

## Part 3 — Reflection

**1. What did your tests catch that you missed before?**

`profile-upload.test.js` confirmed a real existing bug: `pickPhoto` in `profile.tsx` has no `try/catch` around `AsyncStorage.setItem`. The test "storage failure propagates as unhandled rejection" shows that if the device runs out of storage mid-upload, the function throws silently — the photo appears to change on screen but is never saved. The user closes the app, reopens it, and the photo is gone with no error shown. The test documents the gap without patching it, which is the right call since the fix belongs in the component.

**2. What was hardest to test, and why?**

Frontend React Native components. `cafe-map.web.tsx`, `profile.tsx`, and the location context all depend on APIs (`AsyncStorage`, `expo-location`, `ImagePicker`, Leaflet) that do not exist in Node.js. There is no way to import these files in Jest without either mocking every React Native dependency or setting up `jest-expo`, which was out of scope. The only workable path was extracting pure logic into separate files and testing those in isolation, which meant the tests cover the logic but not the component wiring.

**3. What test would you add next?**

A stitched end-to-end flow: user A registers → enables location → appears in user B's location query → user B blocks user A → user A no longer appears. Every individual piece of this is tested in isolation but never as a chain. That is exactly where integration bugs hide.

**4. Where did Claude help — and where did it get things wrong?**

Claude did well setting up the mock infrastructure — the `pg` manual mock handling both callback and promise styles, dotenv suppression, the JWT test secret — and generating edge cases like expired check-ins on cold launch and the bidirectional block SQL subquery check that the plan had specified but was never verified.

The main mistake was writing the first batch of unit tests with functions replicated inline instead of imported from source. Those tests pass regardless of what changes in the actual code, which defeats the purpose. Claude identified this problem itself but only after being asked directly.
