# 🔍 API Monitoring System

> A production-grade, event-driven API monitoring platform that tracks, analyzes, and manages API usage across multiple clients — similar to **Google Analytics, but for APIs**.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Key Design Decisions](#-key-design-decisions)

---

## 🌐 Overview

API Monitoring System allows businesses (clients) to integrate a simple API hit tracker into their services. Every API call they make gets ingested, queued, processed asynchronously, and stored — making rich analytics available in real-time.

**Use case example:** A fintech company integrates our ingest endpoint into their payment microservices. Every API call logs its endpoint, response time, status code, and service name. They then query our analytics dashboard to monitor slow endpoints, error spikes, and service health.

---

## 🏗 Architecture

```
                        ┌─────────────────────────────────────────────┐
                        │              CLIENT APPLICATION              │
                        │  (Payment Service, Auth Service, etc.)       │
                        └─────────────────────┬───────────────────────┘
                                              │ POST /api/ingest  (API Key)
                                              ▼
                        ┌─────────────────────────────────────────────┐
                        │             INGEST SERVICE                  │
                        │  • Validates API Key                        │
                        │  • Rate Limiting (DoS protection)           │
                        │  • Publishes event to RabbitMQ              │
                        └─────────────────────┬───────────────────────┘
                                              │ Publishes to Queue
                                              ▼
                        ┌─────────────────────────────────────────────┐
                        │              RABBITMQ                       │
                        │  • api_hits queue (main)                    │
                        │  • dead_letter queue (failed messages)      │
                        └──────────┬──────────────────────────────────┘
                                   │ Consumed by
                        ┌──────────▼──────────┐    ┌──────────────────┐
                        │  PROCESSOR SERVICE  │───▶│  Dead Letter     │
                        │  • Async consumer   │    │  Queue (DLQ)     │
                        │  • Retry logic      │    │  • Max retries   │
                        │  • Saves to MongoDB │    │  • Manual replay │
                        └─────────────────────┘    └──────────────────┘
                                              │
                                              ▼
                        ┌─────────────────────────────────────────────┐
                        │                MONGODB                      │
                        │  • api_hits collection                      │
                        │  • clients, users, api_keys collections     │
                        │  • dlq_messages collection                  │
                        └─────────────────────┬───────────────────────┘
                                              │
                                              ▼
                        ┌─────────────────────────────────────────────┐
                        │           ANALYTICS SERVICE                 │
                        │  • MongoDB Aggregation Pipelines            │
                        │  • Dashboard, Error trends, Service stats   │
                        │  • Slowest endpoints, Response distribution │
                        └─────────────────────────────────────────────┘

                        ┌─────────────────────────────────────────────┐
                        │           AUTH + CLIENT SERVICE             │
                        │  • JWT Authentication (HttpOnly cookies)    │
                        │  • Role-Based Access Control (RBAC)         │
                        │  • Multi-tenant client onboarding           │
                        │  • API Key generation & management          │
                        └─────────────────────────────────────────────┘
```

**Flow Summary:**
1. Client sends API hit data → **Ingest Service** validates API key and publishes to RabbitMQ
2. **Processor** consumes messages asynchronously and saves to MongoDB
3. Failed messages → **DLQ** (can be inspected, replayed, or deleted by admin)
4. **Analytics Service** runs aggregation queries on stored hits
5. **Admin** manages clients, users, API keys via **Client Service**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Express.js |
| Database | MongoDB (with Aggregation Pipelines) |
| Message Queue | RabbitMQ (AMQP) |
| Authentication | JWT (HttpOnly Cookies) |
| Authorization | Role-Based Access Control (RBAC) |
| Logging | Winston (file + console) |
| Rate Limiting | express-rate-limit |
| Validation | Custom validator utility |

---

## ✨ Features

- 🔐 **JWT Authentication** with HttpOnly cookies (XSS-safe)
- 👥 **Multi-Tenant Architecture** — isolated data per client
- 🔑 **API Key Management** — generate, list, revoke keys per client
- 🛡️ **Role-Based Access Control** — `super_admin`, `client_admin`, `client_viewer`
- 📨 **Async Event Processing** — RabbitMQ decouples ingestion from processing
- 💀 **Dead Letter Queue (DLQ)** — failed messages captured, inspectable & replayable
- 📊 **Rich Analytics** — dashboard, error trends, service breakdown, slowest endpoints
- 📤 **AWS S3 CSV Export** — Export raw API hit logs as CSV to secure private AWS S3 buckets
- 🔗 **Secure Pre-signed URLs** — Temporary download links that expire in 1 hour to prevent unauthorized access
- 🔄 **Download Link Regeneration** — MongoDB metadata persistence to regenerate download URLs for expired exports
- ⚡ **Rate Limiting** — on both login and ingest endpoints
- 📝 **Structured Logging** — Winston with file rotation

---

## 📁 Project Structure

```
api_monitoring/
├── backend/
│   ├── src/
│   │   ├── server.js                          # Main entry point
│   │   ├── services/
│   │   │   ├── auth/                          # Authentication & user management
│   │   │   │   ├── controller/authController.js
│   │   │   │   ├── routes/authRouter.js
│   │   │   │   └── service/authService.js
│   │   │   ├── client/                        # Client & API key management
│   │   │   │   ├── controller/clientController.js
│   │   │   │   ├── routes/clientRoutes.js
│   │   │   │   └── service/clientService.js
│   │   │   ├── ingest/                        # API hit ingestion
│   │   │   │   ├── controller/ingestController.js
│   │   │   │   └── routes/ingestRoutes.js
│   │   │   ├── analytics/                     # Analytics & reporting
│   │   │   │   ├── controller/analyticsController.js
│   │   │   │   ├── routes/analyticsRoutes.js
│   │   │   │   └── service/analyticsService.js
│   │   │   └── processor/                     # RabbitMQ consumer + DLQ
│   │   │       ├── controller/dlqController.js
│   │   │       ├── routes/dlqRoutes.js
│   │   │       ├── consumer.js
│   │   │       └── dlqConsumer.js
│   │   └── shared/
│   │       ├── config/                        # MongoDB, RabbitMQ, Logger config
│   │       ├── constants/                     # Roles, enums
│   │       ├── middlewares/                   # Auth, authorise, API key validation
│   │       ├── models/                        # Mongoose schemas
│   │       └── utils/                         # Validators, helpers
│   ├── logs/
│   │   ├── combined.log
│   │   └── error.log
│   ├── .env
│   └── package.json
└── frontend/                                  # React SPA Admin Portal
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [RabbitMQ](https://www.rabbitmq.com/) (local or CloudAMQP)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/api-monitoring.git
cd api-monitoring

# 2. Install dependencies
cd backend
npm install

# 3. Create environment file
cp .env.example .env
# Fill in your values (see Environment Variables section)

# 4. Start the development server
npm run dev
```

Server starts at: `http://localhost:5000`

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/api_monitoring

# RabbitMQ
RABBITMQ_URL=amqp://localhost

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# Cookie
COOKIE_SECRET=your_cookie_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# AWS S3 Export Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
```

---

## 📚 API Reference

> Base URL: `http://localhost:5000`

---

### 🔐 Auth Service — `/api/auth`

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/auth/onboard-super-admin` | ❌ | One-time super admin setup |
| `POST` | `/api/auth/login` | ❌ | Login (rate limited: 5 req/15min) |
| `POST` | `/api/auth/register` | ✅ Super Admin | Register a new admin user |
| `GET` | `/api/auth/profile` | ✅ Any | Get current user profile |
| `POST` | `/api/auth/logout` | ✅ Any | Logout (clears cookie) |
| `GET` | `/api/auth/users` | ✅ Super Admin | List all users |
| `PATCH` | `/api/auth/users/:userId/deactivate` | ✅ Super Admin | Deactivate a user |
| `PATCH` | `/api/auth/change-password` | ✅ Any | Change own password |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "Admin@1234"
}
```

---

### 🏢 Client Service — `/api`

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/admin/clients/onboard` | ✅ Super Admin | Onboard a new client |
| `GET` | `/api/admin/clients` | ✅ Super Admin | List all clients |
| `PUT` | `/api/admin/clients/:clientId` | ✅ Super Admin | Update client details |
| `POST` | `/api/admin/clients/:clientId/users` | ✅ Admin | Create client user |
| `GET` | `/api/admin/clients/:clientId/users` | ✅ Admin | List client users |
| `PATCH` | `/api/admin/clients/:clientId/users/:userId/deactivate` | ✅ Admin | Deactivate user |
| `PATCH` | `/api/admin/clients/:clientId/users/:userId/permissions` | ✅ Admin | Update permissions |
| `POST` | `/api/admin/clients/:clientId/api/keys` | ✅ Admin | Generate API key |
| `GET` | `/api/admin/clients/:clientId/api/keys` | ✅ Admin | List API keys |
| `PATCH` | `/api/admin/clients/:clientId/api/keys/:keyId/revoke` | ✅ Admin | Revoke API key |

---

### 📥 Ingest Service — `/api/ingest`

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/ingest` | 🔑 API Key Header | Ingest an API hit |
| `GET` | `/api/ingest/health` | ❌ | Health check |

**Ingest Request:**
```json
POST /api/ingest
Headers: { "x-api-key": "apim_xxxxxxxxxxxx" }

{
  "endpoint": "/api/payments/charge",
  "method": "POST",
  "statusCode": 200,
  "latencyMs": 142,
  "serviceName": "payment-service"
}
```

---

### 📊 Analytics Service — `/api/analytics`

> Note: Analytics dashboard routes require `x-api-key` header. Bulk export routes require JWT authentication (`super_admin` only).

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/analytics/dashboard` | 🔑 API Key | Overall stats (total, success, error rates, avg latency) |
| `GET` | `/api/analytics/top-endpoints` | 🔑 API Key | Most-hit endpoints |
| `GET` | `/api/analytics/status-distribution` | 🔑 API Key | HTTP status code breakdown |
| `GET` | `/api/analytics/response-time-distribution` | 🔑 API Key | Latency buckets (fast/normal/slow/very slow) |
| `GET` | `/api/analytics/service-breakdown` | 🔑 API Key | Per-service metrics |
| `GET` | `/api/analytics/error-rate-trend` | 🔑 API Key | Daily error rate over time |
| `GET` | `/api/analytics/slowest-endpoints` | 🔑 API Key | Endpoints ranked by avg latency |
| `POST` | `/api/analytics/export` | 🔐 JWT Super Admin | Export raw hits as CSV to AWS S3 & return 1-hr pre-signed URL |
| `GET` | `/api/analytics/exports/:exportId/url` | 🔐 JWT Super Admin | Generate a fresh pre-signed download URL for previous export |

**Query Parameters (for API key analytics routes):**
```
?startTime=2026-06-01T00:00:00Z&endTime=2026-06-30T23:59:59Z
```

---

### 💀 DLQ Service — `/api/dlq`

> All DLQ routes require JWT authentication with `super_admin` role.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dlq/stats` | DLQ summary (total, pending, replayed, deleted) |
| `GET` | `/api/dlq/messages` | List all failed messages (paginated) |
| `GET` | `/api/dlq/messages/:messageId` | Get single message details |
| `PUT` | `/api/dlq/messages/:messageId` | Update message status & notes |
| `POST` | `/api/dlq/messages/:messageId/replay` | Replay failed message to main queue |
| `DELETE` | `/api/dlq/messages/:messageId` | Permanently delete a DLQ message |

---

## 🧠 Key Design Decisions

### 1. Why RabbitMQ for ingestion?
Ingest API returns instantly without waiting for DB writes. The message is queued and processed asynchronously by the Processor service. This decoupling allows high-throughput ingestion without putting load directly on MongoDB.

### 2. Why Dead Letter Queue?
If a message fails processing (malformed data, DB timeout), it goes to DLQ instead of being silently lost. Admins can inspect, fix, and replay messages — ensuring **zero data loss**.

### 3. Why HttpOnly cookies for JWT?
Storing JWT in `localStorage` is vulnerable to XSS attacks. HttpOnly cookies are inaccessible to JavaScript, making them significantly more secure.

### 4. Why MongoDB Aggregation Pipelines for analytics?
Analytics requires complex grouping, date bucketing, and cross-field calculations. MongoDB's aggregation pipeline handles this natively with high performance, eliminating the need for a separate analytics database.

### 5. Multi-tenancy approach
Each client has scoped API keys. When an ingest hit arrives, the API key resolves to a `clientId`. All analytics are filtered by `clientId`, ensuring complete data isolation between tenants.

### 6. Why AWS S3 with Pre-signed URLs & MongoDB Tracking?
Exporting millions of raw records is database-heavy, and storing large CSV binaries inside MongoDB is bad practice. Instead, we generate the CSV streams dynamically, upload them to a private AWS S3 bucket, and generate a secure **pre-signed URL** valid for 1 hour. To solve the problem of URL expiration without making the bucket public or re-running heavy queries, we persist the S3 file key in the `AnalyticsExport` MongoDB model, allowing the super admin to instantly generate a fresh pre-signed download URL anytime on demand.

---

## 👤 User Roles

| Role | Permissions |
|------|------------|
| `super_admin` | Full access — manage clients, users, view DLQ, all analytics |
| `client_admin` | Manage own client's users and API keys |
| `client_viewer` | View-only access to analytics |

---

## 📄 License

MIT © 2026
