/* Standalone leaderboard screen (leaderboard.html). Portrait or landscape, live-updating. */
(function () {
  "use strict";
  var C = window.ALTITUDE_CONFIG, stage = document.getElementById("stage"), board = document.getElementById("board");
  function layout() {
    var portrait = window.innerHeight > window.innerWidth;
    stage.classList.toggle("portrait", portrait); stage.classList.toggle("landscape", !portrait);
    stage.classList.toggle("copper-portrait", portrait); stage.classList.toggle("copper", !portrait);
    fitStage(stage, portrait ? 1080 : 1920, portrait ? 1920 : 1080);
  }
  window.addEventListener("resize", layout); layout();
  var rows = null;
  function refresh() { renderLeaderboard(board, rows || Store.leaderboard(C.game.leaderboardSize)); }
  BUS.on(function (m) { if (m.type === "leaderboard" && m.rows) { rows = m.rows; refresh(); } });
  window.addEventListener("storage", function (e) { if (e.key === "altitude.leaderboard") { rows = null; refresh(); } });
  refresh();
  BUS.emit({ type: "hello", role: "leaderboard" });
})();
