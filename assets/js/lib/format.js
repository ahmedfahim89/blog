/* Presentation helpers shared by the home page and the article page, so the
   two can never disagree about how a date or a byline reads. */
(function (global) {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* Built from the string's own parts rather than `new Date(str)`, so a plain
     "2026-09-17" cannot drift a day either way depending on the reader's
     timezone. */
  function date(value) {
    var parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    if (!parts) return '';
    var month = MONTHS[Number(parts[2]) - 1];
    if (!month) return '';
    return Number(parts[3]) + ' ' + month + ' ' + parts[1];
  }

  function meta(post, options) {
    var bits = [];
    if (post.date) bits.push(date(post.date));
    if (post.readingTime) bits.push(post.readingTime + ' min read');
    if (options && options.withAuthor && post.author) bits.push(post.author);
    return bits.join(' · ');
  }

  global.Fmt = { date: date, meta: meta };
})(window);
