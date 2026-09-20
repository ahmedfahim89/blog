# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Integration Ninja** — a static blog about APIs, middleware and messaging. Hand-written
HTML, CSS and jQuery-era JavaScript. No build step, no database, no server-side code:
every file is uploaded as-is to Hostinger shared hosting (`public_html`).

Delivery is sprint-by-sprint with a review gate. Sprints 1 (list + read) and 2 (search,
tags, pagination, TOC, time-of-day theme) are done — extend them, don't redo them.
Sprint 3 is a browser editor; sprint 4 is clean URLs, link previews, sitemap and a 404.
Flag work that belongs to a later sprint rather than quietly pulling it forward.

## The hard constraint: buildless

There is no npm, no bundler, no transpiler. This machine has no Node.js and no usable
Python; Hostinger's cheapest tier runs PHP but not Node. Never propose a package, build
step, framework or backend without first stating what it costs (a hosting-plan upgrade,
a toolchain that cannot run here). Assume the answer is no and solve it in vanilla.

Third-party libraries load from cdnjs in a `<script>` tag **with an SRI `integrity` hash
and `crossorigin="anonymous"`**. Current set: jQuery 3.7.1, marked 18.0.13,
DOMPurify 3.4.15, highlight.js 11.11.2 (script plus its `github-dark` stylesheet). The
hash is per-version, so bumping a version means fetching the new hash from cdnjs and
updating every page that loads it — a version bumped without its hash fails closed and the
page silently loses that library. Adding another library is a real decision — raise it
first, never add one without the hash.

## Commands

Preview locally (required — `fetch()` is blocked on `file://`, so double-clicking
`index.html` shows the "open this through a local server" state, not a bug):

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Serves the repo root at <http://localhost:8080>; `-Port 8081` if that port is taken.
Ctrl+C to stop. VS Code Live Server works too.

There is no test suite and no linter. Verification is: load both pages through the local
server, check both themes and a narrow viewport, and read the browser console — a silent
JS error is the most common way this site breaks. If you touched anything in
`assets/js/lib/`, open `tools/publish.html` as well — it loads the same files, so a break
there is a break in the publishing path, not a separate tool.

**Regenerating the article index** after adding or editing a post in `content/posts/`:
open `tools/publish.html` through the local server, point it at the `content/posts`
folder, and save the downloaded `articles.json` over `content/articles.json`.
Never hand-edit `articles.json`.

## Architecture

### The index is the database

`content/articles.json` is generated, and the site reads *it*, not the posts folder. A
post that is not in the index does not exist to the site. Since sprint 2 each entry also
carries `searchText` (the full body with code fences preserved), so a stale index means
stale *search results*, not just a missing card. Entries are built by
`Frontmatter.buildEntry()` — the same function the live site and `tools/publish.html`
both call, so the index and the site can never disagree about what a post means.

`Store` (`lib/store.js`) fetches the index once per page load, drops drafts, sorts newest
first, and hands the same array to everything downstream. It rejects with
`Error('NOT_SERVED')` on a non-http(s) origin so pages can show the local-server message
instead of a bare "Failed to fetch". Bodies are loaded by `post.file` (the real
date-prefixed filename), not by slug.

The file is `{ generated, posts: [...] }` and each entry is exactly what `buildEntry()`
returns: `slug`, `title`, `date`, `summary`, `tags`, `author`, `readingTime`,
`searchText`, `draft`, `file`. Adding a field means changing `buildEntry()` and
regenerating — nothing else writes this file.

Two different plain-text extractions exist and the difference is deliberate:
`stripMarkdown()` deletes code blocks (they wreck word counts and fallback summaries),
`searchableText()` keeps their contents and only strips the fence markers, because on
this blog the terms a reader types — `Idempotency-Key`, `soap:Envelope` — live inside the
fences. Use the right one; they are not interchangeable.

### Module pattern: globals, not modules

