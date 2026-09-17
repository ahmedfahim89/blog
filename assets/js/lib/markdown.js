/* Markdown -> sanitised HTML, plus the post-render enhancements (syntax
   highlighting, copy buttons, safe external links).

   Highlighting runs after rendering rather than through a marked plugin:
   marked dropped its built-in `highlight` option, and doing it on real DOM
   nodes means the authoring tool's preview uses this exact same code path. */
(function (global) {
  'use strict';

  var configured = false;

  function configure() {
    if (configured || typeof global.marked === 'undefined') return;
    global.marked.setOptions({ gfm: true, breaks: false });
    configured = true;
  }

  function render(markdownText) {
    configure();
    if (typeof global.marked === 'undefined') return '';
    var raw = global.marked.parse(markdownText || '');
    if (typeof global.DOMPurify !== 'undefined') {
      return global.DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
    }
    return raw;
  }

  function highlight(container) {
    if (typeof global.hljs === 'undefined') return;
    container.querySelectorAll('pre code').forEach(function (block) {
      try {
        global.hljs.highlightElement(block);
      } catch (err) {
        /* An unknown language should never take the article down with it. */
        if (global.console) console.warn('Highlight failed for a code block:', err);
      }
    });
  }

  function addCopyButtons(container) {
    container.querySelectorAll('pre').forEach(function (pre) {
      if (pre.querySelector('.copy-btn')) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-btn';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code to clipboard');

      button.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = code ? code.innerText : pre.innerText;
        navigator.clipboard.writeText(text).then(function () {
          button.textContent = 'Copied';
          button.classList.add('is-copied');
          setTimeout(function () {
            button.textContent = 'Copy';
            button.classList.remove('is-copied');
          }, 1600);
        }, function () {
          button.textContent = 'Press Ctrl+C';
          setTimeout(function () { button.textContent = 'Copy'; }, 2000);
        });
      });

      pre.appendChild(button);
    });
  }

  function secureExternalLinks(container) {
    container.querySelectorAll('a[href]').forEach(function (link) {
      if (link.hostname && link.hostname !== global.location.hostname) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  }

  /* Render into an element and apply every enhancement in one call. */
  function renderInto(container, markdownText) {
    container.innerHTML = render(markdownText);
    highlight(container);
    addCopyButtons(container);
    secureExternalLinks(container);
  }

  global.MD = { render: render, renderInto: renderInto };
})(window);
