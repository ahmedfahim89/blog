/* Time-of-day theming: dark between SITE.darkFrom and SITE.darkUntil on the
   reader's own clock, light the rest of the day. The OS `prefers-color-scheme`
   is no longer consulted — the clock is the only automatic signal.

   This file is loaded synchronously at the top of every <head>, before paint,
   so the page never flashes the wrong colours. It must therefore stay free of
   jQuery and of anything else that loads at the bottom of the page. */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'ninja-theme';

  function hours() {
    var site = global.SITE || {};
    return {
      from: typeof site.darkFrom === 'number' ? site.darkFrom : 18,
      until: typeof site.darkUntil === 'number' ? site.darkUntil : 6
    };
  }

  function pad(value) {
    return (value < 10 ? '0' : '') + value;
  }

  /* The two hours at which the theme can change, ascending. */
  function boundaries() {
    var h = hours();
    if (h.from === h.until) return [h.from];
    return h.from < h.until ? [h.from, h.until] : [h.until, h.from];
  }

  function auto(now) {
    var h = hours();
    var hour = (now || new Date()).getHours();
    var dark = h.from > h.until
      ? (hour >= h.from || hour < h.until)
      : (hour >= h.from && hour < h.until);
    return dark ? 'dark' : 'light';
  }

  /* Names the day or night period we are in by the moment it began, so a
     toggle at 9pm and a toggle at 1am the same night share one band — and both
     stop applying at the same 6am boundary. */
  function band(now) {
    var at = now || new Date();
    var hour = at.getHours();
    var edges = boundaries();
    var day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    var start = null;
    var i;

    for (i = 0; i < edges.length; i += 1) {
      if (edges[i] <= hour) start = edges[i];
    }

    if (start === null) {
      /* Nothing has started yet today, so this period began before midnight. */
      start = edges[edges.length - 1];
      day.setDate(day.getDate() - 1);
    }

    return day.getFullYear() + '-' + pad(day.getMonth() + 1) + '-' + pad(day.getDate()) + 'T' + pad(start);
  }

  /* The hour at which the current band ends, for explaining the toggle. */
  function nextBoundary(now) {
    var hour = (now || new Date()).getHours();
    var edges = boundaries();
    var i;

    for (i = 0; i < edges.length; i += 1) {
      if (edges[i] > hour) return edges[i];
    }

    return edges[0];
  }

  function save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: theme, band: band() }));
    } catch (err) {
      /* Private browsing can refuse storage; the choice still holds for this
         page view. */
    }
  }

  /* The reader's manual choice, or null when the clock should decide. */
  function override() {
    var raw = null;
    var saved;

    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }

    if (!raw) return null;

    /* Sprint 1 stored a bare "dark"/"light" with no expiry. Read it as a choice
       made in the band we are in now and rewrite it in the new shape, so an
       existing reader's preference is honoured once more rather than discarded
       — and expires like any other choice from here on. */
    if (raw.charAt(0) !== '{') {
      if (raw !== 'dark' && raw !== 'light') return null;
      save(raw);
      return raw;
    }

    try {
      saved = JSON.parse(raw);
    } catch (err) {
      return null;
    }

    if (!saved || (saved.theme !== 'dark' && saved.theme !== 'light')) return null;
    return saved.band === band() ? saved.theme : null;
  }

  function resolve() {
    return override() || auto();
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  global.Theme = {
    auto: auto,
    band: band,
    nextBoundary: nextBoundary,
    override: override,
    resolve: resolve,
    apply: apply,
    save: save
  };

  apply(resolve());
})(window);
