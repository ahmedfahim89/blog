/* Article page: resolve ?slug=, load the Markdown, render it, then add the two
   things that make a long post navigable — a table of contents and links to the
   articles either side of it. */
(function ($) {
  'use strict';

  /* Matches the CSS breakpoint where the contents list becomes a side rail. */
  var WIDE = '(min-width: 1080px)';

  function slugFromUrl() {
    var match = /[?&]slug=([^&]+)/.exec(window.location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
  }

  function setDocumentMeta(post) {
    var site = window.SITE || {};
    document.title = post.title + ' · ' + (site.title || '');
    if (post.summary) {
      $('meta[name="description"]').attr('content', post.summary);
    }
  }

  function showState(emoji, title, bodyText) {
    var $state = $('<div class="state"></div>');
    $('<div class="state__emoji" aria-hidden="true"></div>').text(emoji).appendTo($state);
    $('<p class="state__title"></p>').text(title).appendTo($state);
    $('<p class="state__body"></p>').text(bodyText).appendTo($state);
    $('#article').removeClass('article-layout').empty().append($state);
  }

  function renderHeader(post) {
    $('#article-meta').text(window.Fmt.meta(post, { withAuthor: true }));
    $('#article-title').text(post.title);

    if (post.summary) {
      $('#article-summary').text(post.summary);
    } else {
      $('#article-summary').remove();
    }

    var $tags = $('#article-tags');
    (post.tags || []).forEach(function (tag) {
      $('<a class="pill"></a>')
        .attr('href', 'index.html?tag=' + encodeURIComponent(tag))
        .text(tag)
        .appendTo($tags);
    });
  }

  function neighbourLink(label, post, extraClass) {
    var $link = $('<a class="prevnext__link"></a>')
      .addClass(extraClass)
      .attr('href', 'article.html?slug=' + encodeURIComponent(post.slug));

    $('<span class="prevnext__label"></span>').text(label).appendTo($link);
    $('<span class="prevnext__title"></span>').text(post.title).appendTo($link);

    return $link;
  }

  /* The index is sorted newest first, so the entry before this one is the newer
     article and the entry after it is the older one. "Newer"/"Older" rather than
     previous/next, which is ambiguous once the list runs backwards in time.
     Any tag filter the reader came from is ignored on purpose: chronology is the
     article page's only ordering. */
  function renderNeighbours(posts, slug) {
    var $nav = $('#prevnext');
    var index = -1;
    var i;

    for (i = 0; i < posts.length; i += 1) {
      if (posts[i].slug === slug) index = i;
    }

    if (index === -1) return;

    if (posts[index - 1]) $nav.append(neighbourLink('Newer', posts[index - 1], 'prevnext__link--newer'));
    if (posts[index + 1]) $nav.append(neighbourLink('Older', posts[index + 1], 'prevnext__link--older'));

    if ($nav.children().length) $nav.prop('hidden', false);
  }

  /* The rail is always expanded; below the breakpoint it collapses so a long
     contents list does not push the article off the first screen. */
  function syncTocOpen() {
    var toc = document.getElementById('toc');
    if (!toc) return;
    toc.open = !!(window.matchMedia && window.matchMedia(WIDE).matches);
  }

  function buildToc() {
    var built = window.Toc.build(
      document.getElementById('article-body'),
      document.getElementById('toc-nav')
    );
    var query;

    if (!built) return;

    $('#toc').prop('hidden', false);
    syncTocOpen();

    if (window.matchMedia) {
      query = window.matchMedia(WIDE);
      if (query.addEventListener) {
        query.addEventListener('change', syncTocOpen);
      } else if (query.addListener) {
        query.addListener(syncTocOpen);
      }
    }
  }

  $(function () {
    var slug = slugFromUrl();

    if (!slug) {
      showState('🤔', 'No article requested', 'This page needs a ?slug= parameter. Head back to the home page and pick an article.');
      return;
    }

    window.Store.load().then(function (posts) {
      var post = posts.filter(function (entry) { return entry.slug === slug; })[0];

      if (!post) {
        showState('🥷', 'That article slipped away', 'Nothing published under "' + slug + '". It may be a draft, or the link may be stale.');
        return;
      }

      renderHeader(post);
      setDocumentMeta(post);
      renderNeighbours(posts, slug);

      return window.Store.loadBody(post).then(function (body) {
        window.MD.renderInto(document.getElementById('article-body'), body);
        buildToc();
      });
    }).catch(function (error) {
      if (error && error.message === 'NOT_SERVED') {
        showState('🔌', 'Open this through a local server', 'Browsers block fetch() on file:// pages. In VS Code, right-click index.html and choose "Open with Live Server".');
        return;
      }
      showState('🧩', 'Could not load this article', 'The index loaded but the Markdown file did not. Check that the file exists in content/posts.');
      if (window.console) console.error(error);
    });
  });
})(jQuery);
