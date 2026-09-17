---
title: REST vs SOAP: the truce nobody asked for
slug: rest-vs-soap
date: 2026-09-17
summary: One returns JSON and shrugs. The other returns an envelope and a lawyer. Here is when each actually earns its keep.
tags: [rest, soap, apis]
author: Ahmed Fahim
draft: false
---

Every integration project eventually holds the same meeting. Someone says "why is this still SOAP?", someone else says "because the bank said so", and then everyone looks at the floor for a while.

So let us settle it properly. Not with tribal loyalty — with the boring question of what each one actually gives you.

## The one-sentence version

**SOAP is a protocol.** It tells you the message format, the error format, how to describe the service, and how to bolt on security and transactions. Lots of rules, very little left to argue about.

**REST is an architectural style.** It tells you to use HTTP the way HTTP was designed. Very few rules, so you get to argue about all of them.

That is genuinely the whole difference. Everything below is a consequence of it.

## What they look like on the wire

Here is "get customer 42" in SOAP:

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>billing-svc</wsse:Username>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <getCustomer xmlns="http://acme.com/crm">
      <customerId>42</customerId>
    </getCustomer>
  </soap:Body>
</soap:Envelope>
```

And the same thing in REST:

```bash
curl https://api.acme.com/customers/42
```

Yes, that is the meme. But look at what the envelope is buying: a standard place for security headers, a standard place for the payload, and a standard fault format when it all goes wrong. REST puts those in headers, status codes and whatever error shape your team invented on a Thursday.

## Where SOAP genuinely wins

Be honest about this bit, because "SOAP is legacy" is a lazy thing to say to a telco billing system that has been up for eleven years.

- **A real contract.** The WSDL is machine-readable and complete. Point a generator at it and you get client stubs with types. OpenAPI does this too now, but SOAP had it first and mandated it, rather than leaving it optional.
- **Errors are standardised.** Every SOAP fault has the same shape. No wondering whether this API returns `{"error": "..."}` or `{"message": "..."}` or a 200 with `success: false` in it.
- **WS-\* when you actually need it.** Message-level signing, encryption that survives an intermediary, distributed transactions across two systems. These are rare. When you need them, REST has no standard answer and you end up building one.

> If the integration is machine-to-machine, inside a regulated industry, with a partner who sends you a 40-page interface spec, SOAP is not the villain. It is doing its job.

## Where REST genuinely wins

- **Anything with a browser or a phone in front of it.** JSON is native to JavaScript, payloads are smaller, and nobody has to explain namespaces to a front-end developer.
- **Caching that comes free.** A `GET` with proper headers gets cached by every proxy and CDN between you and the client. SOAP posts everything, so nothing caches.
- **Evolution without ceremony.** Adding a field to a JSON response rarely breaks anyone. Adding an element to a schema means regenerating stubs on every consumer.
- **Debuggability.** You can reproduce a REST call in a terminal from memory. Reproducing a SOAP call by hand is a small craft project.

## The comparison nobody puts in the slides

| | SOAP | REST |
|---|---|---|
| What is it | Protocol | Architectural style |
| Payload | XML, always | Usually JSON |
| Contract | WSDL, mandatory | OpenAPI, optional |
| Errors | Standard fault | Whatever you agreed |
| Caching | No | Yes, via HTTP |
| Security | WS-Security, message level | TLS plus OAuth, transport level |
| Learning curve | Steep, then flat | Gentle, then you hit versioning |

That last row is the one people underestimate. REST is easier on day one and harder on day four hundred, because all the decisions SOAP made for you are now yours to make, document and defend.

## How to actually decide

Ask three questions in this order.

1. **Who is calling it?** Browser or mobile app, REST. System to system inside an enterprise, either.
2. **Does the caller need a guaranteed contract?** If a partner will code-generate against it and sue you when it changes, a strict contract matters more than payload size.
3. **Do you need message-level security or transactions?** If genuinely yes, SOAP. If someone merely said the word "secure" in a meeting, TLS and OAuth are fine.

If all three come back neutral, pick REST. Not because it is better, but because you will find more people who can maintain it.

## The bit that actually matters

Most of the integrations I have seen fail did not fail on this choice. They failed on timeouts, retries, error handling and someone assuming a field was always populated.

Pick the style that fits the constraint, document it honestly, and then go spend your energy on the parts that will actually page you at 3am.
