# Hydroconnect API

Hydroconnect API provides both **REST** and **Socket.IO (IO)** endpoints for interacting with IoT devices and retrieving sensor data. The system is designed with **versioned endpoints**, **independent versioning for REST and IO**, and **chunk-based data streaming** for efficient data transfer.

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
11. Logging
12. Deployment
13. License

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
├── .github/
│   └── workflows/     # GitHub Actions workflow specifications (CI/CD)
|
├── controllers/
│   ├── io.ts          # Handles Socket.IO events and real-time operations
│   └── rest.ts        # Handles REST API routes and HTTP logic
│
├── dist/              # Compiled output
│
├── lib/               # Utility modules or shared library code
│
├── node_modules/      # Project dependencies
│
├── public/            # Publicly served assets (if any)
│
├── schemas/           # All schema definitions
│   └── models/        # Schema definition that tied to a database
│
├── tests/             # Unit and integration test cases and sample DB data
│
├── .d.env             # Example environment file for development
├── .env               # Environment configuration (ignored in version control)
│
├── .gitignore         # Git ignore rules
├── .prettierrc        # Code formatting configuration
├── .eslintrc.ts       # ESLint configuration (legacy / compatibility)
│
├── log                # Log file (ignored in version control)
|
├── vercel.json        # Vercel deployment and routing configuration
│
├── package.json       # Project metadata and dependencies
├── package-lock.json  # Dependency lock file
├── README.md          # Project documentation
│
├── server.ts          # Main entry point (initializes Express and Socket.IO servers)
│
├── eslint.config.ts   # ESLint flat config (recommended for newer ESLint versions)
├── tsconfig.json      # TypeScript configuration
└── vitest.config.ts   # Vitest configuration for testing
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

There are 2 types of data schemas, 1 that is tied to a database (`models` directory) and 1 that doesn't. The `models` data schema will have **mongoose schema** definition. All data schema have typescript interface definition, and some have **Zod** definition.

\*The on that has **Zod** definition, strict schema definitions apply to all REST and Socket.IO interactions.

---

### `Devices`

Schema for storing device push notification tokens.

```ts
const zDevices = z.strictObject({
    token: z.string(),
});

const devicesSchema = new Schema({
    token: { type: String, required: true }, // i.e. "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]", from devices
});

devicesSchema.index({ token: 1 }, { unique: true });
```

**Fields:**

| Field   | Type     | Description                      |
| ------- | -------- | -------------------------------- |
| `token` | `string` | Expo push token from the device. |

---

### `Ids`

Schema for storing global incremental identifiers.

```ts
const idsSchema = new Schema({
    notificationId: { type: Number, required: true, default: 1 },
});
```

**Fields:**

| Field            | Type     | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| `notificationId` | `number` | Auto-incremented notification identifier |

---

### `Readings`

Schema representing IoT sensor readings.

```ts
const zReadings = z.strictObject({
    turbidity: z.number(),
    pH: z.number(),
    tds: z.number(),
    temperature: z.number(),
    control: z.int().min(0).max(31),
    percent: z.number(),
    timestamp: z.iso.datetime(),
});

const readingsSchema = new Schema({
    turbidity: { type: Number, required: true },
    pH: { type: Number, required: true },
    tds: { type: Number, required: true },
    temperature: { type: Number, required: true }, // Degree Celcius
    control: { type: Number, required: true }, // MSB → LSB (valve, sensor, distribution, reservoir, tank)
    percent: { type: Number, required: true },
    timestamp: { type: Date, required: true, immutable: true, default: Date.now },
});

readingsSchema.index({ timestamp: 1 }, { unique: true });
```

**Fields:**

| Field         | Type           | Description                    |
| ------------- | -------------- | ------------------------------ |
| `turbidity`   | `number`       | Turbidity level of the water.  |
| `pH`          | `number`       | pH level of the water.         |
| `tds`         | `number`       | Total dissolved solids (ppm).  |
| `temperature` | `number`       | Temperature in Celsius.        |
| `control`     | `integer`      | Device control bitmask (0–31). |
| `percent`     | `number`       | Sensor reading percentage.     |
| `timestamp`   | `ISO datetime` | Time the reading was recorded. |

