/* Home page: reverse-chronological list of published articles.
   Search, tag filtering and pagination arrive in sprint 2. */
(function ($) {
  'use strict';

  function buildCard(post) {
    var $card = $('<li class="card"></li>');

    $('<p class="meta"></p>').text(window.Fmt.meta(post)).appendTo($card);

    $('<h2 class="card__title"></h2>')
      .append($('<a></a>').attr('href', 'article.html?slug=' + encodeURIComponent(post.slug)).text(post.title))
      .appendTo($card);

    if (post.summary) {
      $('<p class="card__summary"></p>').text(post.summary).appendTo($card);
    }

    (post.tags || []).forEach(function (tag) {
      $('<span class="pill"></span>').text(tag).appendTo($card);
    });

    return $card;
  }

  function showState(emoji, title, $body) {
    $('#feed').remove();
    var $state = $('<div class="state"></div>');
    $('<div class="state__emoji" aria-hidden="true"></div>').text(emoji).appendTo($state);
    $('<p class="state__title"></p>').text(title).appendTo($state);
    $('<p class="state__body"></p>').append($body).appendTo($state);
    $('#main').append($state);
  }

  function reportFailure(error) {
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
    window.Store.load().then(function (posts) {
      if (!posts.length) {
        showState(
          '🥷',
          'No articles yet',
          $('<span></span>').text('The ninja is still sharpening. Write a Markdown file into content/posts and run the publish tool.')
        );
        return;
      }

      var $feed = $('#feed').empty();
      posts.forEach(function (post) { $feed.append(buildCard(post)); });
    }, reportFailure);
  });
})(jQuery);
