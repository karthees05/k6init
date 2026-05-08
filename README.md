# K6 TypeScript API Performance Framework

This project is a K6-based TypeScript framework for API performance testing. It uses the public JSONPlaceholder API as a sample target and supports parameterized environments, base URL overrides, reusable API journeys, multiple load profiles, and GitHub Actions execution.

## Features

- TypeScript source with `npm run build` bundling to runnable K6 JavaScript
- Parameterized environment selection with `ENV` and optional `BASE_URL` override
- Configurable load profiles: `fixed`, `ramp-up`, `spike`, `peak`
- Configurable virtual users with `USERS`
- Configurable initial users for ramping profiles with `INITIAL_USERS`
- Configurable duration with `DURATION_SECONDS`
- Reusable K6 load-profile helpers
- Reusable API journey methods for `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`
- Scenario structure based on a user journey instead of isolated single requests
- HTML and JSON reports after each K6 run
- GitHub Actions workflow for build, K6 execution, and report artifact upload

## Project Structure

- `src/config`: environment and runtime parameter handling
- `src/core`: load-profile generation
- `src/journeys`: reusable API user journeys
- `src/simulations`: runnable K6 simulations
- `.github/workflows/k6-performance.yml`: CI build and execution workflow
- `dist`: generated JavaScript bundle after `npm run build`

## Environment Configuration

Default environments are configured in `src/config/environments.ts`:

```ts
dev.baseUrl = 'https://jsonplaceholder.typicode.com';
qa.baseUrl = 'https://jsonplaceholder.typicode.com';
prod.baseUrl = 'https://jsonplaceholder.typicode.com';
```

You can override the URL at runtime with `-e BASE_URL=https://example.com`.

## Install

```bash
npm install
```

K6 must also be installed locally to execute tests:

```bash
brew install k6
```

## Build

```bash
npm run build
```

The runnable K6 bundle is generated at:

```bash
dist/jsonPlaceholderSimulation.js
```

## Profile Commands

Interactive local runner. This asks only for the parameters needed by the selected profile:

```bash
npm run run:local
```

Smoke test:

```bash
npm run smokeTest
```

Ramp-up profile:

```bash
npm run rampTest
```

Spike profile:

```bash
npm run spikeTest
```

Peak profile:

```bash
npm run peakTest
```

## Example Commands

Build only:

```bash
npm run build
```

Smoke test with defaults:

```bash
npm run smokeTest
```

Direct K6 run with custom environment and duration:

```bash
npm run build
k6 run dist/jsonPlaceholderSimulation.js \
  -e ENV=qa \
  -e LOAD_PROFILE=fixed \
  -e USERS=5 \
  -e DURATION_SECONDS=30
```

Ramp-up with custom users and duration:

```bash
k6 run dist/jsonPlaceholderSimulation.js \
  -e ENV=qa \
  -e LOAD_PROFILE=ramp-up \
  -e INITIAL_USERS=5 \
  -e USERS=50 \
  -e DURATION_SECONDS=180
```

Spike with higher load:

```bash
k6 run dist/jsonPlaceholderSimulation.js \
  -e ENV=prod \
  -e LOAD_PROFILE=spike \
  -e INITIAL_USERS=5 \
  -e USERS=100 \
  -e DURATION_SECONDS=120
```

Peak with a controlled rise and fall:

```bash
k6 run dist/jsonPlaceholderSimulation.js \
  -e ENV=prod \
  -e LOAD_PROFILE=peak \
  -e INITIAL_USERS=10 \
  -e USERS=80 \
  -e DURATION_SECONDS=240
```

Override the target API:

```bash
k6 run dist/jsonPlaceholderSimulation.js \
  -e BASE_URL=https://jsonplaceholder.typicode.com \
  -e LOAD_PROFILE=fixed \
  -e USERS=10 \
  -e DURATION_SECONDS=60
```

## Load Profile Semantics

- `fixed`: keeps the requested number of virtual users constant for the whole test
- `ramp-up`: starts at `INITIAL_USERS` and ramps to `USERS` during the whole test
- `spike`: starts at `INITIAL_USERS`, surges quickly to `USERS`, holds, then ramps back to `INITIAL_USERS`
- `peak`: starts at `INITIAL_USERS`, ramps to `USERS`, sustains the peak, then ramps back to `INITIAL_USERS`

For `fixed`, `USERS` is the constant virtual user count and `INITIAL_USERS` is ignored. For `ramp-up`, `spike`, and `peak`, `INITIAL_USERS` is the starting load and `USERS` is the target or peak load.

## API Journey

The sample journey in `src/journeys/apiJourneys.ts` exercises JSONPlaceholder as a realistic CRUD-style flow:

1. `GET /posts`
2. `GET /posts/{id}`
3. `GET /posts/{id}/comments`
4. `POST /posts`
5. `PUT /posts/{id}`
6. `PATCH /posts/{id}`
7. `DELETE /posts/{id}`

JSONPlaceholder is a fake public API, so create, update, patch, and delete requests return successful responses without permanently changing server data.

## Reusing This Framework For Your APIs

To adapt this framework for a real API:

1. Replace the sample endpoints in `src/journeys/apiJourneys.ts`
2. Add authentication headers or token handling in the journey helpers
3. Add realistic request bodies and business validations
4. Tune thresholds in `src/core/loadProfiles.ts`
5. Create separate journeys for business flows such as login, search, checkout, booking, order tracking, or profile updates

## HTML Report

Every K6 run writes these files in the repository root:

```bash
k6-summary.html
k6-summary.json
```

Open `k6-summary.html` in a browser for a Gatling-style static report with headline metrics, thresholds, checks, and HTTP metric tables.

Example:

```bash
npm run build
k6 run dist/jsonPlaceholderSimulation.js -e USERS=5 -e DURATION_SECONDS=30
open k6-summary.html
```

In GitHub Actions, download the artifact named `k6-reports` from the workflow run. It contains both `k6-summary.html` and `k6-summary.json`.

## Reports And Metrics

Every run writes a K6 summary to stdout, `k6-summary.html`, and `k6-summary.json`.

Useful metrics to review:

- Total request count
- Success and failure percentages
- Throughput in requests per second
- Min, max, mean, p50, p90, p95, and p99 response times
- Error distribution and failed checks
- Active users versus response time under each load profile

For long-running or management-facing reporting, connect the same suite to Grafana Cloud k6 from the GitHub Actions workflow.

## GitHub Actions

The workflow at `.github/workflows/k6-performance.yml` runs on pushes to `main`, pull requests, and manual dispatch.

Manual workflow inputs:

- `environment`: `dev`, `qa`, or `prod`
- `load_profile`: `fixed`, `ramp-up`, `spike`, or `peak`
- `users`: fixed users for `fixed`, or target/peak users for `ramp-up`, `spike`, and `peak`
- `initial_users`: starting users for `ramp-up`, `spike`, and `peak`; ignored by `fixed`
- `duration_seconds`: test duration
- `base_url`: optional target URL override

The workflow installs dependencies with `npm ci`, builds the TypeScript suite with `npm run build`, installs K6 using `grafana/setup-k6-action@v1`, runs the bundled simulation with `grafana/run-k6-action@v1`, and uploads `k6-summary.html` plus `k6-summary.json` as the `k6-reports` artifact.

## Notes

- JSONPlaceholder is a public fake REST API intended for demos and testing: https://jsonplaceholder.typicode.com/guide
- Local execution requires K6 to be installed.
- CI execution installs K6 automatically through GitHub Actions.
