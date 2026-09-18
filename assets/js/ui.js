/* Shared chrome: site identity from config.js, theme toggle, footer year.
   The theme itself is decided by lib/theme.js, which runs in each page's <head>
   before paint; this file only wires up the button and keeps it in step. */
(function ($) {
  'use strict';

  function hourLabel(hour) {
    var suffix = hour < 12 ? 'am' : 'pm';
    return (hour % 12 || 12) + suffix;
  }

  /* The toggle is a two-state button with a three-state rule behind it, so it
     says out loud what it is currently doing and when that expires. */
  function describe(theme) {
    var ends = hourLabel(window.Theme.nextBoundary());
    if (window.Theme.override()) {
      return 'Your choice: ' + theme + ' until ' + ends + ', then back to the clock';
    }
    return 'Following the clock — ' + theme + ' until ' + ends;
  }

  function paintToggle(theme) {
    $('.theme-toggle')
      .text(theme === 'dark' ? '☀' : '☾')
      .attr('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')
      .attr('title', describe(theme));
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  /* Re-resolves the clock without touching the reader's stored choice. Called
     on a timer so someone reading at 17:58 sees the site turn dark at 18:00
     without reloading — the old band's override has expired by then anyway. */
  function recheck() {
    paintToggle(window.Theme.apply(window.Theme.resolve()));
  }

  $(function () {
    var site = window.SITE || {};

    $('.brand__title').text(site.title || 'Blog');
    $('.brand__tagline').text(site.tagline || '');
    $('.brand__mark').text((site.title || 'B').charAt(0));
    $('.footer-author').text(site.author || '');
    $('.footer-year').text(new Date().getFullYear());

    paintToggle(currentTheme());

    $('.theme-toggle').on('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      window.Theme.apply(next);
      window.Theme.save(next);
      paintToggle(next);
    });

    setInterval(recheck, 60000);
    $(document).on('visibilitychange', function () {
      if (!document.hidden) recheck();
    });
  });
})(jQuery);
