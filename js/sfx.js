/* SFX — tiny synthesised cabin sounds (WebAudio, no audio files). Respects the "sound" setting. */
window.SFX = (function () {
  "use strict";
  var ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function on() { try { return !window.Store || Store.settings().sound !== false; } catch (e) { return true; } }
  function tone(freq, delay, dur, type, gain) {
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain == null ? 0.16 : gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  return {
    unlock: ac,
    chime:   function () { if (on()) { tone(880, 0, 0.7); tone(659.25, 0.38, 1.0); } },           // cabin "bing-bong"
    ding:    function () { if (on()) tone(987.77, 0, 0.8, "sine", 0.12); },                         // round start
    tap:     function () { if (on()) tone(720, 0, 0.07, "sine", 0.05); },
    tick:    function () { if (on()) tone(1500, 0, 0.045, "square", 0.025); },
    correct: function () { if (on()) { tone(523.25, 0, 0.16, "triangle"); tone(659.25, 0.13, 0.16, "triangle"); tone(783.99, 0.26, 0.45, "triangle"); } },
    wrong:   function () { if (on()) { tone(170, 0, 0.35, "sawtooth", 0.07); tone(125, 0.06, 0.45, "sawtooth", 0.05); } },
    fanfare: function () { if (on()) [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, i * 0.13, 0.6, "triangle", 0.13); }); },
    printer: function () { if (on()) for (var i = 0; i < 28; i++) tone(i % 2 ? 210 : 170, i * 0.09, 0.06, "square", 0.02); }   // receipt printer (Altitude Exchange)
  };
})();
