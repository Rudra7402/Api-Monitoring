# Complete Project Analysis - API Monitoring Backend

## Architecture Overview
This is a **Node.js/Express** API monitoring backend that:
- Accepts API hit data via REST endpoints
- Validates API keys for auth
- Publishes hit events to **RabbitMQ**
- Consumes events from RabbitMQ and saves to **MongoDB**
- Provides **analytics** (dashboard, top endpoints, status codes, etc.)

## ✅ What's Working Well
- Auth service (JWT, bcrypt, cookie-based) is well-structured
- API key generation and validation logic is solid
- Circuit breaker pattern is implemented
- RabbitMQ with Dead Letter Queue (DLQ) is configured
- MongoDB connection with event listeners and TTL index
- Analytics aggregation pipelines are well-written
- Graceful shutdown handlers exist
- Logger is used consistently

---

## 🚨 CRITICAL ERRORS

### 1. server.js: `startServer()` is defined but NEVER called
- **File**: `server/src/server.js`
- **Bug**: `startServer()` is defined as an async function, but there is NO call to `startServer()` at the bottom of the file.
- **Effect**: When you run `node server/src/server.js`, nothing happens. The server just exports nothing and exits.
- **Fix**: Add `startServer();` at the end of the file (or `.catch()` handler).

### 2. Wrong file name in processor service import
- **File**: `server/src/services/processor/service/processorService.js` (line 9)
- **Bug**: Imports from `'../repository/ApiHitRepository.js'` but the actual file is `'../repository/ApiHitRepository.js'` — **this is actually OK since the file exists**
- **But**: The import path from `processorService.js` uses `'../repository/ApiHitRepository.js'` which is correct since the file DOES exist at that path. ✅ *Actually this one is fine.*

### 3. RabbitMQ: `channel.consume()` missing required options
- **File**: `server/src/services/processor/consumer.js` (line 34)
- **Bug**: `channel.consume(queueName, callback)` is called without `{ noAck: false }` options
- **Risk**: Default behavior may vary. Should explicitly pass `{ noAck: false }` to ensure manual acknowledgment works properly.

### 4. MongoDB ObjectId may not be populated properly
- **File**: `server/src/services/client/service/clientService.js` (lines 343-345)
- **Bug**: `getClientByApiKey()` uses `key.clientId` directly without calling `.populate()` on the document. But `findApiKeyByValue` in `ApiKeyRepository.js` (line 31) DOES call `.populate("clientId")`. Actually this is fine. ✅

### 5. `validateApiKey.js` imports from wrong relative path
- **File**: `server/src/shared/middlewares/validateApiKey.js` (line 2)
- **Bug**: Imports `getClientByApiKey` from `"../../services/client/service/clientService.js"`
- **Correct path should be**: `"../../services/client/service/clientService.js"` — let me verify...
  - `validateApiKey.js` is in `server/src/shared/middlewares/`
  - Target is `server/src/services/client/service/clientService.js`
  - From `server/src/shared/middlewares/` → go up twice to `server/src/` → `services/client/service/clientService.js`
  - Path: `../../services/client/service/clientService.js` ✓ **This is correct**

### 6. Response time distribution has Unicode garbage in comment
- **File**: `server/src/services/analytics/services/analyticsService.js` (line 181)
- **Bug**: Unicode replacement characters `ΓåÉ` instead of proper arrow symbol `←` in comment
- **Effect**: This is just a comment, but indicates potential encoding issues in the file
- **Fix**: Replace comment text
- Note: Also in `consumer.js` line 1 comment: `// consumer.js ΓÇö The missing piece`

### 7. `consumer.js` has no import error handling - `startConsumer()` called before channel ready
- **File**: `server/src/server.js` (line where `startConsumer()` is called inside `initializeConnection()`)
- **Bug**: `startConsumer()` calls `getChannel()` right after `connectRabbitMQ()` but `connectRabbitMQ()` is async and may not have set the channel yet when `startConsumer()` immediately calls `getChannel()` in the very next line
- Actually wait - `initializeConnection()` does `await connectRabbitMQ()` then `await startConsumer()`. Inside `startConsumer()`, it calls `getChannel()`. `connectRabbitMQ()` sets the channel variable before returning. So this should be fine. ✅

---

## 🟡 POTENTIAL ISSUES / IMPROVEMENTS

### 8. `processorService.js` imports functions that are never used
- **File**: `server/src/services/processor/service/processorService.js`
- **Bug**: Imports `findApiHits`, `countApiHits`, `deleteOldApiHits` from `ApiHitRepository.js` but only uses `saveApiHit`
- **Fix**: Remove unused imports

### 9. No error handling in `startServer()` call
- **File**: `server/src/server.js` (line 327)
- **Bug**: `startServer()` is called but if it rejects, there's no `.catch()` handler
- **Fix**: Add `.catch((err) => { logger.error('Fatal server error:', err); process.exit(1); })`

### 10. Ingest routes: rate limiter applied AFTER validateApiKey middleware
- **File**: `server/src/services/ingest/routes/ingestRoutes.js` (line 16)
- **Bug**: `ingestRouter.post("/", validateApiKey, ingestLimiter, ingestHit);` — The rate limiter is applied AFTER API key validation. This means even invalid API keys consume rate limit capacity. Should be: `ingestRouter.post("/", ingestLimiter, validateApiKey, ingestHit);`
- **Fix**: Move `ingestLimiter` before `validateApiKey`

