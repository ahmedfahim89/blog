---
title: Your newest API client is a language model
slug: integration-basics-for-ai
date: 2026-10-18
summary: AI agents call your systems like any other client, only with more confidence. The integration basics have never mattered more.
tags: [integration-patterns, apis, ai]
author: Ahmed Fahim
draft: false
---

Every AI demo has the same moment: the model calls a tool and the answer appears. That tool call is an API call with a description attached, and everything integration people already know still applies.

- **Contracts.** A developer learns to distrust `"status": "OK"` on a failure. A model believes it. Field descriptions are now part of the contract.
- **Sync or async.** Don't make an agent wait 40 seconds on the ERP. Return `202 Accepted` and a status link.
- **Idempotency.** Agents retry, sometimes by rephrasing. Make `POST /orders` safe to repeat with an `Idempotency-Key` ([more on that here](article.html?slug=idempotency-explained)).
- **Errors.** A bare `500` is a dead end. Say what failed and what to try next, or the model will guess.
- **Identity.** Every call should say who the agent acted for and what it may touch.

AI doesn't lower the bar for integration. It raises the price of skipping the basics.