---

### `Summaries`

Schema representing daily uptime summaries.

```ts
const zSummaries = z.strictObject({
    uptime: z.number().gte(0),
    timestamp: z.iso.datetime(),
});

const summariesSchema = new Schema({
    uptime: { type: Number, required: true, default: 0 }, // In seconds
    timestamp: { type: Date, required: true, immutable: true }, // Is always set to midnight 00.01
});

summariesSchema.index({ timestamp: 1 }, { unique: true });
```

**Fields:**

| Field       | Type           | Description                     |
| ----------- | -------------- | ------------------------------- |
| `uptime`    | `number`       | System uptime in seconds.       |
| `timestamp` | `ISO datetime` | Always set to midnight (00:01). |

---

### `UsageNotification`

Schema for tracking usage notifications.

```ts
const zUsageNotification = z.strictObject({
    notificationId: z.int(),
    timestamp: z.iso.datetime(),
    type: z.boolean(),
});

const usageNotificationsSchema = new Schema({
    notificationId: { type: Number, required: true, immutable: true },
    timestamp: { type: Date, required: true, immutable: true },
    type: { type: Boolean, required: true, immutable: true },
});

usageNotificationsSchema.index({ notificationId: 1 }, { unique: true });
```

**Fields:**

| Field            | Type           | Description                          |
| ---------------- | -------------- | ------------------------------------ |
| `notificationId` | `number`       | Unique notification identifier.      |
| `timestamp`      | `ISO datetime` | Time the notification was generated. |
| `type`           | `boolean`      | Notification type flag.              |

---

### `DownloadRequest`

Schema for requesting report downloads.

```ts
const zDownloadRequest = z.strictObject({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    downloadId: z.string().max(parseInt(process.env.MAX_DOWNLOAD_ID_LENGTH!)).min(1),
});
```

**Fields:**

| Field        | Type           | Description                                                |
| ------------ | -------------- | ---------------------------------------------------------- |
| `from`       | `ISO datetime` | Start date of the report range.                            |
| `to`         | `ISO datetime` | End date of the report range.                              |
| `downloadId` | `string`       | Unique identifier constrained by `MAX_DOWNLOAD_ID_LENGTH`. |

---

### `IoTPayload`

Schema for IoT device upload payload.

```ts
const zIoTPayload = z.strictObject({
    key: z.hash("sha512", { enc: "base64url" }),
    readings: zReadings.omit({ timestamp: true, percent: true }),
});
```

**Fields:**

| Field      | Type                                    | Description                                  |
| ---------- | --------------------------------------- | -------------------------------------------- |
| `key`      | `string`                                | SHA-512 base64url authentication key.        |
| `readings` | `Omit<Readings,"timestamp"\|"percent">` | Sensor readings without timestamp & percent. |

---

### `PanduanData`

Schema for instructional guide content.

```ts
const zPanduanData = z.strictObject({
    title: z.string(),
    videoUrl: z.string(),
    thumbnailUrl: z.string(),
    steps: z.array(z.string()),
});
```

**Fields:**

| Field          | Type       | Description                        |
| -------------- | ---------- | ---------------------------------- |
| `title`        | `string`   | Guide title.                       |
| `videoUrl`     | `string`   | URL of the instructional video.    |
| `thumbnailUrl` | `string`   | Thumbnail image URL.               |
| `steps`        | `string[]` | Ordered list of instruction steps. |

---

## REST API

### Base URL

```
/rest/v1/
```

All uncaught error in REST API will be handled by `errorHandler` via `HttpError`, if unexpected error happens the server will always return `HttpError(500)`. All **POST** request body and all response are in **JSON**, thus header `Content-Type` is always `application/json`.

### Endpoints

## `GET /summary`

Returns uptime summaries for the last **7 days**, ordered from newest to oldest.
If a day has no data, uptime is returned as `0`.

