/* Scales a fixed-size design stage (e.g. 1920×1080) to fit the viewport, letterboxing the rest. */
window.fitStage = function (el, w, h) {
  el._fit = function () {
    var s = Math.min(window.innerWidth / w, window.innerHeight / h);
    el.style.width = w + "px"; el.style.height = h + "px";
    el.style.setProperty("--s", s);
  };
  if (!el._fitBound) { el._fitBound = true; window.addEventListener("resize", function () { el._fit(); }); }
  el._fit();
};
