---
title: Your ESB did not remove the spaghetti, it moved it indoors
slug: esb-moved-the-spaghetti
date: 2026-09-20
summary: The before-and-after diagram is honest on the day you draw it. Here is what it stops telling you by month eighteen.
tags: [integration-patterns, apis, middleware]
author: Ahmed Fahim
draft: false
---

Every ESB business case contains the same two diagrams. Before: fifteen boxes and a cat's cradle of arrows. After: fifteen boxes and one calm rectangle in the middle.

## The spaghetti moved, it did not vanish

Imagine a company has:
🚗 CRM

🚕 Billing System

🚌 ERP

🏎️ Mobile App

🚚 Warehouse System

Without proper integration, everyone starts talking directly to everyone.

CRM → Billing

CRM → ERP

ERP → Warehouse

Mobile → CRM

Billing → ERP

Soon your architecture looks like: A bowl of spaghetti designed by an angry developer. 😂


Then the ESB arrives:

👮 "STOP!"

"CRM, send your message here."

"ERP, I'll transform it."

"Billing, you'll receive it in your preferred format."

The ESB can handle:

🔄 Routing

🔀 Transformation

📨 Message mediation

⚡ Protocol conversion

🚨 Error handling


## Shared fate, not single point of failure

Saying that an ESB is a single point of failure is an oversimplification. Modern ESBs are typically clustered, so losing the entire platform is uncommon. The bigger risk is partial failure, which can be much harder to detect and troubleshoot.

An ESB  retrying into a backend that is [not idempotent](article.html?slug=idempotency-explained) fires that retry from infrastructure the backend team does not operate.