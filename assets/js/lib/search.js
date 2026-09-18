/* Client-side full-text search over the loaded index. Lives in lib/ because the
   home page and sprint 3's article table need the identical behaviour.

   There is no stemming and no fuzzy matching: with a few dozen posts, plain
   substring matching over pre-lowered haystacks is both faster and more
   predictable than anything cleverer. */
(function (global) {
  'use strict';

  /* Title beats tags beats summary beats body, so a post named after the term
     outranks one that merely mentions it in passing. */
  var WEIGHT = { title: 10, tags: 6, summary: 3, body: 1 };

  /* One long article should not out-score a title match by sheer repetition. */
  var BODY_CAP = 5;

  var cachedFor = null;
  var cachedHaystacks = null;

  function tokenize(query) {
    return String(query || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(function (token) { return token.length >= 2; });
  }

  /* Built once per index load and held in a parallel array: the post objects
     themselves are never mutated, so nothing downstream sees our scratch data. */
  function haystacks(posts) {
    if (cachedFor === posts) return cachedHaystacks;

    cachedHaystacks = posts.map(function (post) {
      return {
        title: String(post.title || '').toLowerCase(),
        tags: (post.tags || []).join(' ').toLowerCase(),
        summary: String(post.summary || '').toLowerCase(),
        body: String(post.searchText || '').toLowerCase()
      };
    });
    cachedFor = posts;

    return cachedHaystacks;
  }

  function count(haystack, token, cap) {
    var total = 0;
    var at = haystack.indexOf(token);

    while (at !== -1) {
      total += 1;
      if (cap && total >= cap) break;
      at = haystack.indexOf(token, at + token.length);
    }

    return total;
  }

  /* AND semantics: a post that is missing any one token is not a result at all,
     however often it repeats the others. */
  function score(hay, tokens) {
    var head = 0;
    var body = 0;
    var i, token, hits, bodyHits;

    for (i = 0; i < tokens.length; i += 1) {
      token = tokens[i];
      hits =
        count(hay.title, token) * WEIGHT.title +
        count(hay.tags, token) * WEIGHT.tags +
        count(hay.summary, token) * WEIGHT.summary;
      bodyHits = count(hay.body, token, BODY_CAP);

      if (!hits && !bodyHits) return null;

      head += hits;
      body += bodyHits * WEIGHT.body;
    }

    return { total: head + body, bodyOnly: head === 0 };
  }

  function run(posts, query) {
    var tokens = tokenize(query);
    var hays = haystacks(posts);
    var results = [];

    if (!tokens.length) {
      return posts.map(function (post) {
        return { post: post, score: 0, bodyOnly: false };
      });
    }

    posts.forEach(function (post, index) {
      var scored = score(hays[index], tokens);
      if (scored) {
        results.push({ post: post, score: scored.total, bodyOnly: scored.bodyOnly });
      }
    });

    return results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.post.date || '').localeCompare(String(a.post.date || ''));
    });
  }

  /* Every occurrence of every token, merged so two tokens that overlap in the
     text do not produce nested <mark> elements. */
  function ranges(lower, tokens) {
    var found = [];
    var merged = [];
    var i, at, last;

    for (i = 0; i < tokens.length; i += 1) {
      at = lower.indexOf(tokens[i]);
      while (at !== -1) {
        found.push([at, at + tokens[i].length]);
        at = lower.indexOf(tokens[i], at + tokens[i].length);
      }
    }

    found.sort(function (a, b) { return a[0] - b[0]; });

    found.forEach(function (range) {
      last = merged[merged.length - 1];
      if (last && range[0] <= last[1]) {
        last[1] = Math.max(last[1], range[1]);
      } else {
        merged.push([range[0], range[1]]);
      }
    });

    return merged;
  }

  /* Returns DOM nodes, never an HTML string. Highlighting is the one place in
     this codebase where a reader's own input is written back to the page, so it
     keeps the same .text()/createTextNode discipline as everything else. */
  function mark(text, tokens) {
    var source = String(text || '');
    var fragment = document.createDocumentFragment();
    var cursor = 0;

    ranges(source.toLowerCase(), tokens || []).forEach(function (range) {
      var hit;
      if (range[0] > cursor) {
        fragment.appendChild(document.createTextNode(source.slice(cursor, range[0])));
      }
      hit = document.createElement('mark');
      hit.appendChild(document.createTextNode(source.slice(range[0], range[1])));
      fragment.appendChild(hit);
      cursor = range[1];
    });

    if (cursor < source.length) {
      fragment.appendChild(document.createTextNode(source.slice(cursor)));
    }

    return fragment;
  }

  /* Picks the occurrence with the most of the query's other tokens around it,
     rather than simply the first one: searching two words should show the place
     where both appear, not the first stray mention of either. */
  function anchor(lower, tokens, span) {
    var best = 0;
    var bestScore = -1;
    var at, near, found, i, j;

    for (i = 0; i < tokens.length; i += 1) {
      at = lower.indexOf(tokens[i]);
      while (at !== -1) {
        near = 0;
        for (j = 0; j < tokens.length; j += 1) {
          found = lower.indexOf(tokens[j], Math.max(0, at - span));
          if (found !== -1 && found <= at + span) near += 1;
        }
        if (near > bestScore || (near === bestScore && at < best)) {
          bestScore = near;
          best = at;
        }
        at = lower.indexOf(tokens[i], at + tokens[i].length);
      }
    }

    return best;
  }

  /* A window of context around the best match, trimmed to word boundaries so
     it never starts or ends mid-word. */
  function snippet(text, tokens, radius) {
    var source = String(text || '');
    var lower = source.toLowerCase();
    var span = typeof radius === 'number' ? radius : 70;
    var at = anchor(lower, tokens || [], span);
    var start, end, space, tail;

    start = Math.max(0, at - span);
    end = Math.min(source.length, at + span);

    if (start > 0) {
      space = source.indexOf(' ', start);
      if (space !== -1 && space < at) start = space + 1;
    }

    if (end < source.length) {
      tail = source.lastIndexOf(' ', end);
      if (tail > at) end = tail;
    }

    return (start > 0 ? '… ' : '') + source.slice(start, end).trim() + (end < source.length ? ' …' : '');
  }

  global.Search = {
    tokenize: tokenize,
    run: run,
    snippet: snippet,
    mark: mark
  };
})(window);