### 11. Analytics routes use API key validation but are mounted on `/api/analytics`
- **File**: `server/src/server.js` (line where analytics router is mounted)
- **File**: `server/src/services/analytics/routes/analyticsRoutes.js`
- The analytics router applies `validateApiKey` middleware to ALL routes. This is functional but note it uses API key auth, not JWT/cookie auth.

### 12. `eventProducer.js` hardcodes maxAttempts to 3
- **File**: `server/src/shared/events/producer/eventProducer.js` (line 27)
- **Improvement**: Should use `config.rabbitmq.retryAttempts` instead of hardcoded `3`

### 13. `CircuitBreaker.js` is instance-less (singleton)
- **File**: `server/src/shared/events/producer/CircuitBreaker.js`
- **Issue**: The circuit breaker is a singleton. If multiple producers use it, they share state. For this project it might be fine, but worth noting.

### 14. `validateApiKey.js` uses `req.baseUrl.includes()` for permission check
- **File**: `server/src/shared/middlewares/validateApiKey.js` (line 69)
- **Issue**: `req.baseUrl` might be empty or undefined in some Express versions
- **Fix**: Use `req.path` or `req.originalUrl` which are more reliable

### 15. Elasticsearch/PostgreSQL are commented out but imports remain
- **File**: `server/src/server.js` line: `//import { connectPostgres, closePG } from './shared/config/postgres.js';`
- **Issue**: Unused commented imports. Clean them up.

### 16. No `start` script in package.json
- **File**: `server/package.json`
- **Issue**: `"scripts": { "test": "echo ..." }` — No `start` or `dev` script defined
- **Fix**: Add `"start": "node src/server.js"` or use nodemon for dev

### 17. `clientRoutes.js` uses `/admin` prefix but routes are mounted at `/api`
- **File**: `server/src/services/client/routes/clientRoutes.js`
- **File**: `server/src/server.js` mounts clientRouter at `/api`
- **Result**: Routes become `/api/admin/clients/onboard`, `/api/admin/clients/:clientId/users`, etc.
- **Issue**: The `server.js` root response only lists `/api/auth`, `/api/hit`, `/api/analytics` but NOT the admin routes

### 18. No request body validation for analytics endpoints
- Analytics controllers validate query params but there's no schema validation library used consistently. The `validator.js` utility only validates auth fields.

---

## 📋 SUMMARY OF FIXES NEEDED (Priority Order)

| Priority | File | Issue |
|----------|------|-------|
| **P0** | `server/src/server.js` | `startServer()` is never called — server won't start |
| **P1** | `server/src/server.js` | No `.catch()` on server startup |
| **P1** | `server/package.json` | Missing `start` script |
| **P2** | `server/src/services/ingest/routes/ingestRoutes.js` | Rate limiter placed after API key validation |
| **P2** | `server/src/services/processor/service/processorService.js` | Unused imports |
| **P2** | `server/src/shared/events/producer/eventProducer.js` | Uses hardcoded retry value instead of config |
| **P3** | `server/src/services/processor/consumer.js` | Missing `{ noAck: false }` option in consume |
| **P3** | Comments with encoding issues in multiple files |
| **P4** | Root endpoint response missing admin routes reference |
| **P4** | Clean up commented-out PostgreSQL imports |

---

## Project Structure Summary

```
server/
├── .env                          # Environment variables
├── package.json                  # Dependencies (express, mongoose, amqplib, etc.)
├── src/
│   ├── server.js                 # ★ MAIN ENTRY POINT (HAS CRITICAL BUG #1)
│   ├── shared/
│   │   ├── config/
│   │   │   ├── index.js          # Central config from env vars
│   │   │   ├── logger.js         # Winston logger
│   │   │   ├── mongodb.js        # Mongoose connection
│   │   │   ├── postgres.js       # Commented out (PG not used)
│   │   │   └── rabbitmq.js       # RabbitMQ connection manager
│   │   ├── constants/
│   │   │   └── role.js           # Role definitions
│   │   ├── events/producer/
│   │   │   ├── CircuitBreaker.js # Circuit breaker pattern
│   │   │   └── eventProducer.js  # RabbitMQ publisher
│   │   ├── middlewares/
│   │   │   ├── authenticateMiddleware.js  # JWT cookie auth
│   │   │   ├── authoriseMiddleware.js     # Role-based access
│   │   │   └── validateApiKey.js          # API key validation
│   │   ├── models/
│   │   │   ├── ApiHits.js        # Raw API hit events schema
│   │   │   ├── ApiKey.js         # API keys schema
│   │   │   ├── Client.js         # Client/organizations schema
│   │   │   └── User.js           # Users schema
│   │   └── utils/
│   │       └── validator.js      # Auth field validation
│   └── services/
│       ├── auth/                  # Auth service (register, login, profile)
│       ├── client/                # Client management (CRUD, API keys)
│       ├── ingest/                # API hit ingestion endpoint
│       ├── analytics/             # Analytics/dashboard queries
│       └── processor/             # RabbitMQ consumer + MongoDB storage