### Response `Summaries[]`

```json
[
    {
        "timestamp": "2026-01-05T00:00:00.001Z",
        "uptime": 86400
    }
]
```

---

## `GET /latest`

Returns the **latest IoT sensor reading**.
Uses in-memory cache if available to reduce database queries.

### Response `Readings | null`

```json
{
    "turbidity": 1.2,
    "pH": 7.1,
    "tds": 120,
    "temperature": 27,
    "control": 3,
    "percent": 100,
    "timestamp": "2026-01-05T09:15:00.000Z"
}
```

---

## `POST /readings`

Receives **IoT device data upload**, compute and stores readings, updates uptime, emits `readings` **Socket.IO** events, and triggers usage notifications.

### Body `IoTPayload`

```json
{
    "key": "sha512_base64url_key",
    "readings": {
        "turbidity": 1.2,
        "pH": 7.1,
        "tds": 120,
        "temperature": 27,
        "control": 3
    }
}
```

### Response `boolean`

```json
true
```

### Error

| Status | Description                      |
| ------ | -------------------------------- |
| 400    | Invalid payload (Zod validation) |
| 403    | Invalid IoT authentication key   |

---

## `GET /notifications`

Returns **usage notifications**, optionally paginated using `latest` notification ID.

### Request Query

| Query    | Type   | Description                                       |
| -------- | ------ | ------------------------------------------------- |
| `latest` | number | Latest notification ID exclusive (for pagination) |

### Response `UsageNotification[]`

```json
[
    {
        "notificationId": 15,
        "timestamp": "2026-01-05T09:00:00.000Z",
        "type": true
    }
]
```

---

## `POST /notifications/register`

Registers an **Expo Push Token** for receiving notifications. Can handle duplicate request.

### Body `Devices`

