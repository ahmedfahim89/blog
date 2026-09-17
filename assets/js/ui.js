/* Shared chrome: site identity from config.js, theme toggle, footer year.
   The initial theme is applied by a tiny inline script in each page's <head>
   so the page never flashes the wrong colours before this file loads. */
(function ($) {
  'use strict';

  var STORAGE_KEY = 'ninja-theme';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      /* Private browsing can refuse storage; the toggle should still work for
         this page view. */
    }
    $('.theme-toggle')
      .text(theme === 'dark' ? '☀' : '☾')
      .attr('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  $(function () {
    var site = window.SITE || {};

    $('.brand__title').text(site.title || 'Blog');
    $('.brand__tagline').text(site.tagline || '');
    $('.brand__mark').text((site.title || 'B').charAt(0));
    $('.footer-author').text(site.author || '');
    $('.footer-year').text(new Date().getFullYear());

    applyTheme(currentTheme());

    $('.theme-toggle').on('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });
})(jQuery);