There is no loader. Each file is an IIFE that hangs one namespace off `window`:

| File | Exports | Responsibility |
| --- | --- | --- |
| `assets/js/config.js` | `window.SITE` | Title, tagline, author, `contentBase`, `postsPerPage`, `wordsPerMinute`, theme hours. The one file you edit to rebrand. |
| `lib/theme.js` | `Theme` | Time-of-day theme decision; runs in `<head>` before paint |
| `lib/frontmatter.js` | `Frontmatter` | Frontmatter parsing, `stripMarkdown`/`searchableText`, `slugify`, `buildEntry` |
| `lib/format.js` | `Fmt` | Date and byline formatting |
| `lib/markdown.js` | `MD` | marked → DOMPurify → highlight + copy buttons + safe external links |
| `lib/store.js` | `Store` | Index and body loading |
| `lib/search.js` | `Search` | Scoring, `<mark>` highlighting, snippets |
| `lib/toc.js` | `Toc` | Heading IDs, contents nav, scroll-spy |
| `ui.js` | — | Shared chrome: branding from `SITE`, theme toggle, footer year |
| `home.js` / `article.js` | — | Page behaviour |

Script tags are ordered by dependency at the bottom of each page (`config.js` and
`lib/theme.js` are the exception — see below). Add a new module and you must add its
`<script>` tag to **every** page that needs it, in the right position, by hand.

There are three pages, and each loads its own hand-maintained subset:

| Page | CDN | Local modules after jQuery |
| --- | --- | --- |
| `index.html` | jQuery | `frontmatter`, `format`, `store`, `search`, `ui`, `home` |
| `article.html` | jQuery, marked, DOMPurify, highlight.js (+ its stylesheet) | `frontmatter`, `format`, `markdown`, `store`, `toc`, `ui`, `article` |
| `tools/publish.html` | jQuery | `frontmatter`, `format`, `ui` (paths are `../assets/...`) |

Shared logic belongs in `assets/js/lib/` and is reused by the site *and* `tools/`.
Do not fork it. `publish.html` is a first-class consumer of `lib/`, not a throwaway
script — it is the only thing that writes `articles.json`.

### Theme resolution happens before paint

`config.js` and `lib/theme.js` load render-blocking at the top of every `<head>`, and
`theme.js` applies `data-theme` on `<html>` as its last statement. Copy both onto any new
page or it will flash the wrong colours. `theme.js` must therefore stay free of jQuery
and of anything that loads at the bottom of the page.

The clock is the only automatic signal — `prefers-color-scheme` is deliberately not
consulted. A manual toggle is stored with the *band* it was made in (`2026-09-17T18`), so
it expires at the next boundary rather than lasting forever; `ui.js` re-checks every 60s
and on `visibilitychange` so the page turns dark at 18:00 without a reload.

### Home page state lives in the URL

`home.js` holds one state object `{ q, tag, page }`, read from the query string on load
and written back with `replaceState` on every change (not `pushState` — Back should
return to the article you came from, not unwind one entry per keystroke). So `?q=`,
`?tag=` and `?page=` are all shareable and reload-safe. Search input is debounced 150ms.
Empty/error states are rendered *beside* the feed, never in place of the filters, so a
filter that matched nothing is always reversible.

### Search is deliberately dumb

No stemming, no fuzzy matching — substring counting over pre-lowered haystacks, which is
both faster and more predictable at this scale. Tokens shorter than two characters are
dropped, and matching is **AND**: a post missing any one token is not a result at all.
Fields are weighted title 10 / tags 6 / summary 3 / body 1, with body hits capped at 5 per
token so a long post cannot out-shout a title match. When a post matched only in the body,
the card shows a snippet instead of the summary — a result with no visible trace of what
you typed reads like a bug. The haystack cache is keyed on the posts *array identity*, so
never mutate the array `Store` handed you; build a new one.

### Constants that must agree across files

These are the ones that break quietly when only one side is changed:

