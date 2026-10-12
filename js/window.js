/* Plane-window display (window.html). Mirrors the host's state:
 * clouds while cruising, the city appears when a round opens the window, the city name on reveal.
 *   ?seat=1|2   which seat's window this is (both show the same landing)
 *   ?frame=0    no drawn porthole/shade — the screen sits behind a real window cut-out
 *   ?embed=1    used by the IFE page's preview panel */
(function () {
  "use strict";
  var C = window.ALTITUDE_CONFIG, qs = new URLSearchParams(location.search);
  var frame = qs.get("frame") !== "0", embed = qs.get("embed") === "1";
  document.body.classList.toggle("noframe", !frame);
  document.body.classList.toggle("embed", embed);
  C.cities.forEach(function (c) { var i = new Image(); i.src = c.image; });

  var port = document.getElementById("porthole"), img = document.getElementById("city");
  var label = document.getElementById("label"), labelText = label.querySelector("dot-text"), chip = document.getElementById("chip");
  var CHIP = { attract: "Boarding", mode: "Boarding", names: "Boarding", preflight: "Ready for take-off", countdown: "Taking off",
    transit: "Cruising to the next destination", score: "You've landed", reward: "You've landed", claim: "You've landed", leaderboard: "Thank you for flying" };

  function apply(st) {
    if (!st || !st.phase) return;
    var open = st.shade === "open" && (st.phase === "round" || st.phase === "reveal");
    if (st.city && img.getAttribute("data-id") !== st.city.id) {
      img.setAttribute("data-id", st.city.id); img.src = st.city.image;
      img.classList.remove("kenburns"); void img.offsetWidth; img.classList.add("kenburns");
    }
    port.classList.toggle("open", open);
    var reveal = st.phase === "reveal" && !!st.city;
    label.hidden = !reveal;
    if (reveal) labelText.setAttribute("value", st.city.answer.split(",")[0].toUpperCase());
    document.body.setAttribute("data-phase", st.phase);
    if (chip) chip.textContent = st.phase === "round" ? "Now landing · Round " + (st.round + 1) + " of " + st.rounds
      : st.phase === "reveal" && st.city ? "Welcome to " + st.city.answer : (CHIP[st.phase] || "");
  }
  try { apply(JSON.parse(localStorage.getItem("altitude.state"))); } catch (e) {}
  BUS.on(function (m) { if (m.type === "state") apply(m.state); });
  BUS.emit({ type: "hello", role: "window" });
})();
