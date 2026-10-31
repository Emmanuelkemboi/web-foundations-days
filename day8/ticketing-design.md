# TicketHub: Event Ticketing System Design

## 1. Requirements

TicketHub is a website where customers discover events, select seats, reserve them temporarily, pay, and access their tickets.

### 1.1 Functional Requirements

The system must allow customers to:

1. Register, sign in, and manage their accounts.
2. Browse, search, and filter upcoming events.
3. View event details, venues, dates, prices, and seat maps.
4. View the availability and price of seats for a particular event.
5. Temporarily hold available seats while completing checkout.
6. Create an order for the seats they have held.
7. Pay for an order through an external payment provider.
8. Receive confirmation and access their purchased tickets.
9. View their order and payment history.

Administrators must be able to create events, configure venues and seats, set ticket prices, and monitor sales.

### 1.2 Non-Functional Requirements

**Performance**
- Event listings and event details should normally load within 2 seconds.
- Seat-map requests should normally respond within 1 second.
- The platform must absorb a large increase in traffic when a popular event goes on sale.

**Correctness and Data Integrity**
- A seat must not be sold or actively held by two customers at the same time.
- An order must only become confirmed after the payment provider's result has been verified.
- Repeated requests or payment callbacks must not create duplicate reservations, orders, or charges.
- The database, rather than a cache, is the final authority for seat ownership and sale status.

**Fairness**
- During a high-demand sale, customers should enter through a controlled waiting room or queue.
- Queue admission should follow a clear, consistent order, such as first-in-first-out.
- The system should limit excessive requests and prevent customers from holding seats indefinitely.
- The same admission rules should apply to customers in equivalent circumstances.

**Availability and Reliability**
- The platform should remain usable during traffic spikes.
- Temporary failures should produce clear error responses rather than incorrect confirmations.
- Background tasks should be retryable without duplicating their effects.

**Security**
- Passwords must be stored as secure password hashes.
- Protected endpoints must require authentication and enforce ownership checks.
- Payment card details should be handled by the payment provider; TicketHub should store provider references and payment status, not raw card data.
- Requests must be validated and rate-limited.

---

## 2. Traffic and Capacity Estimates

The assignment provides:

- 2,000,000 registered users.
- 50,000 visitors on a normal day.
- Each normal-day visitor views 10 pages.
- 5,000 tickets are sold on a normal day.
- During a popular concert sale, 200,000 people try to buy 20,000 seats within 10 minutes.

For calculations, one day is 86,400 seconds and 10 minutes is 600 seconds.

### 2.1 Normal-Day Traffic

**Daily page views**

50,000 visitors × 10 pages = **500,000 page views per day**.

**Average page requests per second**

500,000 ÷ 86,400 = **5.79 page requests per second**.

For an initial capacity estimate, assume the busiest period reaches five times the daily average:

5.79 × 5 = **28.95, or approximately 29 requests per second**.

**Average ticket sales rate**

5,000 tickets ÷ 86,400 = **0.058 tickets per second**, or approximately 208 tickets per hour on average.

This is an average across the day; actual sales will be uneven.

### 2.2 Popular Concert Sale

There are 200,000 interested customers and 20,000 seats, with the sale taking place over 600 seconds.

**Average arrival rate**

200,000 customers ÷ 600 seconds = **333.33 customers per second**.

**Demand compared with supply**

200,000 customers ÷ 20,000 seats = **10 customers per seat** on average. Only 10% of interested customers can obtain one of the seats if each customer buys one seat.

To estimate page traffic, assume each of the 200,000 customers makes 10 page requests during the sale:

200,000 × 10 = **2,000,000 page requests**.

2,000,000 ÷ 600 = **3,333.33 page requests per second on average**.

For a preliminary stress target, assume short bursts reach three times this average:

3,333.33 × 3 = **10,000 page requests per second**.

The three-times burst factor is a planning assumption, not a fact supplied by the assignment. Actual traffic should be measured in load tests and adjusted using observed demand.

### 2.3 Traffic Comparison

