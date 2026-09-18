/* Table of contents for a rendered article: heading IDs, the nav itself, and a
   scroll-spy that marks the section you are currently reading.

   In lib/ rather than article.js because the sprint 3 editor previews articles
   with the same chrome, and a TOC that only exists on the published page would
   be a preview that lies. */
(function (global) {
  'use strict';

  /* A two-item contents list is noise: the headings are already visible on one
     screen and the rail just repeats them. */
  var MINIMUM = 3;

  /* A heading counts as "the one you are reading" once it has passed the top
     third of the viewport, which is roughly where the eye sits. The two values
     describe the same line and must agree. */
  var ROOT_MARGIN = '0px 0px -70% 0px';
  var ACTIVE_LINE = 0.3;

  function uniqueId(base, taken) {
    var id = base || 'section';
    var n = 2;

    while (taken[id]) {
      id = base + '-' + n;
      n += 1;
    }

    taken[id] = true;
    return id;
  }

  /* The observer is only the trigger. Each time it fires we work out afresh
     which heading the reader is under, rather than reacting to one crossing at
     a time — a fast scroll that skips past three headings at once still has to
     leave the right one marked. */
  function spy(links, headings) {
    var active = null;
    var observer;

    if (!global.IntersectionObserver) return;

    function refresh() {
      var line = global.innerHeight * ACTIVE_LINE;
      var current = null;

      headings.forEach(function (heading) {
        if (heading.getBoundingClientRect().top <= line) current = links[heading.id];
      });

      if (current === active) return;
      if (active) active.classList.remove('is-active');
      active = current;
      if (active) active.classList.add('is-active');
    }

    observer = new global.IntersectionObserver(refresh, { rootMargin: ROOT_MARGIN });
    headings.forEach(function (heading) { observer.observe(heading); });
  }

  /* Returns false when it decided not to render, so the caller can hide the
     container rather than leave an empty box on the page. */
  function build(bodyEl, navEl) {
    var headings = [];
    var taken = {};
    var links = {};
    var list;

    if (!bodyEl || !navEl) return false;

    Array.prototype.forEach.call(bodyEl.querySelectorAll('h2, h3'), function (heading) {
      headings.push(heading);
    });

    if (headings.length < MINIMUM) return false;

    list = document.createElement('ol');
    list.className = 'toc__list';

    headings.forEach(function (heading) {
      var text = heading.textContent || '';
      var item = document.createElement('li');
      var link = document.createElement('a');

      heading.id = heading.id || uniqueId(global.Frontmatter.slugify(text), taken);
      taken[heading.id] = true;

      item.className = 'toc__item toc__item--' + heading.tagName.toLowerCase();
      link.className = 'toc__link';
      link.href = '#' + heading.id;
      link.appendChild(document.createTextNode(text));

      links[heading.id] = link;
      item.appendChild(link);
      list.appendChild(item);
    });

    navEl.appendChild(list);
    spy(links, headings);

    return true;
  }

  global.Toc = { build: build };
})(window);
