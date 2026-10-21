/* The Altitude Test — in-flight entertainment (IFE) screen.
 *
 * The seat-1 page (index.html) is the HOST: it owns the game state and every timer.
 * Every other screen — a seat-2 IFE (index.html?seat=2), the plane windows (window.html),
 * the leaderboard (leaderboard.html) and the window preview — mirrors the host's state over BUS
 * and sends inputs back to it. Flow:
 *   attract → mode → names → preflight → countdown → [round → reveal → transit] ×5
 *   → score → reward → claim → leaderboard → attract */
(function () {
  "use strict";
  var C = window.ALTITUDE_CONFIG, G = C.game;
  var qs = new URLSearchParams(location.search);
  var SEAT = Math.max(1, parseInt(qs.get("seat") || "1", 10) || 1);
  var ROLE = qs.get("role") || (SEAT === 1 ? "host" : "client");
  var IS_HOST = ROLE === "host";
  var MAX_NAME = 14;

  var stage = document.getElementById("stage");
  var view = document.getElementById("screen");
  var porthole = document.getElementById("porthole");
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function peso(n) { return "₱" + Math.round(n).toLocaleString("en-US"); }
  function now() { return Date.now(); }
  function uid() { return now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function titleCase(s) { return s.toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); }

  var settings = Store.settings();
  var previewOverride = qs.get("preview");            // ?preview=0 / ?preview=1 beats the saved setting
  function previewOn() { return previewOverride != null ? previewOverride === "1" : settings.preview !== false; }
  var draft = "";                                       // name being typed
  var lbRows = null;                                    // leaderboard rows received over BUS (client screens)
  var timers = {};
  function after(k, ms, fn) { clearTimeout(timers[k]); timers[k] = setTimeout(fn, ms); }
  function clearTimers() { Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); }); timers = {}; }

  // ---------------------------------------------------------------- state
  function blank() {
    return { phase: "attract", mode: "solo", players: [], order: [], round: -1, rounds: G.rounds,
      city: null, options: [], answers: {}, roundStart: 0, roundEnd: 0, shade: "closed",
      countdown: 0, nameSeat: 1, winner: 0, remote: [], sessionId: null, seq: 0, ts: 0 };
  }
  var S = blank();
  function player(seat) { for (var i = 0; i < S.players.length; i++) if (S.players[i].seat === seat) return S.players[i]; return null; }
  function isRemote(seat) { return S.remote.indexOf(seat) >= 0; }
  function isLocal(seat) { return IS_HOST ? !isRemote(seat) : seat === SEAT; }
  function duo() { return S.mode === "duo"; }
  function allAnswered() { return S.players.every(function (p) { return !!S.answers[p.seat]; }); }

  function publish() {
    if (!IS_HOST) return;
    S.seq++; S.ts = now();
    try { localStorage.setItem("altitude.state", JSON.stringify(S)); } catch (e) {}
    BUS.emit({ type: "state", state: S });
  }
  function go(phase, patch) { if (patch) Object.assign(S, patch); S.phase = phase; publish(); render(); armIdle(); }
  function resetToAttract() { clearTimers(); var remote = S.remote; S = blank(); S.remote = remote; draft = ""; go("attract"); }

  // ---------------------------------------------------------------- flow (host only)
  function startGame(mode) {
    clearTimers();
    var remote = S.remote;
    S = blank(); S.remote = remote; S.mode = mode; S.sessionId = uid();
    S.players = (mode === "duo" ? [1, 2] : [1]).map(function (seat) { return { seat: seat, name: "", correct: 0, miles: 0, answers: [], code: null }; });
    var idx = C.cities.map(function (_, i) { return i; });
    if (C.shuffleCities) shuffle(idx);
    S.order = idx.slice(0, G.rounds); S.rounds = S.order.length;
    draft = "";
    go("names");
  }
  function nameDone(skip) {
    var p = player(S.nameSeat); if (!p) return;
    var fallback = duo() ? "Passenger " + p.seat : "Guest";
    p.name = (skip ? "" : titleCase(draft.trim())).slice(0, MAX_NAME) || fallback;
    draft = "";
    var next = null; S.players.forEach(function (q) { if (!next && q.seat > S.nameSeat) next = q; });
    if (next) { S.nameSeat = next.seat; publish(); render(); armIdle(); } else go("preflight");
  }
  function takeOff() {
    SFX.chime();
    go("countdown", { countdown: G.countdownSeconds });
    (function tick() {
      after("cd", 1000, function () {
        S.countdown--;
        if (S.countdown <= 0) startRound(0); else { SFX.tick(); publish(); render(); tick(); }
      });
    })();
  }
  function startRound(i) {
    var city = C.cities[S.order[i]];
    var options = C.shuffleOptions ? shuffle(city.options.slice()) : city.options.slice();
    var secs = Number(settings.roundSeconds) || G.roundSeconds;
    var t = now();
    SFX.ding();
    go("round", { round: i, city: { id: city.id, image: city.image, answer: city.answer }, options: options, answers: {}, roundStart: t, roundEnd: t + secs * 1000, shade: "open" });
    after("round", secs * 1000 + 40, endRound);
  }
  function answer(seat, choice) {
    if (!IS_HOST) {
      if (S.phase === "round" && !S.answers[seat]) { SFX.tap(); BUS.emit({ type: "input", action: "answer", seat: seat, choice: choice }); }
      return;
    }
    if (S.phase !== "round" || S.answers[seat] || !player(seat) || S.options[choice] == null) return;
    var ms = Math.max(0, now() - S.roundStart), total = S.roundEnd - S.roundStart;
    var correct = S.options[choice] === S.city.answer;
    var bonus = correct ? Math.ceil(G.speedBonusMax * Math.max(0, 1 - ms / total)) : 0;
    S.answers[seat] = { choice: choice, ms: ms, correct: correct, bonus: bonus, miles: correct ? G.milesPerCorrect + bonus : 0 };
    SFX.tap();
    publish(); render();
    if (allAnswered()) after("round", 350, endRound);
  }
  function endRound() {
    clearTimeout(timers.round);
    if (S.phase !== "round") return;
    S.players.forEach(function (p) {
      var a = S.answers[p.seat] || (S.answers[p.seat] = { choice: -1, ms: null, correct: false, bonus: 0, miles: 0 });
      p.answers.push({ round: S.round + 1, city: S.city.id, picked: a.choice >= 0 ? S.options[a.choice] : "", correct: a.correct, ms: a.ms, miles: a.miles });
      if (a.correct) p.correct++;
      p.miles += a.miles;
    });
    (S.players.some(function (p) { return S.answers[p.seat].correct; }) ? SFX.correct : SFX.wrong)();
    go("reveal");
    after("reveal", G.revealSeconds * 1000, function () {
      if (S.round + 1 < S.rounds) {
        go("transit", { shade: "closed" });
        after("transit", G.transitSeconds * 1000, function () { startRound(S.round + 1); });
      } else finish();
    });
  }
  function finish() {
    S.players.forEach(function (p) { p.code = Store.newCode(); });
    S.winner = 0;
    if (duo()) { var a = S.players[0], b = S.players[1]; S.winner = a.miles === b.miles ? 0 : (a.miles > b.miles ? a.seat : b.seat); }
    Store.addResults({ id: S.sessionId, ts: now(), mode: S.mode, rounds: S.rounds, players: S.players.map(function (p) {
      return { seat: p.seat, name: p.name, correct: p.correct, miles: p.miles, peso: p.miles * G.pesoPerMile, code: p.code, answers: p.answers };
    }) });
    SFX.fanfare();
    go("score", { shade: "closed" });
    after("auto", G.autoAdvanceSeconds * 1000, advance);
  }
  function advance() {
    clearTimeout(timers.auto);
    if (S.phase === "score") { go("reward"); after("auto", G.autoAdvanceSeconds * 1000, advance); }
    else if (S.phase === "reward") go("claim");
    else if (S.phase === "claim") go("leaderboard");
    else if (S.phase === "leaderboard") resetToAttract();
  }

  var idleT = 0;
  function armIdle() {
    clearTimeout(idleT);
    if (!IS_HOST) return;
    var secs = { mode: 90, names: 120, preflight: 120, claim: G.idleResetSeconds * 2, leaderboard: G.idleResetSeconds }[S.phase];
    if (secs) idleT = setTimeout(resetToAttract, secs * 1000);
  }

  // ---------------------------------------------------------------- other screens
  var seen = {};                                        // seat → last heartbeat (a seat-2 IFE on its own screen)
  function refreshRemote() {
    var t = now(), list = Object.keys(seen).filter(function (s) { return t - seen[s] < 9000; }).map(Number).sort();
    if (list.join() !== S.remote.join()) { S.remote = list; if (S.phase !== "attract") { publish(); render(); } }
  }
  if (IS_HOST) setInterval(refreshRemote, 3000);
  else { BUS.emit({ type: "hello", seat: SEAT }); setInterval(function () { BUS.emit({ type: "hb", seat: SEAT }); }, 3000); }

  BUS.on(function (m) {
    if (IS_HOST) {
      if (m.type === "input" && m.action === "answer") answer(+m.seat, +m.choice);
      else if (m.type === "hello" || m.type === "hb") {
        if (m.seat > 1) { seen[m.seat] = now(); refreshRemote(); }
        if (m.type === "hello") { publish(); Store.broadcast(); }
      }
      else if (m.type === "settings") { settings = Store.settings(); updatePreview(); }
    } else {
      if (m.type === "state" && m.state && m.state.ts >= (S.ts || 0)) { S = m.state; render(); }
      else if (m.type === "settings" && m.settings) { settings = Object.assign(settings, m.settings); updatePreview(); }
      else if (m.type === "leaderboard" && m.rows) { lbRows = m.rows; if (S.phase === "leaderboard") render(); }
    }
  });

  // ---------------------------------------------------------------- templates
  var ICON = {
    seat: '<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="currentColor"><path d="M18 8h20a6 6 0 0 1 6 6v20H18z" opacity=".9"/><path d="M14 34h36v10H14z"/><path d="M16 44h6v10h-6zM42 44h6v10h-6z" opacity=".7"/></g></svg>',
    seats: '<svg viewBox="0 0 96 64" aria-hidden="true"><g fill="currentColor"><path d="M10 8h20a6 6 0 0 1 6 6v20H10z" opacity=".9"/><path d="M6 34h36v10H6z"/><path d="M8 44h6v10H8zM34 44h6v10h-6z" opacity=".7"/><path d="M60 8h20a6 6 0 0 1 6 6v20H60z" opacity=".9"/><path d="M56 34h36v10H56z"/><path d="M58 44h6v10h-6zM84 44h6v10h-6z" opacity=".7"/></g></svg>',
    plane: '<svg class="plane-big" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M8 40l6-3 14 4 6-16-5-7 5-2 9 8 13 4c3 1 4 3 3 5s-4 3-7 2l-9-2-13 10 2 10-5 1-4-9-9-2-6 3z"/></svg>',
    porthole: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="7" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="5" width="8" height="14" rx="4" fill="currentColor" opacity=".5"/></svg>'
  };
  var CTA = "Scan to start your UnionBank Altitude Card application";   // the claim screen's call to action, under the QR code
  function footer() { return '<footer class="brand"><img class="ub" src="assets/brand/ub-logo.png" alt="UnionBank"><span class="wordmark">ALTITUDE</span></footer>'; }
  function eyebrow(t) { return '<p class="eyebrow">' + t + '</p>'; }
  function names() { return S.players.map(function (p) { return esc(p.name); }).join(" &amp; "); }
  function applyLink(code) { var u = settings.applyUrl || C.brand.applyUrl; return u + (u.indexOf("?") >= 0 ? "&" : "?") + "ref=" + encodeURIComponent(code); }
  function who(p) { return duo() ? '<div class="who">' + esc(p.name) + '</div>' : ""; }

  function osk() {
    var rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
    return '<div class="osk">' + rows.map(function (r) {
      return '<div class="osk-row">' + r.split("").map(function (k) { return '<button class="key" data-action="key:' + k.toLowerCase() + '">' + k + '</button>'; }).join("") + '</div>';
    }).join("") + '<div class="osk-row"><button class="key wide" data-action="backspace" aria-label="Backspace">&#9003;</button><button class="key space" data-action="space">Space</button><button class="key wide go" data-action="done">Done</button></div></div>';
  }

  var T = {
    attract: function () {
      return '<section class="screen attract"><div class="kv"></div><div class="attract-copy">' +
        '<img class="badge" src="assets/brand/altitude-test-badge.png" alt="The Altitude Test">' +
        '<p class="tagline">Unlock bonus travel miles<br>with your elevated travel knowledge</p>' +
        '<button class="pill solid cta host-only" data-action="board">Tap to board</button>' +
        (IS_HOST ? "" : '<p class="fine">Seat ' + SEAT + ' &middot; boarding starts from seat 1</p>') +
        '</div>' + footer() + '</section>';
    },
    mode: function () {
      return '<section class="screen copper center">' + eyebrow("Boarding") + '<h1>How are you flying today?</h1>' +
        '<div class="mode-cards">' +
        '<button class="card host-only" data-action="mode:solo">' + ICON.seat + '<strong>Solo flight</strong><span>Take The Altitude Test on your own</span></button>' +
        '<button class="card host-only" data-action="mode:duo">' + ICON.seats + '<strong>Head-to-head</strong><span>Compete with the passenger beside you</span></button>' +
        '</div>' + footer() + '</section>';
    },
    names: function () {
      var p = player(S.nameSeat) || { seat: 1 };
      var last = !S.players.some(function (q) { return q.seat > S.nameSeat; });
      return '<section class="screen copper center names">' +
        eyebrow("Boarding pass &middot; Passenger " + p.seat + (duo() ? " of 2" : "")) +
        '<h1>What\'s your name?</h1>' +
        '<div class="name-field">' + (draft ? '<span class="name-text">' + esc(titleCase(draft)) + '</span>' : '<span class="placeholder">Type your name</span>') + '<span class="caret"></span></div>' +
        (IS_HOST ? osk() : '<p class="fine">Names are entered on seat 1</p>') +
        '<div class="row"><button class="pill ghost host-only" data-action="skip">Skip</button>' +
        '<button class="pill solid host-only" data-action="done">' + (last ? "Board the flight" : "Next passenger") + '</button></div>' +
        footer() + '</section>';
    },
    preflight: function () {
      return '<section class="screen copper center preflight">' + eyebrow("Pre-flight briefing") +
        '<h1>Fasten your seatbelts, ' + names() + '</h1>' +
        '<ol class="briefing">' +
        '<li><b>1</b><span>' + S.rounds + ' landings ahead. On every approach, look out your window.</span></li>' +
        '<li><b>2</b><span>Guess the city on this screen before the timer runs out.</span></li>' +
        '<li><b>3</b><span>A correct landing earns ' + G.milesPerCorrect + ' UB Miles. Answer fast for up to +' + G.speedBonusMax + ' bonus miles.</span></li>' +
        '</ol><button class="pill solid cta host-only" data-action="takeoff">Take off</button>' + footer() + '</section>';
    },
    countdown: function () {
      return '<section class="screen copper center countdown">' + eyebrow("Now departing") +
        '<dot-text tiles class="big" value="' + S.countdown + '"></dot-text><p class="sub">Preparing for landing&hellip;</p>' + footer() + '</section>';
    },
    round: function () { return roundScreen(false); },
    reveal: function () { return roundScreen(true); },
    transit: function () {
      return '<section class="screen copper center transit">' + ICON.plane + '<h1>Next destination</h1>' +
        '<p class="sub">Round ' + (S.round + 2) + ' of ' + S.rounds + ' &middot; Look out your window</p>' + footer() + '</section>';
    },
    score: function () {
      return '<section class="screen copper center result">' + eyebrow("Your final score") +
        '<div class="cols">' + S.players.map(function (p) {
          return '<div class="col' + (S.winner === p.seat ? " winner" : "") + '">' + who(p) +
            '<dot-text tiles class="big reveal" value="' + p.correct + '/' + S.rounds + '"></dot-text>' +
            (S.winner === p.seat ? '<span class="tag">Winner</span>' : (duo() && !S.winner ? '<span class="tag">Tie</span>' : "")) + '</div>';
        }).join("") + '</div>' +
        '<h2>You\'ve landed!</h2><p class="sub">Congratulations on completing your journey!</p>' +
        '<button class="pill ghost small host-only" data-action="continue">Continue</button>' + footer() + '</section>';
    },
    reward: function () {
      return '<section class="screen copper center result">' + eyebrow("Your earned reward") +
        S.players.map(function (p) {
          return '<div class="reward">' + who(p) + '<dot-text class="bar reveal" value="' + p.miles + ' UB MILES"></dot-text>' +
            '<p class="fine">' + peso(G.pesoPerMile) + ' = 1 UB Mile<br>' + p.miles + ' UB Miles = ' + peso(p.miles * G.pesoPerMile) + ' equivalent spend</p></div>';
        }).join("") +
        '<p class="sub">Keep exploring. Keep earning!</p>' +
        '<button class="pill ghost small host-only" data-action="continue">Continue</button>' + footer() + '</section>';
    },
    claim: function () {
      return '<section class="screen copper center claim"><div class="cols">' + S.players.map(function (p) {
          return '<div class="col">' + eyebrow((duo() ? esc(p.name) + " &middot; " : "") + "You won " + p.miles + " UB Miles") +
            '<div class="claim-card"><img class="card-art" src="assets/brand/altitude-card.webp" alt="UnionBank Altitude World Mastercard">' +
            '<div class="claim-code"><p class="label">Your referral code</p>' +
            '<dot-text class="code" value="' + esc(p.code) + '"></dot-text>' +
            '<div class="qr" data-url="' + esc(applyLink(p.code)) + '"></div></div></div></div>';
        }).join("") + '</div>' +
        '<p class="fine">' + CTA + '.<br>Keep your code &mdash; your UB Miles are credited once your card is approved.</p>' +
        '<div class="row"><button class="pill ghost host-only" data-action="continue">See the leaderboard</button></div>' + footer() + '</section>';
    },
    leaderboard: function () {
      return '<section class="screen copper center lb"><div id="board"></div>' +
        '<button class="pill ghost small host-only" data-action="again">Play again</button>' + footer() + '</section>';
    }
  };

  function roundScreen(reveal) {
    var secs = Math.max(0, Math.ceil((S.roundEnd - now()) / 1000));
    return '<section class="screen copper round' + (reveal ? " reveal" : "") + '">' +
      '<header class="round-head"><span class="eyebrow">Round ' + (S.round + 1) + ' of ' + S.rounds + '</span>' +
      '<div class="timer"><div class="track"><i id="timer-fill"' + (reveal ? ' style="transform:scaleX(0)"' : "") + '></i></div><span id="timer-text">' + (reveal ? "" : secs) + '</span></div>' +
      '<span class="eyebrow hint">' + ICON.porthole + ' Look out your window</span></header>' +
      '<h1 class="question">' + (reveal ? "Welcome to " + esc(S.city.answer) : "Where are we landing?") + '</h1>' +
      '<div class="panels">' + S.players.map(function (p) { return panel(p, reveal); }).join("") + '</div>' + footer() + '</section>';
  }
  function panel(p, reveal) {
    var a = S.answers[p.seat], local = isLocal(p.seat), locked = !!a;
    var correctIdx = S.options.indexOf(S.city.answer);
    function cls(i) {
      if (reveal) { if (i === correctIdx) return "correct"; if (a && a.choice === i) return "wrong"; return "dim"; }
      if (a && a.choice === i) return "selected";
      return locked ? "dim" : "";
    }
    var status = "&nbsp;";
    if (reveal) status = (!a || a.choice < 0) ? "Missed the approach" : a.correct ? 'Correct! <b>+' + a.miles + ' UB Miles</b>' + (a.bonus ? ' <em>(speed bonus +' + a.bonus + ')</em>' : "") : "Not this time";
    else if (locked) status = "Locked in";
    else if (!local) status = "Answering on seat " + p.seat + "&hellip;";
    return '<div class="panel' + (locked ? " locked" : "") + (local ? "" : " remote") + '" data-seat="' + p.seat + '">' + who(p) +
      '<div class="options">' + S.options.map(function (o, i) {
        return '<button class="pill opt ' + cls(i) + '" data-action="answer:' + p.seat + ':' + i + '"' + ((locked || reveal || !local) ? " disabled" : "") + '>' + esc(o) + '</button>';
      }).join("") + '</div><div class="status">' + status + '</div></div>';
  }

  // ---------------------------------------------------------------- render
  function render() {
    document.body.setAttribute("data-phase", S.phase);
    document.body.classList.toggle("duo", duo());
    view.innerHTML = (T[S.phase] || T.attract)();
    if (S.phase === "round") timerLoop();
    $$("dot-text.reveal", view).forEach(function (d) { d.reveal(d.getAttribute("value"), 1100); });
    if (S.phase === "claim") $$(".qr", view).forEach(function (el) { drawQR(el, el.getAttribute("data-url")); });
    if (S.phase === "leaderboard") {
      var rows = IS_HOST ? Store.leaderboard(Math.min(G.leaderboardSize, 8)) : (lbRows || Store.leaderboard(Math.min(G.leaderboardSize, 8))).slice(0, 8);
      renderLeaderboard($("#board", view), rows, S.players.map(function (p) { return p.code; }));
    }
    updatePreview();
  }

  var raf = 0, lastTick = -1;
  function timerLoop() {
    cancelAnimationFrame(raf);
    var fill = $("#timer-fill", view), text = $("#timer-text", view);
    if (!fill) return;
    var total = Math.max(1, S.roundEnd - S.roundStart);
    lastTick = -1;
    (function step() {
      if (S.phase !== "round" || !fill.isConnected) return;
      var rem = Math.max(0, S.roundEnd - now()), s = Math.ceil(rem / 1000);
      fill.style.transform = "scaleX(" + (rem / total) + ")";
      if (text.textContent != s) text.textContent = s;
      fill.classList.toggle("urgent", s <= 5);
      if (IS_HOST && s <= 5 && s > 0 && s !== lastTick && !allAnswered()) { lastTick = s; SFX.tick(); }
      raf = requestAnimationFrame(step);
    })();
  }

  function drawQR(el, url) {
    if (!window.qrcode) { el.textContent = url; return; }
    try { var q = qrcode(0, "M"); q.addData(url); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
    catch (e) { el.textContent = url; }
  }

  function updatePreview() {
    if (!porthole) return;
    var on = previewOn() && S.phase !== "attract";
    porthole.hidden = !on;
    document.body.classList.toggle("with-preview", on);
    stage.classList.toggle("copper", on);
    var f = porthole.querySelector("iframe");
    if (previewOn() && f && !f.getAttribute("src")) f.setAttribute("src", "window.html?embed=1&seat=" + SEAT);
  }

  // ---------------------------------------------------------------- input
  view.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]"); if (!btn || btn.disabled) return;
    SFX.unlock();
    var parts = btn.getAttribute("data-action").split(":"), act = parts[0], a = parts[1], b = parts[2];
    if (act === "answer") { answer(+a, +b); return; }
    if (!IS_HOST) return;
    armIdle();
    switch (act) {
      case "board": SFX.tap(); go("mode"); break;
      case "mode": SFX.tap(); startGame(a); break;
      case "key": typeChar(a); break;
      case "space": typeChar(" "); break;
      case "backspace": draft = draft.slice(0, -1); render(); break;
      case "done": SFX.tap(); nameDone(false); break;
      case "skip": nameDone(true); break;
      case "takeoff": takeOff(); break;
      case "continue": SFX.tap(); advance(); break;
      case "again": SFX.tap(); resetToAttract(); break;
    }
  });
  function typeChar(c) {
    if (c === " " && (!draft || draft.slice(-1) === " ")) return;
    if (draft.length >= MAX_NAME) return;
    draft += c; render();
  }

  document.addEventListener("keydown", function (e) {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (document.querySelector("dialog[open]")) return;   // dialogs handle their own keys (Esc closes them)
    var k = e.key;
    if (S.phase === "round") {
      var i1 = "1234".indexOf(k), i2 = "7890".indexOf(k);
      if (i1 >= 0 && player(1) && isLocal(1)) answer(1, i1);
      else if (i2 >= 0 && player(2) && isLocal(2)) answer(2, i2);
      return;
    }
    if (!IS_HOST) return;
    if (S.phase === "names") {
      if (/^[a-zA-Z]$/.test(k)) typeChar(k.toLowerCase());
      else if (k === " ") { typeChar(" "); e.preventDefault(); }
      else if (k === "Backspace") { draft = draft.slice(0, -1); render(); }
      else if (k === "Enter") nameDone(false);
      else if (k === "Escape") resetToAttract();
      return;
    }
    if (k === "Escape") { resetToAttract(); return; }
    if (k === "s" || k === "S") { openSettings(); return; }
    if (k === "Enter" || k === " ") {
      if (S.phase === "attract") go("mode");
      else if (S.phase === "mode") startGame("solo");
      else if (S.phase === "preflight") takeOff();
      else if (S.phase === "score" || S.phase === "reward" || S.phase === "claim") advance();
      else if (S.phase === "leaderboard") resetToAttract();
    }
  });

  // five taps in the top-left corner open the operator panel (touch screens without a keyboard)
  var taps = [];
  document.addEventListener("pointerdown", function (e) {
    if (e.clientX < 90 && e.clientY < 90) {
      var t = now(); taps = taps.filter(function (x) { return t - x < 2500; }); taps.push(t);
      if (taps.length >= 5) { taps = []; openSettings(); }
    }
  });

  // ---------------------------------------------------------------- operator panel
  var dlg = $("#settings");
  function openSettings() {
    if (!IS_HOST || !dlg || dlg.open) return;
    settings = Store.settings();
    $("#set-round").value = settings.roundSeconds;
    $("#set-preview").checked = settings.preview !== false;
    $("#set-sound").checked = settings.sound !== false;
    $("#set-url").value = settings.applyUrl || "";
    $("#set-stats").textContent = Store.sessions().length + " flights · " + Store.leaderboard().length + " passengers stored on this screen · " + (BUS.server ? "screens synced via server" : "screens synced in this browser");
    dlg.showModal();
  }
  if (dlg) dlg.addEventListener("click", function (e) {
    var act = e.target.getAttribute("data-set"); if (!act) return;
    switch (act) {
      case "save":
        settings = Store.saveSettings({
          roundSeconds: Math.max(5, Math.min(60, parseInt($("#set-round").value, 10) || G.roundSeconds)),
          preview: $("#set-preview").checked, sound: $("#set-sound").checked,
          applyUrl: $("#set-url").value.trim() || C.brand.applyUrl
        });
        previewOverride = null; updatePreview(); dlg.close(); break;
      case "seed": Store.seedDemo(); dlg.close(); openSettings(); break;
      case "clear": if (confirm("Clear the leaderboard and all flight records stored on this screen?")) { Store.clear(); dlg.close(); openSettings(); } break;
      case "csv": Store.download(); break;
      case "window": window.open("window.html?seat=1", "altitude-window-1"); break;
      case "window2": window.open("window.html?seat=2", "altitude-window-2"); break;
      case "seat2": window.open("index.html?seat=2", "altitude-seat-2"); break;
      case "board": window.open("leaderboard.html", "altitude-leaderboard"); break;
      case "reset": dlg.close(); resetToAttract(); break;
      case "close": dlg.close(); break;
    }
  });

  // ---------------------------------------------------------------- boot
  document.body.classList.toggle("client", !IS_HOST);
  if (IS_HOST) { S = blank(); render(); publish(); Store.broadcast(); }
  else {
    try { var saved = JSON.parse(localStorage.getItem("altitude.state")); if (saved && saved.phase) S = saved; } catch (e) {}
    render();
  }
  window.ALTITUDE = { state: function () { return S; }, isHost: IS_HOST, seat: SEAT };
})();
