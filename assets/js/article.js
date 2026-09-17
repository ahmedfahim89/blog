/* Article page: resolve ?slug=, load the Markdown, render it.
   Table of contents and prev/next navigation arrive in sprint 2. */
(function ($) {
  'use strict';

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
    $('#article').empty().append($state);
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
      $('<span class="pill"></span>').text(tag).appendTo($tags);
    });
  }

  $(function () {
    var slug = slugFromUrl();

    if (!slug) {
      showState('🤔', 'No article requested', 'This page needs a ?slug= parameter. Head back to the home page and pick an article.');
      return;
    }

    window.Store.find(slug).then(function (post) {
      if (!post) {
        showState('🥷', 'That article slipped away', 'Nothing published under "' + slug + '". It may be a draft, or the link may be stale.');
        return;
      }

      renderHeader(post);
      setDocumentMeta(post);

      return window.Store.loadBody(post).then(function (body) {
        window.MD.renderInto(document.getElementById('article-body'), body);
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
