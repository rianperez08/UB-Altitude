/* <dot-text> — airport flip-board / LED dot-matrix text, rendered as SVG circles (no font files).
 *
 *   <dot-text value="105 UB MILES"></dot-text>          one black bar
 *   <dot-text tiles value="4/5"></dot-text>             one black tile per glyph (score style)
 *   attributes: value, tiles, min (pad to N glyphs), align (left|center|right when padding), unlit (0–1)
 *   CSS custom properties: --dot (pitch in px, default 12), --tile (tile colour), --lit (dot colour)
 *   el.reveal(value, ms) scrambles the glyphs and settles left-to-right. */
(function () {
  "use strict";
  var F = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "10001", "01010", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "a": ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
    "b": ["10000", "10000", "10110", "11001", "10001", "10001", "11110"],
    "c": ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
    "d": ["00001", "00001", "01101", "10011", "10001", "10001", "01111"],
    "e": ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
    "f": ["00110", "01001", "01000", "11100", "01000", "01000", "01000"],
    "g": ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
    "h": ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
    "i": ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
    "j": ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
    "k": ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
    "l": ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
    "m": ["00000", "00000", "11010", "10101", "10101", "10001", "10001"],
    "n": ["00000", "00000", "10110", "11001", "10001", "10001", "10001"],
    "o": ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
    "p": ["00000", "00000", "11110", "10001", "11110", "10000", "10000"],
    "q": ["00000", "00000", "01101", "10011", "01111", "00001", "00001"],
    "r": ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
    "s": ["00000", "00000", "01110", "10000", "01110", "00001", "11110"],
    "t": ["01000", "01000", "11100", "01000", "01000", "01001", "00110"],
    "u": ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
    "v": ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
    "w": ["00000", "00000", "10001", "10001", "10101", "10101", "01010"],
    "x": ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
    "y": ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
    "z": ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
    ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
    "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"]
  };
  var COLS = 5, ROWS = 7, SCRAMBLE = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function DotText() { return Reflect.construct(HTMLElement, [], DotText); }
  DotText.prototype = Object.create(HTMLElement.prototype);
  DotText.prototype.constructor = DotText;
  Object.setPrototypeOf(DotText, HTMLElement);
  DotText.observedAttributes = ["value", "tiles", "min", "align", "unlit"];

  DotText.prototype.connectedCallback = function () { this.render(); };
  DotText.prototype.attributeChangedCallback = function () { if (this.isConnected && !this._animating) this.render(); };
  Object.defineProperty(DotText.prototype, "value", {
    get: function () { return this.getAttribute("value") || ""; },
    set: function (v) { this.setAttribute("value", v); }
  });

  DotText.prototype._text = function (v) {
    var t = String(v == null ? "" : v);
    var min = parseInt(this.getAttribute("min") || "0", 10) || 0;
    if (t.length < min) {
      var pad = min - t.length, a = this.getAttribute("align") || "center";
      if (a === "left") t = t + rep(" ", pad);
      else if (a === "right") t = rep(" ", pad) + t;
      else { var l = Math.floor(pad / 2); t = rep(" ", l) + t + rep(" ", pad - l); }
    }
    return t;
  };
  function rep(s, n) { var o = ""; while (n-- > 0) o += s; return o; }

  DotText.prototype.render = function (text) {
    var t = this._text(text == null ? this.value : text);
    var cs = getComputedStyle(this), raw = (cs.getPropertyValue("--dot") || "").trim();
    var pitch = /^[\d.]+px$/.test(raw) ? parseFloat(raw) : (raw === "" || raw === "auto") && this.hasAttribute("fs") ? parseFloat(cs.fontSize) : (parseFloat(raw) || 12);
    var tiles = this.hasAttribute("tiles");
    var unlit = this.hasAttribute("unlit") ? parseFloat(this.getAttribute("unlit")) : 0.07;
    var n = Math.max(t.length, 1);
    var padX = tiles ? 1 : 1.4, padY = tiles ? 1.4 : 1.1, gapT = 0.5;
    var tileW = COLS + 2 * padX;
    var W = tiles ? n * tileW + (n - 1) * gapT : (n * (COLS + 1) - 1) + 2 * padX;
    var H = ROWS + 2 * padY;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + (W * pitch) + '" height="' + (H * pitch) + '" role="img" aria-label="' + esc(t) + '">';
    if (!tiles) s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="0.8" class="tile"/>';
    var x0 = padX;
    for (var i = 0; i < n; i++) {
      var ch = t.charAt(i) || " ", g = F[ch] || F[ch.toUpperCase()] || F["?"];
      if (tiles) { var tx = i * (tileW + gapT); s += '<rect x="' + tx + '" y="0" width="' + tileW + '" height="' + H + '" rx="0.9" class="tile"/>'; x0 = tx + padX; }
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var on = g[r].charAt(c) === "1";
        if (!on && unlit <= 0) continue;
        s += '<circle cx="' + (x0 + c + 0.5) + '" cy="' + (padY + r + 0.5) + '" r="0.41" class="' + (on ? "on" : "off") + '"' + (on ? "" : ' opacity="' + unlit + '"') + '/>';
      }
      if (!tiles) x0 += COLS + 1;
    }
    s += "</svg>";
    this.innerHTML = s;
  };

  DotText.prototype.reveal = function (value, ms) {
    var self = this; ms = ms || 900;
    cancelAnimationFrame(self._raf);
    var final = self._text(value), n = final.length, t0 = performance.now();
    self._animating = true;
    function step(now) {
      var p = (now - t0) / ms, out = "";
      for (var i = 0; i < n; i++) {
        var settle = 0.25 + (i + 1) / n * 0.7;
        out += (final.charAt(i) === " " || p >= settle) ? final.charAt(i) : SCRAMBLE.charAt(Math.floor(Math.random() * SCRAMBLE.length));
      }
      self.render(out);
      if (p < 1) self._raf = requestAnimationFrame(step);
      else { self._animating = false; self.setAttribute("value", value); self.render(); }
    }
    self._raf = requestAnimationFrame(step);
  };

  if (!customElements.get("dot-text")) customElements.define("dot-text", DotText);
})();
