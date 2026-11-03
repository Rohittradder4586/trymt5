/* ============ CONFIGURATION — EDIT THESE ============ */
var CONFIG = {
  // Paste your Google Apps Script Web App URL (ends with /exec)
  WEBHOOK_URL: "YOUR_APPS_SCRIPT_WEB_APP_URL",
  TELEGRAM_URL: "https://t.me/YOUR_TELEGRAM_USERNAME",
  WHATSAPP_URL: "https://wa.me/YOUR_WHATSAPP_NUMBER",
  VIDEO_ID: "9ybk6Go0ZRQ",
  SOURCE: "IFX Marketing MT5 Landing Page",
  TIMEOUT_MS: 20000
};
/* ==================================================== */

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var modal = $("modal"), form = $("leadForm"), nameIn = $("fullName"), mobIn = $("mobile");
  var submitBtn = $("submitBtn"), submitTxt = $("submitTxt"), formErr = $("formErr");
  var lastFocus = null, submitting = false, unlocked = false, player = null;

  $("yr").textContent = new Date().getFullYear();

  /* ---------- Mobile menu ---------- */
  var burger = $("burger"), nav = $("nav");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  burger.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });

  /* ---------- Contact links ---------- */
  function setupLink(id, url) {
    var a = $(id);
    if (!url || /YOUR_/.test(url)) {
      a.removeAttribute("href");
      a.classList.add("off");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("tabindex", "-1");
      $("contactHint").hidden = false;
    } else {
      a.href = url;
    }
  }
  setupLink("tgBtn", CONFIG.TELEGRAM_URL);
  setupLink("waBtn", CONFIG.WHATSAPP_URL);

  /* ---------- Modal ---------- */
  function openModal() {
    if (unlocked) return;
    lastFocus = document.activeElement;
    clearErrors();
    modal.hidden = false;
    document.body.classList.add("lock");
    setTimeout(function () { nameIn.focus(); }, 50);
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll("[data-open-lead]").forEach(function (b) {
    b.addEventListener("click", function () {
      $("video").scrollIntoView({ behavior: "smooth", block: "center" });
      openModal();
    });
  });
  var thumb = $("thumb");
  thumb.addEventListener("click", openModal);
  thumb.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(); }
  });
  $("closeBtn").addEventListener("click", function () { if (!submitting) closeModal(); });
  modal.addEventListener("mousedown", function (e) { if (e.target === modal && !submitting) closeModal(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden && !submitting) closeModal();
    if (e.key === "Tab" && !modal.hidden) { // simple focus trap
      var f = modal.querySelectorAll("button:not([disabled]),input");
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Validation ---------- */
  function validName(v) {
    v = v.trim().replace(/\s+/g, " ");
    return v.length >= 2 && v.length <= 60 && /^[\p{L}][\p{L}\p{M} .'\-]*$/u.test(v);
  }
  // Returns normalized "+91XXXXXXXXXX" or null
  function normMobile(v) {
    var s = v.replace(/[\s\-()]/g, "");
    var m = /^(?:\+91)?([6-9]\d{9})$/.exec(s);
    return m ? "+91" + m[1] : null;
  }
  function setErr(input, errEl, msg) {
    errEl.textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }
  function clearErrors() {
    setErr(nameIn, $("nameErr"), ""); setErr(mobIn, $("mobErr"), ""); formErr.textContent = "";
  }
  nameIn.addEventListener("input", function () { setErr(nameIn, $("nameErr"), ""); });
  mobIn.addEventListener("input", function () { setErr(mobIn, $("mobErr"), ""); });

  /* ---------- Submit ---------- */
  function setLoading(on) {
    submitting = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("loading", on);
    submitTxt.textContent = on ? "SAVING…" : "SUBMIT & WATCH VIDEO";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;                       // block duplicate submits
    clearErrors();
    var name = nameIn.value.trim().replace(/\s+/g, " ");
    var mobile = normMobile(mobIn.value);
    var ok = true;
    if (!name) { setErr(nameIn, $("nameErr"), "Please enter your full name."); ok = false; }
    else if (!validName(name)) { setErr(nameIn, $("nameErr"), "Use letters only (2–60 characters)."); ok = false; }
    if (!mobIn.value.trim()) { setErr(mobIn, $("mobErr"), "Please enter your mobile number."); ok = false; }
    else if (!mobile) { setErr(mobIn, $("mobErr"), "Enter a valid 10-digit Indian mobile number (starts with 6–9)."); ok = false; }
    if (!ok) { (nameIn.getAttribute("aria-invalid") ? nameIn : mobIn).focus(); return; }

    if (!CONFIG.WEBHOOK_URL || /YOUR_/.test(CONFIG.WEBHOOK_URL)) {
      formErr.textContent = "Form is not connected yet. Set WEBHOOK_URL in script.js.";
      return;
    }
    setLoading(true);
    sendLead({ fullName: name, mobile: mobile }).then(function () {
      setLoading(false);
      unlocked = true;
      closeModal();
      startVideo();
    }).catch(function (err) {
      setLoading(false);
      formErr.textContent = err && err.message ? err.message : "Could not save your details. Please try again.";
    });
  });

  /* Content-Type text/plain keeps this a "simple" request (no CORS preflight).
     Apps Script answers via a redirect whose response is CORS-readable, so we can
     read the JSON and confirm the row was really saved. No no-cors guessing. */
  function sendLead(data) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, CONFIG.TIMEOUT_MS);
    var payload = {
      fullName: data.fullName,
      mobile: data.mobile,
      source: CONFIG.SOURCE,
      videoId: CONFIG.VIDEO_ID,
      clientTime: new Date().toISOString()
    };
    return fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: ctrl.signal
    }).then(function (res) {
      if (!res.ok) throw new Error("Server error (" + res.status + "). Please try again.");
      return res.json();
    }).then(function (json) {
      if (!json || json.success !== true || !json.rowId) {
        throw new Error((json && json.error) || "Your details could not be saved. Please try again.");
      }
      return json;
    }).catch(function (err) {
      if (err.name === "AbortError") throw new Error("The request timed out. Check your connection and try again.");
      if (err instanceof TypeError) throw new Error("Network error. Check your connection and try again.");
      throw err;
    }).then(function (v) { clearTimeout(timer); return v; },
            function (e) { clearTimeout(timer); throw e; });
  }

  /* ---------- YouTube (loaded only after a confirmed save) ---------- */
  function startVideo() {
    $("videoBox").classList.add("playing");
    if (window.YT && YT.Player) { createPlayer(); return; }
    window.onYouTubeIframeAPIReady = createPlayer;
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = function () { // API blocked: fall back to a plain autoplay iframe
      $("player").innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + CONFIG.VIDEO_ID +
        '?autoplay=1&playsinline=1&rel=0" title="MT5 video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    };
    document.head.appendChild(s);
  }

  function createPlayer() {
    player = new YT.Player("player", {
      host: "https://www.youtube-nocookie.com",
      videoId: CONFIG.VIDEO_ID,
      width: "100%", height: "100%",
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: function (e) {
          var f = e.target.getIframe();
          f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
          e.target.playVideo();
          // Some mobile browsers block unmuted autoplay: retry muted, offer unmute.
          setTimeout(function () {
            var st = e.target.getPlayerState();
            if (st !== 1 && st !== 3) {
              e.target.mute();
              e.target.playVideo();
              $("unmute").hidden = false;
            }
          }, 1500);
        },
        onStateChange: function (e) { if (e.data === 1 && !player.isMuted()) $("unmute").hidden = true; }
      }
    });
  }
  $("unmute").addEventListener("click", function () {
    if (player) { player.unMute(); player.playVideo(); }
    this.hidden = true;
  });
})();
