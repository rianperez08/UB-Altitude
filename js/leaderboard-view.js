/* renderLeaderboard(el, rows, highlightCodes) — the copper flip-board from the deck. */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var PLANE = '<svg class="plane" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M8 40l6-3 14 4 6-16-5-7 5-2 9 8 13 4c3 1 4 3 3 5s-4 3-7 2l-9-2-13 10 2 10-5 1-4-9-9-2-6 3z"/><path fill="currentColor" d="M6 52h52v3H6z"/></svg>';
  window.renderLeaderboard = function (el, rows, highlight) {
    rows = rows || []; highlight = highlight || [];
    var html = '<div class="board"><div class="board-head">' + PLANE + '<span>LEADERBOARD</span></div>' +
      '<div class="board-cols"><span>Rank</span><span>Name</span><span>UB Miles</span></div>';
    rows.forEach(function (r, i) {
      var me = highlight.indexOf(r.code) >= 0 ? " me" : "";
      html += '<div class="lb-row' + me + '">' +
        '<dot-text value="' + (i + 1) + '" min="2" align="left"></dot-text>' +
        '<dot-text class="lb-name" value="' + esc(String(r.name || "Guest").slice(0, 14)) + '" min="14"></dot-text>' +
        '<dot-text value="' + esc(r.miles) + '" min="3" align="right"></dot-text></div>';
    });
    if (!rows.length) html += '<p class="board-empty">No passengers have landed yet.</p>';
    html += "</div>";
    el.innerHTML = html;
  };
})();
