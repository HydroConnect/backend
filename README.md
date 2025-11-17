# Hydroconnect API

Hydroconnect API provides both **REST** and **Socket.IO (IO)** endpoints for interacting with IoT devices and retrieving sensor data.
The system is designed with **versioned endpoints**, **independent versioning for REST and IO**, and **chunk-based data streaming** for efficient data transfer.

---

## Table of Contents

1. Overview
2. Project Structure
3. API Versioning
4. Data Schemas
5. REST API
6. Socket.IO API
7. Environment Configuration
8. Testing
9. Development
10. Error Handling
11. License

---

## Overview

The Hydroconnect API serves as a bridge between IoT devices and clients.
It enables:

-   IoT devices to push sensor readings in real time.
-   Clients to download summarized data and request historical reports.
-   Chunked and asynchronous data streaming for large downloads.

---

## Project Structure

The following is the directory structure for the **Hydroconnect API** project.
Each folder and file serves a distinct purpose in organizing REST endpoints, Socket.IO logic, schema definitions, and build output.

```

Hydroconnect-API/
│
├── controllers/
│ ├── io.ts # Handles Socket.IO events and real-time operations
│ └── rest.ts # Handles REST API routes and HTTP logic
│
├── dist/ # Compiled output (TypeScript build artifacts)
│
├── lib/ # Utility modules or shared library code
│
├── node_modules/ # Project dependencies
│
├── public/ # Publicly served assets (if any)
│
├── schemas/ # All Zod schema definitions
│ └── models/
│
├── tests/ # Unit and integration test cases and sample DB data
│
├── .d.env # Example environment file for development
├── .env # Environment configuration (ignored in version control)
│
├── .gitignore # Git ignore rules
├── .prettierrc # Code formatting configuration
├── .eslintrc.ts # ESLint configuration for linting
│
├── package.json # Project metadata and dependencies
├── package-lock.json # Dependency lock file
│
├── README.md # Project documentation
│
├── server.ts # Main entry point (initializes Express and Socket.IO servers)
│
├── tsconfig.json # TypeScript configuration
└── vitest.config.ts # Vitest configuration for testing

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

### `IoTPayload`

Schema for IoT device upload payload.

```ts
interface iIoTPayload {
    key: string;
    readings: Omit<iReadings, "timestamp" | "percent">;
}

zIoTPayload = z.strictObject({
    key: z.hash("sha512", { enc: "base64url" }),
    readings: zReadings.omit({ timestamp: true, percent: true }),
});
```

**Fields:**

| Field      | Type                                     | Description                                   |
| ---------- | ---------------------------------------- | --------------------------------------------- |
| `key`      | `string`                                 | SHA-512 hashed authentication key.            |
| `readings` | `Omit<iReadings,"timestamp"\|"percent">` | Reading data excluding timestamp and percent. |

---

### `DownloadRequest`

Schema for requesting report downloads.

```ts
interface iDownloadRequest {
    from: string;
    to: string;
    downloadId: string;
}

