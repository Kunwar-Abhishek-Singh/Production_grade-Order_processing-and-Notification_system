Here is a comprehensive, production-grade `README.md` designed specifically to showcase the engineering rigor and architecture of your project.

---

# 🚀 Production-Ready Distributed E-Commerce Backend

A highly resilient, scalable Node.js backend built with **Express, Redis, MongoDB, and BullMQ**. This project focuses on solving critical distributed system challenges, including **race conditions, transactional consistency, distributed locking, background worker processing, graceful degradation, and system resilience under failure**.

---

## 🏗️ System Architecture

```
                       ┌───────────────────────┐
                       │   Clients / Traffic   │
                       └───────────┬───────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │    Load Balancer      │
                       └───────────┬───────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
    ┌────────────────────┐                  ┌────────────────────┐
    │  API Worker (Node) │                  │  API Worker (Node) │
    └──────────┬─────────┘                  └──────────┬─────────┘
               │                                       │
        ───────┴───────────────────┬───────────────────┴───────
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
┌──────────────┐           ┌──────────────┐           ┌─────────────────┐
│ MongoDB Repl │           │ Redis Cache  │           │  BullMQ Queues  │
│ (Primary DB) │           │ & Rate Limit │           │ (Redis Backed)  │
└──────────────┘           └──────────────┘           └────────┬────────┘
                                                               │
                                  ┌────────────────────────────┼────────────────────────────┐
                                  ▼                            ▼                            ▼
                      ┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
                      │ Notification Worker  │     │    Invoice Worker    │     │   Analytics Worker   │
                      └──────────────────────┘     └──────────────────────┘     └──────────────────────┘

```

---

## 🔥 Highlight: Race Condition & Order Processing Workflow

The centerpiece of this architecture solves the **"Last Item Stock Problem"** where multiple concurrent requests attempt to purchase stock when $N = 1$.

```
[ Request A ] ───┐
                 ├───► [ Express API ] ───► [ Redis Distributed Lock ]
[ Request B ] ───┘                                   │
                                                     ▼
[ Worker Cluster ] ◄─── [ BullMQ ] ◄─── [ Outbox ] ◄─── [ Mongo Transaction ]
       │                                                 ├── Atomic Stock Decrement
       ├───► WhatsApp Notification                       ├── Order Creation
       ├───► Email Confirmation                          └── Idempotency Record
       └───► Invoice Generation

```

1. **Distributed Lock (Redis):** Prevents concurrent mutation of identical resources using token-owned locks with automatic renewal timers.
2. **Atomic Mongo Transaction:** Executes a conditional update (`$gte: quantity`) to safely decrement inventory and create order records atomically.
3. **Transactional Outbox Pattern:** Guarantees event delivery to **BullMQ** without losing state if the database or queue goes down during order creation.
4. **Idempotent Background Processing:** Asynchronous workers process queue jobs with unique idempotency keys to ensure **at-least-once** delivery never results in duplicate execution.

---

## 🛠️ Key Implementation Details

### 🟢 Core Node.js & Express Architecture

* **Layered Architecture:** Clear separation of Controller, Service, Repository, and Model layers.
* **Resilient Environment Setup:** Strict runtime environment variable validation using `dotenv` and schema parsing.
* **Async Error Handling:** Centralized error boundary with custom error classes eliminating unhandled promise rejections.
* **Observability:** Structured JSON logging via `Pino`/`Winston` tagged with unique **Correlation / Request IDs** (`cls-hooked` / `AsyncLocalStorage`) across all log streams.
* **Graceful Shutdown:** Handles `SIGTERM` and `SIGINT` signals cleanly:
* Stops accepting new inbound HTTP requests.
* Pauses BullMQ message consumption.
* Drains active in-flight worker jobs within a strict **Shutdown Timeout**.
* Safely closes MongoDB and Redis client pools.


* **Health Checks:** `/healthz` endpoints exposing dynamic **Liveness** and **Readiness** statuses.

---

### ⚡ Scaling & Multithreading

