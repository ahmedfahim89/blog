/* Loads content/articles.json once and hands out the published posts.
   Everything downstream reads from here so the index is fetched a single time
   per page load. */
(function (global) {
  'use strict';

  var pending = null;

  function base() {
    return (global.SITE && global.SITE.contentBase) || 'content';
  }

  function byDateDesc(a, b) {
    return String(b.date || '').localeCompare(String(a.date || ''));
  }

  /* file: and data: pages have an opaque origin, so fetch refuses before it
     ever hits the network. Detect any non-http(s) origin up front and say so,
     rather than showing a bare "Failed to fetch" that reads like a missing
     file and sends you hunting for a bug that is not there. */
  function isUnservedFile() {
    return !/^https?:$/.test(global.location.protocol);
  }

  function load() {
    if (pending) return pending;

    if (isUnservedFile()) {
      pending = Promise.reject(new Error('NOT_SERVED'));
      return pending;
    }

    pending = fetch(base() + '/articles.json', { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Index request failed: ' + response.status);
        return response.json();
      })
      .then(function (index) {
        var posts = (index && index.posts) || [];
        return posts.filter(function (post) { return !post.draft; }).sort(byDateDesc);
      });

    return pending;
  }

  function find(slug) {
    return load().then(function (posts) {
      return posts.filter(function (post) { return post.slug === slug; })[0] || null;
    });
  }

  /* Takes the post, not the slug: filenames are usually date-prefixed
     ("2026-09-17-rest-vs-soap.md") while slugs are not, so the index carries
     the real filename and we use it. */
  function loadBody(post) {
    var filename = (post && post.file) || (post && post.slug + '.md');
    return fetch(base() + '/posts/' + filename, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Article request failed: ' + response.status);
        return response.text();
      })
      .then(function (text) { return global.Frontmatter.parse(text).body; });
  }

  global.Store = {
    load: load,
    find: find,
    loadBody: loadBody,
    isUnservedFile: isUnservedFile
  };
})(window);
