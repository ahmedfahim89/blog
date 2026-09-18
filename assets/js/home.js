/* Home page: the article list, plus the three things that keep it usable as it
   grows — full-text search, tag filtering and pagination.

   All three are one piece of state ({ q, tag, page }) read from the URL on load
   and written back on every change, so any view of the list is a link someone
   can share or reload into. */
(function ($) {
  'use strict';

  var allPosts = [];
  var state = { q: '', tag: '', page: 1 };
  var typing = null;
  var refocus = null;

  function param(name) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
  }

  function readState() {
    state.q = param('q');
    state.tag = param('tag');
    state.page = Math.max(1, parseInt(param('page'), 10) || 1);
  }

  /* replaceState rather than pushState: the Back button should take you to the
     article you arrived from, not unwind one history entry per keystroke. */
  function writeState() {
    var parts = [];

    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.tag) parts.push('tag=' + encodeURIComponent(state.tag));
    if (state.page > 1) parts.push('page=' + state.page);

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + (parts.length ? '?' + parts.join('&') : ''));
    }
  }

  function perPage() {
    return (window.SITE && window.SITE.postsPerPage) || 8;
  }

  function buildCard(result, tokens) {
    var post = result.post;
    var $card = $('<li class="card"></li>');

    $('<p class="meta"></p>').text(window.Fmt.meta(post)).appendTo($card);

    $('<h2 class="card__title"></h2>')
      .append($('<a></a>')
        .attr('href', 'article.html?slug=' + encodeURIComponent(post.slug))
        .append(window.Search.mark(post.title, tokens)))
      .appendTo($card);

    if (result.bodyOnly && post.searchText) {
      /* The term is somewhere in the body, so show where. A result with no
         visible trace of what you typed reads like a bug. */
      $('<p class="card__snippet"></p>')
        .append(window.Search.mark(window.Search.snippet(post.searchText, tokens), tokens))
        .appendTo($card);
    } else if (post.summary) {
      $('<p class="card__summary"></p>')
        .append(window.Search.mark(post.summary, tokens))
        .appendTo($card);
    }

    (post.tags || []).forEach(function (tag) {
      $('<a class="pill"></a>')
        .attr('href', '?tag=' + encodeURIComponent(tag))
        .attr('data-tag', tag)
        .text(tag)
        .appendTo($card);
    });

    return $card;
  }

  /* States sit beside the feed rather than replacing it, because a filter that
     matched nothing has to be reversible: clear the query and the list is back. */
  function showState(emoji, title, $body, $action) {
    var $state = $('<div class="state" id="feed-state"></div>');

    $('<div class="state__emoji" aria-hidden="true"></div>').text(emoji).appendTo($state);
    $('<p class="state__title"></p>').text(title).appendTo($state);
    $('<p class="state__body"></p>').append($body).appendTo($state);
    if ($action) $('<p class="state__action"></p>').append($action).appendTo($state);

    $('#feed-state').remove();
    $('#feed').empty().prop('hidden', true).after($state);
  }

  function hideState() {
    $('#feed-state').remove();
    $('#feed').prop('hidden', false);
  }

  /* Union of the tags in the index, most used first then alphabetically. */
  function tagsByUse(posts) {
    var counts = {};

    posts.forEach(function (post) {
      (post.tags || []).forEach(function (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    });
  }

  function chip(label, tag) {
    var active = state.tag === tag;
    return $('<button type="button" class="pill"></button>')
      .text(label)
      .attr('data-tag', tag)
      .attr('aria-pressed', active ? 'true' : 'false')
      .toggleClass('is-active', active);
  }

  function renderTagbar() {
    var $bar = $('#tagbar').empty();

    $bar.append(chip('All', ''));
    tagsByUse(allPosts).forEach(function (tag) {
      $bar.append(chip(tag, tag));
    });
  }

  function pagerButton(label, page, disabled) {
    return $('<button type="button" class="pager__btn"></button>')
      .text(label)
      .attr('data-page', page)
      .prop('disabled', !!disabled);
  }

  function renderPager(pages) {
    var $pager = $('#pager').empty();
    var page;

    /* One page of results needs no navigation at all. */
    if (pages < 2) {
      $pager.prop('hidden', true);
      return;
    }

    $pager.prop('hidden', false);
    $pager.append(pagerButton('← Newer', state.page - 1, state.page === 1));

    for (page = 1; page <= pages; page += 1) {
      $pager.append(
        pagerButton(String(page), page, page === state.page)
          .toggleClass('is-current', page === state.page)
          .attr('aria-label', 'Page ' + page)
          .attr('aria-current', page === state.page ? 'page' : null)
      );
    }

    $pager.append(pagerButton('Older →', state.page + 1, state.page === pages));
  }

  function countText(total) {
    var noun = total === 1 ? 'article' : 'articles';

    if (state.q && state.tag) return total + ' ' + noun + ' matching “' + state.q + '” in ' + state.tag;
    if (state.q) return total + ' ' + noun + ' matching “' + state.q + '”';
    if (state.tag) return total + ' ' + noun + ' tagged ' + state.tag;
    return total + ' ' + noun;
  }

  function showEmpty() {
    showState(
      '🕵️',
      'Nothing matched that',
      $('<span></span>').text('The ninja searched every article and came back empty-handed. Try a shorter term, or start again.'),
      $('<button type="button" class="btn-clear" id="clear-filters"></button>').text('Clear filters')
    );
  }

  function render() {
    var tokens = window.Search.tokenize(state.q);
    var results = window.Search.run(allPosts, state.q).filter(function (result) {
      return !state.tag || (result.post.tags || []).indexOf(state.tag) !== -1;
    });
    var pages = Math.max(1, Math.ceil(results.length / perPage()));
    var start;
    var $feed;

    if (state.page > pages) state.page = pages;
    start = (state.page - 1) * perPage();

    $('#result-count').text(countText(results.length));
    $('#q-clear').prop('hidden', !state.q);
    renderTagbar();

    if (!results.length) {
      renderPager(1);
      showEmpty();
    } else {
      hideState();
      $feed = $('#feed').empty();
      results.slice(start, start + perPage()).forEach(function (result) {
        $feed.append(buildCard(result, tokens));
      });
      renderPager(pages);
    }

    writeState();

    /* Rebuilding the chips and the pager throws away the element the reader was
       standing on, so put them back where they were. */
    if (refocus) {
      $(refocus).filter(':not(:disabled)').first().trigger('focus');
      refocus = null;
    }
  }

  function reportFailure(error) {
    $('.filters, #result-count, #pager').prop('hidden', true);

    if (error && error.message === 'NOT_SERVED') {
      showState(
        '🔌',
        'Open this through a local server',
        $('<span></span>').append(
          document.createTextNode('Browsers block '),
          $('<code></code>').text('fetch()'),
          document.createTextNode(
            ' on file:// pages, so the article index cannot load. In VS Code, right-click index.html and choose "Open with Live Server". On Hostinger it just works.'
          )
        )
      );
      return;
    }

    showState(
      '🧩',
      'Could not load the article index',
      $('<span></span>').append(
        document.createTextNode('Check that '),
        $('<code></code>').text('content/articles.json'),
        document.createTextNode(' exists. Regenerate it with tools/publish.html if it does not.')
      )
    );

    if (window.console) console.error(error);
  }

  $(function () {
    readState();
    $('#q').val(state.q);

    $('.search').on('submit', function (event) {
      event.preventDefault();
    });

    $('#q').on('input', function () {
      var value = this.value;
      clearTimeout(typing);
      /* Short enough to feel instant, long enough that a fast typist does not
         re-render the whole list once per character. */
      typing = setTimeout(function () {
        state.q = value;
        state.page = 1;
        render();
      }, 150);
    });

    $('#q-clear').on('click', function () {
      $('#q').val('').trigger('focus');
      state.q = '';
      state.page = 1;
      render();
    });

    $('#tagbar').on('click', '.pill', function () {
      state.tag = $(this).attr('data-tag') || '';
      state.page = 1;
      refocus = '#tagbar .pill[data-tag="' + state.tag + '"]';
      render();
    });

    /* A card's tags are real links so they can be opened in a new tab, but an
       ordinary click filters in place instead of reloading the index. */
    $('#feed').on('click', '.pill', function (event) {
      if (event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      state.tag = $(this).attr('data-tag') || '';
      state.page = 1;
      render();
      window.scrollTo(0, 0);
    });

    $('#pager').on('click', '.pager__btn', function () {
      state.page = parseInt($(this).attr('data-page'), 10) || 1;
      refocus = '#pager .pager__btn[data-page="' + state.page + '"]';
      render();
      window.scrollTo(0, 0);
    });

    $('#main').on('click', '#clear-filters', function () {
      state.q = '';
      state.tag = '';
      state.page = 1;
      $('#q').val('').trigger('focus');
      render();
    });

    window.Store.load().then(function (posts) {
      allPosts = posts;

      if (!posts.length) {
        $('.filters, #result-count, #pager').prop('hidden', true);
        showState(
          '🥷',
          'No articles yet',
          $('<span></span>').text('The ninja is still sharpening. Write a Markdown file into content/posts and run the publish tool.')
        );
        return;
      }

      render();
    }, reportFailure);
  });
})(jQuery);