| Metric | Normal Day | Popular Concert Sale |
|---|---:|---:|
| Customers/visitors | 50,000 per day | 200,000 in 10 minutes |
| Page views/requests | 500,000 per day | 2,000,000 assumed in 10 minutes |
| Average page requests/second | 5.79 | 3,333.33 |
| Estimated peak page requests/second | About 29 | Planning target: 10,000 |
| Ticket demand | 5,000 sold per day | 200,000 people for 20,000 seats |

The popular sale's average request rate is approximately **576 times** the normal-day average (3,333.33 ÷ 5.79). This large difference justifies a waiting room, caching, horizontal application scaling, and careful protection of the database.

---

## 3. REST API Design

The API uses REST conventions and JSON request and response bodies. The examples below are illustrative.

### 3.1 Browse Events

**Method and endpoint:** `GET /api/events`

Returns a paginated list of upcoming events. Optional query parameters can include `category`, `date`, and `page`.

Example request:

```http
GET /api/events?category=concert&page=1
```

Example response:

```json
{
  "events": [
    {
      "id": 101,
      "name": "Summer Music Festival",
      "venue": "Nairobi Arena",
      "event_date": "2026-12-20T18:00:00Z",
      "status": "upcoming"
    }
  ],
  "page": 1,
  "total": 1
}
```

Success: `200 OK`.

### 3.2 View an Event's Seats

**Method and endpoint:** `GET /api/events/{eventId}/seats`

Returns seat identifiers, labels, prices, and display availability for the selected event.

Example response:

```json
{
  "event_id": 101,
  "seats": [
    {
      "id": 501,
      "seat_number": "A1",
      "price": 2500.00,
      "status": "available"
    },
    {
      "id": 502,
      "seat_number": "A2",
      "price": 2500.00,
      "status": "held"
    }
  ]
}
```

Success: `200 OK`. The displayed status is informational; the hold endpoint must recheck availability in the database.

### 3.3 Hold Seats

**Method and endpoint:** `POST /api/events/{eventId}/holds`

Creates a temporary hold for one or more seats if they are still available. The user must be authenticated.

Example request:

```json
{
  "seat_ids": [501],
  "idempotency_key": "hold-abc123"
}
```

Example response:

```json
{
  "hold_id": 9001,
  "event_id": 101,
  "seat_ids": [501],
  "status": "active",
  "expires_at": "2026-12-20T10:15:00Z"
}
```

Success: `201 Created`. If any requested seat is already held or sold, return `409 Conflict` and do not create a partial hold. This design treats a multi-seat hold as all-or-nothing.

### 3.4 Create an Order from a Hold

**Method and endpoint:** `POST /api/orders`

Creates an order for the authenticated user using a valid hold.

Example request:

```json
{
  "hold_id": 9001,
  "idempotency_key": "order-abc123"
}
```

Example response:

```json
{
  "order_id": 7001,
  "status": "pending_payment",
  "total_amount": 2500.00,
  "currency": "KES"
}
```

Success: `201 Created`. An invalid, expired, or non-owned hold returns `409 Conflict` or `404 Not Found`, according to the API's information-disclosure policy.

### 3.5 Initiate Payment

**Method and endpoint:** `POST /api/orders/{orderId}/payments`

Starts payment through the configured payment provider. The client supplies an idempotency key so a retry does not start a duplicate payment.

Example request:

```json
{
  "payment_method": "card",
  "idempotency_key": "payment-xyz789"
}
```

Example response:

```json
{
  "order_id": 7001,
  "payment_status": "pending",
  "message": "Payment initiated"
}
```

Success: `202 Accepted`, because the payment is being processed asynchronously. The order becomes confirmed only after the provider's result has been verified and the database transaction succeeds.

### 3.6 View My Tickets

**Method and endpoint:** `GET /api/users/me/tickets`

Returns tickets belonging to the authenticated user.

Example response:

```json
{
  "tickets": [
    {
      "ticket_id": 3001,
      "event": "Summer Music Festival",
      "seat": "A1",
      "status": "valid"
    }
  ]
}
```

Success: `200 OK`.

