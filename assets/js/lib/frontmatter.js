/* Frontmatter parsing plus the helpers that turn a .md file into an index entry.
   Shared by the live site and by tools/publish.html, so the site and the
   generated index can never disagree about what a post means. */
(function (global) {
  'use strict';

  var FENCE = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

  function unquote(value) {
    if (value.length > 1) {
      var first = value.charAt(0);
      var last = value.charAt(value.length - 1);
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return value.slice(1, -1);
      }
    }
    return value;
  }

  /* Accepts "[a, b]" or "a, b". Empty entries are dropped so a trailing
     comma does not produce a blank tag. */
  function parseTags(value) {
    var inner = value.replace(/^\[/, '').replace(/\]$/, '');
    return inner
      .split(',')
      .map(function (tag) { return unquote(tag.trim()).toLowerCase(); })
      .filter(Boolean);
  }

  function coerce(key, value) {
    if (key === 'tags') return parseTags(value);
    if (key === 'draft') return value === 'true' || value === 'yes';
    return unquote(value);
  }

  /* Splits each line on the FIRST colon only, so an unquoted colon inside a
     title ("REST vs SOAP: the truce...") survives intact. */
  function parse(text) {
    var match = FENCE.exec(text);
    if (!match) return { data: {}, body: text, hasFrontmatter: false };

    var data = {};
    match[1].split(/\r?\n/).forEach(function (line) {
      if (!line.trim() || line.trim().charAt(0) === '#') return;
      var colon = line.indexOf(':');
      if (colon === -1) return;
      var key = line.slice(0, colon).trim();
      if (!key) return;
      data[key] = coerce(key, line.slice(colon + 1).trim());
    });

    return { data: data, body: text.slice(match[0].length), hasFrontmatter: true };
  }

  /* Good-enough plain text for search and word counts: drop code blocks
     entirely (they skew word counts badly) then unwrap the common inline marks. */
  function stripMarkdown(body) {
    return body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/[*_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* The same unwrapping, but code survives: on a blog about APIs the terms a
     reader will actually type — `Idempotency-Key`, `soap:Envelope` — live only
     inside code fences, so deleting them would make search miss the best
     matches. Only the fence markers and the language tag go.

     Underscores are left alone here (unlike stripMarkdown) because in code they
     are part of the identifier: `request_hash` must stay findable. */
  function searchableText(body) {
    return body
      .replace(/^\s*```[^\n]*$/gm, ' ')
      .replace(/`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/[*~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readingTime(plainText) {
    var perMinute = (global.SITE && global.SITE.wordsPerMinute) || 220;
    var words = plainText ? plainText.split(/\s+/).length : 0;
    return Math.max(1, Math.round(words / perMinute));
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* Builds one entry for content/articles.json. `filename` is only used as a
     fallback when the post forgot its slug. */
  function buildEntry(text, filename) {
    var parsed = parse(text);
    var data = parsed.data;
    var plain = stripMarkdown(parsed.body);
    var fallbackSlug = String(filename || '')
      .replace(/\.md$/i, '')
      .replace(/^\d{4}-\d{2}-\d{2}-/, '');

    return {
      slug: data.slug || slugify(fallbackSlug),
      title: data.title || 'Untitled',
      date: data.date || '',
      summary: data.summary || plain.slice(0, 160),
      tags: data.tags || [],
      author: data.author || (global.SITE && global.SITE.author) || '',
      readingTime: readingTime(plain),
      /* Kept in its original casing — snippets are displayed verbatim, and
         lowercasing happens once at query time instead. */
      searchText: searchableText(parsed.body),
      draft: data.draft === true,
      file: filename || ''
    };
  }

  global.Frontmatter = {
    parse: parse,
    stripMarkdown: stripMarkdown,
    searchableText: searchableText,
    readingTime: readingTime,
    slugify: slugify,
    buildEntry: buildEntry
  };
})(window);
