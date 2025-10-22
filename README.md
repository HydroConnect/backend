# Hydroconnect API

Hydroconnect API provides both **REST** and **Socket.IO (IO)** endpoints for interacting with IoT devices and retrieving sensor data.
The system is designed with **versioned endpoints**, **independent versioning for REST and IO**, and **chunk-based data streaming** for efficient data transfer.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [API Versioning](#api-versioning)
4. [Data Schemas](#data-schemas)
5. [REST API](#rest-api)
6. [Socket.IO API](#socketio-api)
7. [Environment Configuration](#environment-configuration)
8. [Testing](#testing)
9. [Development](#development)
10. [Error Handling](#error-handling)
11. [License](#license)

---

## Overview

The Hydroconnect API serves as a bridge between IoT devices and clients.
It enables:

-   IoT devices to push sensor readings in real time.
-   Clients to download summarized data and request historical reports.
-   Chunked and asynchronous data streaming for large downloads.

---

Here’s a **clean and professional Markdown** documentation for your folder structure, including explanations and developer-oriented remarks that match your current project setup and intent:

---

## Project Structure

The following is the directory structure for the **Hydroconnect API** project.
Each folder and file serves a distinct purpose in organizing REST endpoints, Socket.IO logic, schema definitions, and build output.

```
Hydroconnect-API/
│
├── controllers/
│   ├── io.ts                  # Handles Socket.IO events and real-time operations
│   └── rest.ts                # Handles REST API routes and HTTP logic
│
├── dist/                      # Compiled output (TypeScript build artifacts)
│
├── lib/                       # Utility modules or shared library code
│
├── node_modules/              # Project dependencies
│
├── public/                    # Publicly served assets (if any)
│
├── schemas/                   # All Zod schema definitions
│   └── models/
│
├── tests/                     # Unit and integration test cases
│
├── .d.env                     # Example environment file for development
├── .env                       # Environment configuration (ignored in version control)
│
├── .gitignore                 # Git ignore rules
├── .prettierrc                # Code formatting configuration
├── .eslintrc.ts               # ESLint configuration for linting
│
├── package.json               # Project metadata and dependencies
├── package-lock.json          # Dependency lock file
│
├── README.md                  # Project documentation
│
├── server.ts                  # Main entry point (initializes Express and Socket.IO servers)
│
├── tsconfig.json              # TypeScript configuration
└── vitest.config.ts           # Vitest configuration for testing
```

---

## API Versioning

Hydroconnect uses **independent versioning** for REST and IO routes.

| Category | Prefix             | Current Version | Example Path                   |
| -------- | ------------------ | --------------- | ------------------------------ |
| REST     | `/rest/{version}/` | `v1`            | `/rest/v1/summary`             |
| IO       | `/io/{version}/`   | `v1`            | `/io/v1` (Socket.IO namespace) |

Versioning ensures backward compatibility for both REST and Socket.IO interfaces.

---

## Data Schemas

All data models are validated using **Zod**.
The following strict schema definitions apply to all REST and Socket.IO interactions.

### `DownloadRequest`

Schema for requesting report downloads.

```ts
DownloadRequest = z.strictObject({
    from: z.iso.datetime(), // ISO string
    to: z.iso.datetime(), // ISO string
    downloadId: z.string().max(parseInt(process.env.MAX_DOWNLOAD_ID_LENGTH!)).min(1), // string
});
```

**Fields:**

| Field        | Type           | Description                                                                                 |
| ------------ | -------------- | ------------------------------------------------------------------------------------------- |
| `from`       | `ISO datetime` | Start date of the report range.                                                             |
| `to`         | `ISO datetime` | End date of the report range.                                                               |
| `downloadId` | `string`       | Unique identifier for the download request. Length constrained by `MAX_DOWNLOAD_ID_LENGTH`. |

---

### `Readings`

Schema representing IoT sensor readings.

```ts
Readings = z.strictObject({
    turbidity: z.number(), // number
    pH: z.number(), // number
    tds: z.number(), // number
    temperature: z.number(), // number
    percent: z.number(), // number
    timestamp: z.iso.datetime(), // ISO string
});
```

**Fields:**

| Field         | Type           | Description                                       |
| ------------- | -------------- | ------------------------------------------------- |
| `turbidity`   | `number`       | Turbidity level of the water.                     |
| `pH`          | `number`       | pH level of the water.                            |
| `tds`         | `number`       | Total dissolved solids (ppm).                     |
| `temperature` | `number`       | Temperature in Celsius.                           |
| `percent`     | `number`       | Sensor reading percentage (used for calibration). |
| `timestamp`   | `ISO datetime` | Timestamp of the reading.                         |

---

### `Summaries`

Schema representing summary data derived from readings.

```ts
Summaries = z.strictObject({
    min: Readings, // Readings
    max: Readings, // Readings
    timestamp: z.iso.datetime(), // ISO string
});
```

**Fields:**

| Field       | Type           | Description                              |
| ----------- | -------------- | ---------------------------------------- |
| `min`       | `Readings`     | Minimum recorded readings.               |
| `max`       | `Readings`     | Maximum recorded readings.               |
| `timestamp` | `ISO datetime` | Timestamp when the summary was computed. |

---

## REST API

### Base URL

```
/rest/v1/
```

### Endpoints

#### `GET /summary`

**Description:**
Retrieves the latest summary of readings and statistics.

**Response:**

```json
[
    {
        "min": {
            "turbidity": 0.12,
            "pH": 6.8,
            "tds": 220,
            "temperature": 27.1,
            "percent": 43.2,
            "timestamp": "2025-10-22T01:23:54.533Z"
        },
        "max": {
            "turbidity": 0.85,
            "pH": 7.5,
            "tds": 310,
            "temperature": 29.0,
            "percent": 99.0,
            "timestamp": "2025-10-22T01:25:54.533Z"
        },
        "timestamp": "2025-10-22T01:26:00.000Z"
    }
]
```

**Response Type:**
`Summaries[]`

---

## Socket.IO API

### Namespace

```
/io/v1
```

### Socket Events

#### `Socket.on("post-readings")`

**Description:**
Used by IoT devices to send readings data to the server.

**Input:**
`Readings`

---

#### `Socket.on("download-request")`

**Description:**
Triggered by clients to request report downloads.

**Input:**
`DownloadRequest`

---

#### `Socket.emit("readings")`

**Description:**
Emitted by the server to provide real-time readings data from IoT devices.

**Output:**
`Readings`

---

#### `Socket.emit("download-finish")`

**Description:**
Emitted when the server completes sending all chunks of a requested report.

**Output:**

```json
"downloadId": "string"
```

**Type:**
`DownloadRequest.downloadId`

---

#### `Socket.emit("download-data")`

**Description:**
Used to send report data in chunks to the client.

**Output:**
`Readings[]`

---

## Environment Configuration

The server behavior is controlled via environment variables defined in `.env`.

| Variable                 | Description                                                 | Example Value                            |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------- |
| `PORT`                   | Server listening port                                       | `3000`                                   |
| `DB_URL`                 | MongoDB connection URI                                      | `mongodb://localhost:27017/Hydroconnect` |
| `DOWNLOAD_CHUNK_N_SIZE`  | Number of records per report chunk                          | `2`                                      |
| `MAX_DOWNLOAD_ID_LENGTH` | Maximum length of the download identifier                   | `10`                                     |
| `NODE_ENV`               | Application environment (e.g., `development`, `production`) | `development`                            |

When `NODE_ENV=development`, the following features are enabled:

-   `/interactAPI` HTML page for manual interaction.
-   Artificial timeouts to simulate real-world delay in report downloads.

---

## Testing

The project includes comprehensive test cases for all available endpoints.

**Test workflow:**

1. Clears existing MongoDB collections.
2. Repopulates with sample data.
3. Executes automated test suites for each API (both REST and IO).

**Test coverage includes:**

-   REST `/summary` endpoint.
-   IO `post-readings`, `download-request`, `readings`, `download-data`, and `download-finish` events.

---

## Development

**Before Anything:**

```bash
npm install
```

```bash
npm run dev (local development w/ Hot-Reload)
npm run start (local development w/o Hot-Reload)
npm run lint (Lint the project w/ ESLint)
npm run test (Run Test Case)
mpm run build (Lint and then Build)
```

---

## Error Handling

There is a custom `HTTPError` type for HTTP related error (see `lib/errorHandler.ts`)
The `errorHandler.ts` also contains the handler for all `Socket IO` and `REST` error.

---

## License

This project is proprietary and intended for internal use within the Hydroconnect ecosystem.
Unauthorized distribution or modification is prohibited without prior permission.