### 3.7 View an Order

**Method and endpoint:** `GET /api/orders/{orderId}`

Returns an order's items, total, and current status, provided the authenticated user owns the order.

Possible responses:
- `200 OK` — order retrieved.
- `401 Unauthorized` — user is not authenticated.
- `403 Forbidden` — user does not own the order.
- `404 Not Found` — order does not exist.

---

## 4. Data Model

TicketHub uses PostgreSQL, a relational database, because seat sales require transactions, constraints, and reliable relationships.

### 4.1 Users

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| full_name | VARCHAR(150) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

### 4.2 Events

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| name | VARCHAR(200) | NOT NULL |
| venue | VARCHAR(200) | NOT NULL |
| event_date | TIMESTAMP | NOT NULL |
| description | TEXT | NULL |
| status | VARCHAR(30) | NOT NULL |

### 4.3 Seats

Each seat record belongs to one event.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| event_id | BIGINT | Foreign key → Events(id), NOT NULL |
| seat_number | VARCHAR(20) | NOT NULL |
| price | DECIMAL(10,2) | NOT NULL, CHECK price >= 0 |
| status | VARCHAR(20) | NOT NULL |

A unique constraint on `(event_id, seat_number)` prevents the same seat label from being created twice for one event. The status is constrained to supported values such as `available`, `held`, and `sold`.

### 4.4 Orders

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| user_id | BIGINT | Foreign key → Users(id), NOT NULL |
| status | VARCHAR(30) | NOT NULL |
| total_amount | DECIMAL(10,2) | NOT NULL, CHECK total_amount >= 0 |
| created_at | TIMESTAMP | NOT NULL |

Order statuses include `pending_payment`, `confirmed`, `expired`, and `cancelled`.

### 4.5 Order Items

An order can contain one or more seats.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| order_id | BIGINT | Foreign key → Orders(id), NOT NULL |
| seat_id | BIGINT | Foreign key → Seats(id), NOT NULL |
| price | DECIMAL(10,2) | NOT NULL, CHECK price >= 0 |

The order item stores the price at the time of purchase, so later price changes do not alter historical orders. A seat may have historical order-item records if earlier orders were cancelled, so double-booking protection is enforced through active holds and a separate unique constraint for confirmed ticket ownership, not by making `seat_id` globally unique in this table.

### 4.6 Seat Holds

Stores temporary reservations while customers complete checkout.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| seat_id | BIGINT | Foreign key → Seats(id), NOT NULL |
| user_id | BIGINT | Foreign key → Users(id), NOT NULL |
| order_id | BIGINT | Foreign key → Orders(id), NULL until linked |
| expires_at | TIMESTAMP | NOT NULL |
| status | VARCHAR(20) | NOT NULL |

A seat can have historical expired or released hold records. The application and database must ensure that no more than one active, unexpired hold exists for a seat. This can be enforced with a transaction and, where the database design supports it, a partial unique index for active holds.

### 4.7 Payments

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| order_id | BIGINT | Foreign key → Orders(id), NOT NULL |
| provider_reference | VARCHAR(150) | UNIQUE |
| amount | DECIMAL(10,2) | NOT NULL, CHECK amount >= 0 |
| status | VARCHAR(30) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

An order can have multiple payment attempts. A provider reference is unique so the same provider transaction cannot be recorded twice.

### 4.8 Relationships

- One user can create many orders.
- One event can contain many seats.
- One order can contain many order items.
- Each order item refers to one seat.
- A user can create multiple seat holds over time.
- Each seat hold refers to one seat and one user.
- One order can have multiple payment attempts.
- Each payment belongs to one order.

---

## 5. Preventing Double-Booking

The database is the final authority for seat ownership. A seat shown as available on a cached seat map may have been held by another customer a moment later. Therefore, the system must check availability again when creating a hold.

### 5.1 Creating a Hold Safely

When a customer requests a seat hold:

1. The Seat Service starts a database transaction.
2. It selects the requested seat rows using `SELECT ... FOR UPDATE`, locking them so competing transactions cannot reserve the same rows simultaneously.
3. It checks that the seat belongs to the requested event and is not sold.
4. It checks whether an existing hold is still active and unexpired.
5. If all requested seats are available, it creates the hold records, sets the seat status to `held`, and records the hold expiration time.
6. It commits the transaction and returns the hold details.
7. If any requested seat is unavailable, it rolls back the transaction and returns `409 Conflict`.

For a request containing several seats, the operation is all-or-nothing. This avoids leaving a customer with only part of the requested group.

### 5.2 Hold Expiration

A hold lasts for 10 minutes. A background worker periodically finds expired holds. It releases a seat only after checking, inside a transaction, that the hold is still active, has expired, and has not been converted into a confirmed sale.

The worker then marks the hold as expired and makes the seat available again. This check prevents a delayed expiration job from releasing a seat that has already been sold.

### 5.3 Confirming Payment

1. The payment provider sends a callback after processing payment.
2. TicketHub verifies the callback signature and confirms the transaction with the provider.
3. The Order Service starts a database transaction and locks the order and relevant seat records.
4. It verifies that the payment amount and currency match the order and that the hold still belongs to that order.
5. It records the payment result, marks the order as confirmed, marks the seats as sold, and creates the tickets.
6. It commits the transaction.

If payment fails, the order is not confirmed and the hold is released according to the payment and hold policy. If a payment succeeds after a hold has expired and the seats have been reassigned, the system must not sell those seats again; it should initiate the defined refund or payment-reversal process.

Payment callbacks and client retries use idempotency keys and unique provider references so duplicate messages do not duplicate the effect.

**Why this works:** row-level locks serialize competing attempts to hold the same seat. The transaction makes the related changes succeed or fail together. Hold expiry makes abandoned seats available again. The application never relies only on cached availability to authorize a purchase.

---

## 6. System Architecture

### 6.1 Architecture Diagram

```text
                         CUSTOMERS
                             |
                             v
                       CDN / WEB APP
                             |
                             v
                       LOAD BALANCER
                             |
                             v
                       WAITING ROOM
                             |
                             v
                        API GATEWAY
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
         EVENT SERVICE  SEAT SERVICE   ORDER SERVICE
              |              |              |
              |              +-------+------+
              |                      |
              v                      v
          REDIS CACHE           POSTGRESQL
                                     |
                                     v
                              PAYMENT PROVIDER
                                     |
                              VERIFIED CALLBACK
                                     |
                                     v
                                ORDER SERVICE
                                     |
                                     v
                                MESSAGE QUEUE
                                     |
                           +---------+---------+
                           |                   |
                           v                   v
                    TICKET WORKER        HOLD WORKER
                           |
                           v
                    EMAIL / TICKET DELIVERY
```

### 6.2 Component Explanations

**CDN and Web App:** A content delivery network serves static files such as images, stylesheets, and scripts from locations closer to customers. This reduces load on the application servers.

**Load Balancer:** Distributes requests across multiple application instances and removes unhealthy instances from service.

**Waiting Room:** Controls admission during high-demand sales. It uses a published queue policy, such as first-in-first-out, and admits customers at a rate the application and database can handle.

**API Gateway:** Routes requests to the appropriate service and applies authentication, request validation, and rate limits.

**Event Service:** Handles event discovery and event details. Read-heavy event information is suitable for caching.

**Seat Service:** Handles seat availability and holds. It uses database transactions and row-level locks for reservation decisions.

**Order Service:** Creates orders, initiates payments, verifies payment results, and confirms purchases.

**Redis Cache:** Stores frequently requested event information and other short-lived, non-authoritative data. It improves read performance, but it does not decide whether a seat can be sold.

**PostgreSQL:** Stores users, events, seats, holds, orders, order items, and payments. It provides the transactional consistency needed for seat reservations.

**Payment Provider:** Processes payment details and reports payment outcomes. TicketHub stores transaction references and statuses rather than raw card details.

**Message Queue:** Holds background jobs so ticket delivery and other slower tasks do not block customer-facing requests. Failed jobs can be retried.

