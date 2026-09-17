# Integration Ninja

A static blog about APIs, middleware and messaging. No build step, no database,
no server-side code — just files you upload.

**Sprint 1 of 4.** Working today: write articles, list them, read them.
Search, tags and the full browser editor arrive in sprints 2 and 3.

---

## Previewing it locally

You cannot just double-click `index.html`. Browsers block `fetch()` on
`file://` pages, so the article index will never load and you will get a
"open this through a local server" message instead.

Use the included server — it needs nothing installed:

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Then open <http://localhost:8080>. Press `Ctrl+C` in that window to stop it.
If port 8080 is taken, pass another one: `-Port 8081`.

VS Code's **Live Server** extension works too, if you prefer it.

---

## Writing an article

1. Create a file in `content/posts/`. Name it `YYYY-MM-DD-some-slug.md` — the
   date prefix keeps the folder sorted, and is ignored when building URLs.

2. Start it with frontmatter:

   ```markdown
   ---
   title: Idempotency, or how to stop apologising for retries
   slug: idempotency-explained
   date: 2026-09-11
   summary: One sentence that shows on the home page card.
   tags: [apis, reliability]
   author: Ahmed Fahim
   draft: false
   ---

   Your article, in Markdown.
   ```

   Colons inside the title are fine — no quoting needed. `slug` is what appears
   in the URL, so keep it stable once published; changing it breaks old links.

3. Write the body in normal Markdown. Fenced code blocks get syntax
   highlighting and a copy button — tag them with a language:

   ````markdown
   ```bash
   curl -X POST https://api.shop.io/orders
   ```
   ````

   Languages worth knowing: `bash`, `json`, `xml`, `yaml`, `sql`, `java`,
   `javascript`, `properties`.

4. **Rebuild the index.** Open `tools/publish.html`, point it at
   `content/posts`, and save the downloaded `articles.json` over
   `content/articles.json`.

   This step is not optional. The site reads `articles.json`, not the folder —
   a new post that is not in the index simply will not appear.

5. Refresh the preview and check it.

### Drafts

Set `draft: true` and the post is hidden from the home page. It is **not**
private: if you upload the file, anyone with the URL can read it. Keep drafts
on your machine until they are ready.

---

## Deploying to Hostinger

1. In hPanel, open **File Manager** and go to `public_html`.
2. Upload everything in this folder except `tools/` and `README.md`:
   - `index.html`, `article.html`
   - `assets/`
   - `content/`
3. Visit your domain. It should look exactly like the local preview.

For later updates you usually only need to re-upload `content/` — the article
you added, plus the regenerated `articles.json`.

Uploading a zip and extracting it in File Manager is much faster than uploading
files one at a time.

> `tools/` is for your machine only. It is harmless if uploaded, but there is
> no reason to put it on the internet. Sprint 4 adds an `.htaccess` rule that
> blocks it outright.

---

## What is in here

```
index.html            Home page — the article list
article.html          Single article view (?slug=...)
assets/css/main.css   Design system: colours, layout, light and dark themes
assets/css/code.css   Code block styling (deliberately dark in both themes)
assets/js/config.js   Site title, tagline, author. Edit this to rebrand.
assets/js/lib/        Shared logic used by both the site and the tools
assets/js/home.js     Home page behaviour
assets/js/article.js  Article page behaviour
content/posts/*.md    Your articles
content/articles.json Generated index — never edit by hand
tools/publish.html    Rebuilds articles.json
tools/serve.ps1       Local preview server
```

Third-party libraries (jQuery, marked, DOMPurify, highlight.js) load from
cdnjs with integrity hashes, so a tampered file will be refused by the browser.
Nothing is bundled and nothing is installed.

---

## Still to come

- **Sprint 2** — search, tag filtering, pagination, table of contents
- **Sprint 3** — a real browser editor: create, edit and delete without a text editor
- **Sprint 4** — clean URLs, link previews, sitemap, a joke 404
