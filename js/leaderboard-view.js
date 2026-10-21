/* renderLeaderboard(el, rows, highlightCodes) — the copper flip-board from the deck. */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var PLANE = '<img class="plane" src="assets/brand/landing-icon.png" alt="">';   // the arrivals tile from the brand kit
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