**Background Workers:** Generate and deliver tickets and expire abandoned holds. Their operations must be idempotent so retries do not create duplicate tickets or release sold seats.

### 6.3 How the Architecture Handles the Big Sale

The sale produces an estimated average of 3,333 page requests per second under the stated assumption, with a planning burst target of 10,000 requests per second.

- The CDN serves static assets without sending every request to the application.
- The waiting room controls how many customers enter the purchase flow at once.
- The load balancer distributes admitted traffic across multiple application instances.
- Redis serves frequently requested event information and reduces repeated reads from PostgreSQL.
- Read replicas can serve suitable read-only queries, such as event information, while all reservation and purchase decisions go to the primary database.
- The Seat Service uses short database transactions and row-level locks to protect seat ownership.
- A connection pool limits the number of database connections and prevents uncontrolled connection creation.
- The message queue moves ticket generation and notifications out of the checkout request.
- Monitoring tracks request rates, queue length, database load, errors, and payment delays so capacity can be adjusted.

The waiting room is important because adding application servers alone does not make the database infinitely scalable. Admission must be controlled so the transactional database is not overwhelmed.

---

## 7. Design Trade-Offs

### 7.1 Strong Consistency vs. Speed

A strongly consistent reservation process uses database transactions and locks to prevent double-booking. Under heavy contention, customers may wait longer for a seat reservation.

TicketHub prioritizes correctness for holds and purchases rather than allowing faster but potentially conflicting reservations. The waiting room and short transactions help manage the delay.

### 7.2 Caching vs. Freshness

Caching event details and seat-map display data reduces database load and improves response times. However, cached seat availability can become outdated when another customer reserves a seat.

TicketHub caches suitable read-only information but always checks the primary database before creating a hold or confirming a sale. This means the seat map may briefly be stale, but the purchase decision remains correct.

### 7.3 Waiting Room vs. Immediate Access

A waiting room protects the system and gives customers a more orderly admission process. However, customers cannot all enter checkout immediately, and they may have to wait.

TicketHub accepts this delay to reduce overload and apply a consistent admission policy during a high-demand sale.

### 7.4 Asynchronous Processing vs. Immediate Delivery

Generating tickets and sending notifications in the checkout request could increase response time. Background workers allow the order process to finish without waiting for every delivery task.

The trade-off is that a confirmed customer may wait briefly before a ticket appears. TicketHub confirms the order only after verified payment and a successful database transaction, then uses retryable background jobs for ticket delivery.

---

## 8. Error Handling and Reliability

The system must handle common failure cases safely:

- **Seat already held or sold:** Return `409 Conflict`; do not create the hold.
- **Invalid or expired hold:** Reject order creation and ask the customer to select seats again.
- **Payment declined:** Keep the order unconfirmed and release the hold according to the payment policy.
- **Payment provider timeout:** Keep the payment in a pending or unknown state and verify its result before retrying or releasing the seat. Do not assume a timeout means payment failed.
- **Duplicate payment callback:** Use the provider reference and idempotent processing to avoid recording the same payment twice.
- **Database unavailable:** Return `503 Service Unavailable` and do not claim that a hold or purchase succeeded.
- **Background worker failure:** Retry the job safely; use idempotency to prevent duplicate tickets or unsafe seat releases.

Monitoring should cover request latency, error rates, queue length, database connections, lock waits, payment outcomes, and worker failures.

---

## 9. Conclusion

TicketHub is designed for normal event browsing as well as sudden, high-demand ticket sales. The estimates show that the popular sale can produce a request rate hundreds of times higher than normal traffic.

A CDN, load balancer, waiting room, API gateway, cache, application services, PostgreSQL, payment provider, message queue, and background workers each address a specific part of the problem.

The most important correctness requirement is preventing double-booking. TicketHub achieves this by treating the database as the authority, using transactions and row-level locks for holds, enforcing appropriate constraints, expiring abandoned holds safely, and confirming orders only after verified payment.

The design balances performance with correctness and fairness so customers receive a reliable purchasing experience even when demand exceeds the number of available seats.