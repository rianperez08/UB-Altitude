/* Tray — what the coin analyzer looks at: the live camera over the tray, or a photo, or the deck's sample tray.
 *   Tray.useCamera(deviceId)   start the camera (the rear one by default)
 *   Tray.useImage(src, kind)   show a photo ("photo") or the sample ("sample") in the tray instead
 *   Tray.ready()               is there something to analyze?
 *   Tray.capture()             → { base64, mediaType, dataUrl } — exactly the part of the frame the tray shows
 *   Tray.freeze(shot) / Tray.release()   hold the captured frame in the tray while the kiosk works
 *   Tray.scanning(on)          the scanner light
 *   Tray.on(fn)                called with the source ("camera" | "photo" | "sample" | "none") and a status line */
window.Tray = (function () {
  "use strict";
  var X = window.EXCHANGE_CONFIG.exchange;
  var floor = document.getElementById("floor"), video = document.getElementById("cam"), still = document.getElementById("still");
  var ASPECT = 689 / 295;                       // the tray floor, as drawn in the deck
  var stream = null, source = "none", status = "", listeners = [], frozen = false;

  function emit() { floor.setAttribute("data-source", source); listeners.forEach(function (fn) { fn(source, status); }); }
  function set(src, msg) { source = src; status = msg || ""; emit(); }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null; video.srcObject = null;
  }
  function useCamera(deviceId) {
    stopCamera();
    if (!frozen) still.hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      set("none", window.isSecureContext ? "This device has no camera access" : "The camera needs https or localhost");
      return Promise.resolve(false);
    }
    set("none", "Starting the camera…");
    var v = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    if (deviceId) v.deviceId = { exact: deviceId }; else v.facingMode = { ideal: "environment" };
    return navigator.mediaDevices.getUserMedia({ video: v, audio: false }).then(function (s) {
      stream = s; video.srcObject = s;
      return Promise.resolve(video.play()).catch(function () {}).then(function () { set("camera", "Camera on"); return true; });
    }, function (e) {
      set("none", e && e.name === "NotAllowedError" ? "Camera blocked — allow it, or use a photo" : "No camera found — use a photo or the sample tray");
      return false;
    });
  }
  function useImage(src, kind) {
    stopCamera();
    var done = function () { set(kind, kind === "sample" ? "Sample tray from the deck" : "Your photo"); };
    still.onload = done;
    still.onerror = function () { set("none", "That photo couldn't be opened"); };
    still.hidden = false;
    if (still.src === new URL(src, location.href).href && still.complete && still.naturalWidth) done();   // same image again: no new load event
    else still.src = src;
  }

  function ready() {
    if (source === "camera") return video.readyState >= 2 && video.videoWidth > 0;
    return (source === "photo" || source === "sample") && still.complete && still.naturalWidth > 0;
  }

  function capture() {
    var el, sx = 0, sy = 0, sw, sh;
    if (source === "camera") {
      el = video;
      var vw = video.videoWidth, vh = video.videoHeight;
      if (vw / vh > ASPECT) { sh = vh; sw = vh * ASPECT; sx = (vw - sw) / 2; } else { sw = vw; sh = vw / ASPECT; sy = (vh - sh) / 2; }
    } else { el = still; sw = still.naturalWidth; sh = still.naturalHeight; }
    var k = Math.min(1, X.imageMaxEdge / Math.max(sw, sh));
    var cv = document.createElement("canvas");
    cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    cv.getContext("2d").drawImage(el, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    var url = cv.toDataURL("image/jpeg", X.imageQuality);
    return { dataUrl: url, base64: url.slice(url.indexOf(",") + 1), mediaType: "image/jpeg" };
  }
  function freeze(shot) {
    frozen = true;
    if (source === "camera") { still.src = shot.dataUrl; still.hidden = false; }
  }
  function release() {
    frozen = false;
    scanning(false);
    if (source === "camera") still.hidden = true;
  }
  function scanning(on) { floor.classList.toggle("scanning", !!on); }

  function cameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return Promise.resolve([]);
    return navigator.mediaDevices.enumerateDevices().then(function (ds) { return ds.filter(function (d) { return d.kind === "videoinput"; }); });
  }

  return {
    useCamera: useCamera, useImage: useImage, ready: ready, capture: capture, freeze: freeze, release: release,
    scanning: scanning, cameras: cameras,
    source: function () { return source; },
    on: function (fn) { listeners.push(fn); fn(source, status); }
  };
})();