```json
{
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

### Response `boolean`

```json
true
```

### Error

| Status | Description                        |
| ------ | ---------------------------------- |
| 400    | Invalid body or invalid Expo token |

---

## `POST /notifications/unregister`

Removes a previously registered **Expo Push Token**.

### Body `Devices`

### Response `boolean`

```json
true
```

### Error

| Status | Description                        |
| ------ | ---------------------------------- |
| 400    | Invalid body or invalid Expo token |

---

## `GET /panduan`

Returns static **instructional guide data** for system usage.

### Response `PanduanData[]`

```json
[
    {
        "title": "Cara Menyalakan Pompa",
        "videoUrl": "https://youtube.com/...",
        "thumbnailUrl": "https://img.youtube.com/...",
        "steps": ["Lorem", "Ipsum"]
    }
]
```

---

## `POST /github-webhook`

### Description

Receives **GitHub webhook events**, validates HMAC signature, and restarts the backend service only in production server. **See GitHub docs**

### Body `GitHub webhook payload (raw body required)`

### Response `boolean`

```json
true
```

### Error

| Status | Description          |
| ------ | -------------------- |
| 403    | Unauthorized webhook |

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

There can be 2 type of server starting: start on development or start on production (see logs). On development use `.d.env` on production use `.env` if doesn't exist program will exit.

---

| Variable                          | Description                                                 | Example Value                                                                            |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `PORT`                            | Server listening port                                       | `3000`                                                                                   |
| `DB_URL`                          | MongoDB connection URI                                      | `mongodb://localhost:27017/Hydroconnect`                                                 |
| `DOWNLOAD_CHUNK_N_SIZE`           | Number of records per report chunk when downloading         | `2`                                                                                      |
| `MAX_DOWNLOAD_ID_LENGTH`          | Maximum length of the download identifier (can't be less)   | `50`                                                                                     |
| `MIN_DOWNLOAD_INTERVAL_SECONDS`   | Minimum interval between download requests (seconds)        | `2`                                                                                      |
| `IOT_INTERVAL_MS`                 | Interval at which IoT data is sent (milliseconds)           | `1000`                                                                                   |
| `IOT_INTERVAL_TOLERANCE_MS`       | Allowed delay tolerance for IoT data timeout (milliseconds) | `500`                                                                                    |
| `IOT_KEY`                         | SHA-512 base64url key for IoT authentication                | `_49lFI-ngS-9eTp8enaRCMG6ZwLeQQaorZ_RgAvxBP4DtYoUvVokG9whNZ9khQw3OL00xnRnko08vnKtHfAbVA` |
| `GITHUB_WEBHOOK_SECRET`           | Secret used to validate GitHub webhook HMAC                 | `sQCWrj8Kg/gjeEuWLjIl6TqLeSidHEuHO1EzMkb952M=`                                           |
| `IS_LINUX`                        | Enable Linux-only system commands                           | `false`                                                                                  |
| `USAGE_NOTIFICATION_PAGING_LIMIT` | Maximum number of notifications per request                 | `5`                                                                                      |
| `INITIAL_NOTIF_BACKOFF_S`         | Initial notification backoff delay (seconds)                | `2`                                                                                      |
| `NOTIF_BACKOFF_MULTIPLIER`        | Exponential multiplier for notification backoff             | `3`                                                                                      |
| `DISABLE_NOTIFICATION`            | Disable sending notifications globally (useful for testing) | `true`                                                                                   |

---

IF `NODE_ENV!=production`, then following become true:

-   `/interactAPI` HTML page for manual interaction.
-   Artificial timeouts to simulate real-world delay in report downloads.
-   Logger also logs to console
-   Local Caching of last summary entry is disabled

IFF `NODE_ENV=production` & `IS_LINUX=true`:

-   Github Webhooks auto-update is enabled.

---

## Testing

The project includes comprehensive test cases for all available endpoints.

**Test workflow:**

1. Clears existing MongoDB collections.
2. Repopulates with sample data.
3. Executes automated test suites for each API (both REST and IO).

**Test coverage includes:**

-   All REST endpoints except `/github-webhook`, can be test manually from github.
-   IO `readings`, `download-request`, `download-data`, `download-finish`, and `error` events.
-   Doesn't test for notification system, test manually using phone and InteractAPI.html or copy ExpoPushToken to `realExpoToken` variable on `rest` test file in. **WARNING!** don't commit the token, manual testing preferred.

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

Add a new test if a new endpoint is added and make sure all test passed. To test run the instance (`npm run dev`) then on another terminal run (`npm run test`).

---

## Error Handling

There is a custom `HttpError` class for HTTP-related errors with a `status` property and `IOError` with `IOErrorEnum` for IO-related errors.
The system also includes two dedicated handlers:

-   `RESTErrorHandler` for REST endpoints (e.g., Http Response 400 for invalid request body, 500 for any unknown error)
-   `IOErrorHandler` for Socket.IO events (i.e., sent as `error` events)

---

## Logging

Logging use **Winston** package for asynchronous logging. There are 2 `loggers` that includes `Console` and transport 1 that doesn't. The `consoleLogger` is useful for logging to `journalctl` on Linux production server.

**Don't ever use `console.log` for logging in production!**

---

## Deployment

There is 1 Github Actions called **lintNTest**. The name is self-explanatory. For deploying just push to main and the server (if on) will update on its own, if adding any `.d.env` make sure to change the `.env` on production to. Make sure pushed commit has been tested (`npm run test`) and builded (`npm run build`). See also the Github Actions verdict on github to see if there are any errors.

On linux production server, we setup a **systemd** that is enabled and auto-retry indefinitely called `hydroconnect`. Thus starting / restarting / stopping / log can be done using `sudo systemctl [start / restart / stop] hydroconnect` and `sudo journalctl -u hydroconnect [-f]`. Currently, this **systemd** runs a premade script that:

1. Revert all changes to latest commit
2. Pull latest from main branch
3. `npm run build` & `npm run start` using `NODE_ENV=production`

## License

This project is proprietary and intended for internal use within the Hydroconnect ecosystem.
Unauthorized distribution or modification is prohibited without prior permission.