* **Process Clustering:** Master-worker process cloning via Node.js `cluster` module to utilize all CPU cores.
* **Worker Threads:** Offloading heavy CPU-bound computational workloads (e.g., PDF generation, crypto operations) away from the main Event Loop.
* **Strategic Scaling:** Strict architectural boundary separating **Cluster** (I/O scale out) from **Worker Threads** (CPU intensive task delegation).

---

### 🔴 Redis Patterns & Distributed Locking

* **Cache-Aside Pattern:** Optimized query performance with strict TTLs and context-aware cache invalidation hooks.
* **Rate Limiting:** Sliding-window rate-limiting implementation protecting sensitive endpoints against brute-force attacks.
* **Redlock-Style Distributed Locks:**
* **Ownership Tokens:** UUID-backed keys ensuring workers only release locks they explicitly own.
* **Lock TTL & Auto-Renewal:** Background heartbeat timers extending lock duration during long-running tasks.
* **Safe Lock Release:** Lua scripts for atomic token validation and key deletion.



---

### 🐂 Asynchronous Processing (BullMQ)

Structured queue management handling high-volume background tasks across dedicated workers:

* **Queues:** `order-confirmation`, `whatsapp-notification`, `invoice-generation`, `analytics`
* **Features:**
* Exponential backoff retry strategies.
* Worker-level concurrency tuning.
* Dead Letter Queue (DLQ) pattern for permanently failed jobs.
* Rate-limit handling (respecting HTTP `429` and `Retry-After` headers from external providers).
* Graceful worker draining on process termination.



---

### 🍃 MongoDB Data Integrity

* **Schemas:** `Users`, `Products`, `Orders`, `IdempotencyRecords`, `OutboxEvents`
* **Concurrency Protection:** Conditional stock updates (`{ stock: { $gte: qty } }`) to prevent negative inventory.
* **ACID Transactions:** Session-based multi-document operations for complex ordering workflows.
* **Performance Indexing:** Compound and sparse indexes optimized for query access patterns.

---

## 🧪 Failure Mode Simulations & Mitigations

This repository intentionally simulates complex real-world distributed failure scenarios to test system endurance:

| Scenario / Chaos Test | Potential Risk | Architectural Mitigation |
| --- | --- | --- |
| **Worker crashes after sending notification, before job completion** | Duplicate notifications/invoices sent to user | **Job Idempotency Keys:** Workers verify processing status in Redis/Mongo before execution. |
| **Redis lock expires while worker is still processing** | Second worker acquires lock, creating race condition | **Lock Renewal (Heartbeat):** Automatic lock extension during execution; **Token Ownership** validation before release. |
| **MongoDB temporarily becomes unavailable** | Partial writes or stalled connections | **Readiness Probe Failure:** Load balancer instantly routes traffic away; client requests fail fast. |
| **Node receives `SIGTERM` mid-execution** | Corrupted state and abandoned client requests | **Graceful Shutdown Pipeline:** Stops new traffic, drains active jobs, flushes logs, and closes connections within timeout limit. |
| **External API returns HTTP 429 Rate Limit** | Worker thread exhaustion and cascading failures | **Exponential Backoff & Rate Limit Delays:** Respects `Retry-After` header and pauses queue dynamically. |
| **Queue suddenly swells to 100,000+ jobs** | Queue starvation and high latency | **Dynamic Concurrency Scaling & Monitoring:** Worker autoscaling based on queue metrics and API rate limits. |

---

## 🚦 Getting Started

### Prerequisites

* **Node.js**: `v20.x` or higher
* **Docker & Docker Compose** (for local infra dependencies)
* **MongoDB**: `v6.0+` (Replica set required for transactions)
* **Redis**: `v7.0+`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# 2. Install dependencies
npm install

# 3. Spin up Infrastructure (Redis & MongoDB Replica Set)
docker-compose up -d

# 4. Configure Environment Variables
cp .env.example .env

# 5. Run Database Seeds / Index Setup
npm run db:seed

# 6. Start Development Server with Clustering
npm run dev

```

---

## 🧪 Running Failure Tests & Benchmarks

```bash
# Run unit & integration tests
npm test

# Simulate concurrent checkout load test (Race Condition Verification)
npm run test:concurrency

# Trigger chaos worker crash simulation
npm run test:chaos-worker

```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