- **1080px** — `WIDE` in `article.js` (decides whether the TOC `<details>` starts open)
  and the media query in `main.css` that turns it into a side rail.
- **`ROOT_MARGIN` / `ACTIVE_LINE`** in `lib/toc.js` describe the same line (the top third
  of the viewport) in two notations; change one and you must change the other.
- **`ninja-theme`** — the `localStorage` key, holding `{ theme, band }`. `Theme.override()`
  still migrates sprint 1's bare `"dark"`/`"light"` string; don't drop that path silently.
- **Theme hours** live only in `config.js`; `theme.js` derives boundaries and bands from
  them, so a hard-coded 18 or 6 anywhere else is a bug.

A TOC is built only from `h2`/`h3` and only when there are at least three of them
(`MINIMUM` in `lib/toc.js`); `Toc.build()` returns `false` otherwise so the caller can
keep the container hidden rather than leave an empty box.

## Conventions

**JavaScript** — ES5-flavoured: `var`, `function` expressions, no `let`/`const`/arrow
functions/template literals anywhere in `assets/`. Every file is an IIFE with
`'use strict';` — `(function ($) { ... })(jQuery)` for page and UI code,
`(function (global) { ... })(window)` for `lib/` modules.

That is a *syntax* rule, not a platform one. Modern browser APIs are already in use and
are fine: `fetch`, `Promise`, `IntersectionObserver`, `matchMedia`, `navigator.clipboard`,
`NodeList.prototype.forEach`. Nothing is polyfilled and nothing is transpiled, so feature-
detect anything that a reader might plausibly lack (`lib/toc.js` bails out without
`IntersectionObserver`; `lib/theme.js` survives a `localStorage` that throws).

jQuery is the DOM idiom. Build nodes (`$('<li class="card"></li>')`) and set text with
`.text()` / `createTextNode` — never interpolate post or reader input into an HTML
string. Rendered Markdown is the single exception and goes through DOMPurify;
`Search.mark()` returns a DocumentFragment rather than markup for the same reason.

**CSS** — every colour is a custom property on `:root`, overridden in one
`[data-theme='dark']` block. Never hard-code a hex outside those two blocks; if you need
a new colour, add a token to both. Class naming is BEM-ish (`.card__title`,
`.site-header__inner`). Use the existing tokens for radius, `--measure`, `--shell` and
`--shell-wide` rather than new magic numbers. Mobile-first.

**HTML** — semantic elements, one `<h1>` per page, a skip link, real `aria-label`s on
icon-only buttons. Relative paths only, no leading `/`, so the site is server-agnostic.

**Comments** — full sentences explaining *why*, only where a reader would otherwise be
puzzled. Match that density; do not narrate obvious code.

**Progressive enhancement** — the page must still say something useful if a CDN script
fails or JS errors. Error states are user-facing copy with a voice — an emoji, a title, a
sentence that says what to do next — not a blank screen. `home.js` and `article.js` each
have their own `showState()` because the pages recover differently (the feed's states sit
beside a still-usable filter bar; the article's replace the whole `<article>`). Keep the
tone, don't merge them.

## Content

Posts are `content/posts/YYYY-MM-DD-slug.md`; the date prefix is for folder sorting and
is stripped when deriving a fallback slug. Frontmatter keys: `title`, `slug`, `date`,
`summary`, `tags`, `author`, `draft`. The parser splits each line on the *first* colon
only, so unquoted colons in a title are fine. `slug` is the URL — keep it stable once
published. `draft: true` hides a post from the site but does not make it private; drafts
belong in `content/posts/_drafts/` (gitignored) until ready.

## Deployment

Upload everything except `tools/`, `README.md` and `CLAUDE.md` to `public_html`. Later
updates usually only need `content/` re-uploaded (the new post plus the regenerated
`articles.json`). `tools/` is local-only — harmless if uploaded, but sprint 4 adds an
`.htaccess` rule blocking it.