const zDownloadRequest = z.strictObject({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    downloadId: z.string().max(parseInt(process.env.MAX_DOWNLOAD_ID_LENGTH!)).min(1),
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
interface iReadings {
    turbidity: number;
    pH: number;
    tds: number;
    temperature: number; // Degree Celcius
    control: number; // For control info MSB --> LSB (valve, sensor, distribution, resservoir, tank)
    percent: number; // Percent from formula
    timestamp: string;
}

const zReadings = z.strictObject({
    turbidity: z.number(),
    pH: z.number(),
    tds: z.number(),
    temperature: z.number(),
    control: z.int().min(0).max(31),
    percent: z.number(),
    timestamp: z.iso.datetime(),
});
```

**Fields:**

| Field         | Type           | Description                                       |
| ------------- | -------------- | ------------------------------------------------- |
| `turbidity`   | `number`       | Turbidity level of the water.                     |
| `pH`          | `number`       | pH level of the water.                            |
| `tds`         | `number`       | Total dissolved solids (ppm).                     |
| `temperature` | `number`       | Temperature in Celsius.                           |
| `control`     | `integer`      | Device control code (0–31).                       |
| `percent`     | `number`       | Sensor reading percentage (used for calibration). |
| `timestamp`   | `ISO datetime` | Timestamp of the reading.                         |

---

### `Summaries`

Schema representing uptime and timestamp summary.

```ts
interface iSummaries {
    uptime: number; // In seconds
    timestamp: string; // Is always set to midnight 00.01
}

const zSummaries = z.strictObject({
    uptime: z.number().gte(0),
    timestamp: z.iso.datetime(),
});
```

**Fields:**

| Field       | Type           | Description                     |
| ----------- | -------------- | ------------------------------- |
| `uptime`    | `number`       | System uptime in seconds.       |
| `timestamp` | `ISO datetime` | Always set to midnight (00:01). |

---

## REST API

### Base URL

```
/rest/v1/
```

### Endpoints

#### `GET /summary`

**Description:**
Get the latest 7-day summary.

**Response:**
`Summaries[]`

---

#### `GET /latest`

**Description:**
Get the latest reading data.

**Response:**
`Readings`

---

#### `POST /readings`

**Description:**
Endpoint for IoT devices to upload readings data and trigger IO event `readings`.

**Body:**
`IoTPayload`

**Response:**
`true`

**Error:**
`HttpError(400 | 403)`

---

## Socket.IO API

### Namespace

```
/io/v1
```

### Socket Events

#### `Socket.emit("readings")`

**Description:**
Broadcasting latest data that is sent by IoT.

**Output:**
`Readings`

---

#### `Socket.emit("error")`

**Description:**
For signaling error to client.

**Output:**
`Error` (JSON Object not class)

---

#### `Socket.on("download-request")`

**Description:**
Triggered by clients to request report downloads.

**Input:**
`DownloadRequest`

---

#### `Socket.emit("download-data")`

**Description:**
Used to send report data in chunks to the client.

**Output:**
`Readings[], downloadId, ack`

---

#### `Socket.emit("download-finish")`

**Description:**
Emitted when the server completes sending all chunks of a requested report.

**Output:**
`downloadId`

---

## Environment Configuration

The server behavior is controlled via environment variables defined in `.env`.

| Variable                        | Description                                                                    | Example Value                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `PORT`                          | Server listening port                                                          | `3000`                                                                                   |
| `DB_URL`                        | MongoDB connection URI                                                         | `mongodb://localhost:27017/Hydroconnect`                                                 |
| `DOWNLOAD_CHUNK_N_SIZE`         | Number of records per report chunk                                             | `2`                                                                                      |
| `MAX_DOWNLOAD_ID_LENGTH`        | Maximum length of the download identifier                                      | `10`                                                                                     |
| `NODE_ENV`                      | Application environment (e.g., `development`, `production`)                    | `development`                                                                            |
| `IOT_KEY`                       | Secure hash key for IoT authentication                                         | `_49lFI-ngS-9eTp8enaRCMG6ZwLeQQaorZ_RgAvxBP4DtYoUvVokG9whNZ9khQw3OL00xnRnko08vnKtHfAbVA` |
| `MIN_DOWNLOAD_INTERVAL_SECONDS` | Interval in which download request can be made after last request (in seconds) | `60`                                                                                     |

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

-   REST `/summary`, `/latest`, and `/readings` endpoints.
-   IO `readings`, `download-request`, `download-data`, `download-finish`, and `error` events.

---

## Development

**Before Anything:**

```bash
npm install
```

```bash
npm run dev    # (local development w/ Hot-Reload)
npm run start  # (local development w/o Hot-Reload)
npm run lint   # (Lint the project w/ ESLint)
npm run test   # (Run Test Case --> Run this also to set mock data in database)
npm run build  # (Lint and then Build)
```

---

## Error Handling

There is a custom `HttpError` class for HTTP-related errors with a `status` property and `IOError` with `IOErrorEnum` for IO-related errors.
The system also includes two dedicated handlers:

-   `RESTErrorHandler` for REST endpoints (e.g., 400 for invalid request body, 500 for any unknown error)
-   `IOErrorHandler` for Socket.IO events (i.e., sent as `error` events)

---

## License

This project is proprietary and intended for internal use within the Hydroconnect ecosystem.
Unauthorized distribution or modification is prohibited without prior permission.
