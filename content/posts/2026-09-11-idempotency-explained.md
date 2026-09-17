---
title: Idempotency, or how to stop apologising for retries
slug: idempotency-explained
date: 2026-09-11
summary: Your client retried. Twice. The customer now owns three sofas. Let us fix that with one header and a little discipline.
tags: [apis, reliability, integration-patterns]
author: Ahmed Fahim
draft: false
---

Your payment service took too long to answer. The client waited, gave up, and retried — politely, exactly as you told it to. The order went through all three times.

Somewhere there is a customer with three identical sofas and a very reasonable complaint.

## The thing nobody tells you about timeouts

A timeout is not a failure. A timeout is a **shrug**.

When a call fails with a `400`, you know what happened: nothing. When it fails with a timeout, you know nothing at all. The request may have never arrived. It may have arrived, been processed, charged the card, and then the response got lost on the way home.

The client cannot tell these apart. That is the entire problem, and no amount of better error handling on the client will solve it — the information simply is not there.

So the fix has to live on the server.

## What idempotent actually means

An operation is idempotent if doing it twice has the same effect as doing it once.

- `GET /customers/42` — idempotent. Read it a hundred times, nothing changes.
- `DELETE /orders/7` — idempotent. Already gone is still gone.
- `PUT /customers/42` with a full body — idempotent. You are stating the final state.
- `POST /orders` — **not** idempotent. That is the sofa problem.

Notice that `DELETE` twice should return success both times, not a `404` on the second. The state you asked for is the state that exists. Returning an error because someone retried is how you teach client developers to ignore your error codes.

## The fix: let the client name the attempt

The client generates a unique key per *logical operation* and sends it with every attempt:

```bash
curl -X POST https://api.shop.io/orders \
  -H "Idempotency-Key: a3f9c2e1-7b44-4d2a-9f18-payment-001" \
  -H "Content-Type: application/json" \
  -d '{"sku": "SOFA-01", "qty": 1}'
```

The server then follows one rule:

> If you have seen this key before, do not do the work again. Return the result you returned last time.

That is it. The client retries as often as it likes, and only the first attempt does anything.

## Getting the key right

This is where implementations go wrong, so be deliberate.

**The client generates it, not the server.** Only the client knows that attempt two is a retry of attempt one. If the server generates the key, every retry gets a fresh one and you are back to three sofas.

**One key per intent, not per request.** All retries of "place this order" share a key. A genuinely new order gets a new key. A UUID generated when the user clicks the button works well.

**Do not derive it from the payload.** Hashing the body feels clever until a customer legitimately orders the same sofa twice on purpose and the second order silently vanishes. Worse, it is a silent failure — nobody gets an error, the order just never exists.

## Storing the result

Storing "I have seen this key" is not enough. You must store **what you answered**, because the retry needs the same answer — including the order ID.

```sql
CREATE TABLE idempotency_keys (
  key            VARCHAR(255) PRIMARY KEY,
  request_hash   VARCHAR(64)  NOT NULL,
  status_code    INT,
  response_body  TEXT,
  state          VARCHAR(16)  NOT NULL,
  created_at     TIMESTAMP    NOT NULL
);
```

Two columns there earn their place.

`state` handles the concurrent retry: the client gave up at 5 seconds and retried while the original request is *still running*. Insert the key as `IN_PROGRESS` before doing the work, and have a second arrival on an `IN_PROGRESS` key return `409 Conflict` rather than starting the work a second time.

`request_hash` catches the client bug where the same key arrives with a different body. That is not a retry, it is a mistake, and silently returning the old response hides it. Return `422` and let them find it in testing rather than in production.

## Doing it in one transaction

The classic mistake is writing the key *after* the work, in a separate transaction. Crash in between and you have done the work with no record, so the retry does it again.

```java
@Transactional
public OrderResponse placeOrder(String key, OrderRequest request) {
    Optional<IdempotencyRecord> existing = keys.findByKey(key);
    if (existing.isPresent()) {
        return existing.get().replay();   // same answer as last time
    }

    keys.insertInProgress(key, hash(request));  // fails fast if racing
    OrderResponse response = orders.create(request);
    keys.complete(key, response);

    return response;
}
```

Same transaction, so it is all-or-nothing. The unique constraint on the primary key is what makes the race safe — two concurrent requests with the same key, one insert wins, the other gets a constraint violation you translate into a `409`.

## Practical details worth deciding early

- **Expire the keys.** Twenty-four hours covers any realistic retry window. Keeping them forever turns a hot table into a slow one.
- **Scope the key to the caller.** Client A's key should never collide with client B's. Make the primary key `(client_id, key)`.
- **Document the header.** Clients will not send it if they do not know it exists. Put it in the spec, and say plainly what happens if they omit it.
- **Decide what a missing key means.** Rejecting with `400` is stricter and safer. Accepting it is friendlier and lets the sofa problem back in. Pick one and write it down.

## The short version

Retries are not a client bug to be stamped out. They are the correct response to an ambiguous failure, and any client worth integrating with will do them.

Your job is to make retries boring. One header, one table, one transaction — and nobody ends up with three sofas.
