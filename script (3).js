/* IFX MARKETING – script.js */ 

/* ============ CONFIGURATION (edit these) ============ */
const CONFIG = {
  // Replace with your YouTube video ID (the part after ?v= in the URL).
  // Also update the thumbnail <img src> and og:image in index.html.
  VIDEO_ID: "9ybk6Go0ZRQ",
  // Replace the placeholders. Buttons stay disabled while "YOUR_" remains.
  TELEGRAM_URL: "https://t.me/YOUR_TELEGRAM_USERNAME",
  WHATSAPP_URL: "https://wa.me/YOUR_WHATSAPP_NUMBER"
};
/* ==================================================== */

const $ = (id) => document.getElementById(id);
const el = {
  burger: $("burger"), menu: $("menu"), box: $("videoBox"), thumb: $("videoThumb"),
  modal: $("modal"), close: $("modalClose"), form: $("leadForm"),
  name: $("fullName"), mobile: $("mobile"), nameErr: $("nameErr"), mobileErr: $("mobileErr"),
  submit: $("submitBtn")
};

// Lead data kept in memory only (for future backend integration)
let leadData = null;
let isSubmitting = false;
let videoLoaded = false;
let lastFocus = null;

/* ---------- Header / mobile menu ---------- */
el.burger.addEventListener("click", () => {
  const open = el.menu.classList.toggle("open");
  el.burger.setAttribute("aria-expanded", open);
});
el.menu.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    el.menu.classList.remove("open");
    el.burger.setAttribute("aria-expanded", "false");
  }
});
$("year").textContent = new Date().getFullYear();

/* ---------- Contact links ---------- */
function setupContact(id, url) {
  const a = $(id);
  if (!url || url.includes("YOUR_")) {
    a.classList.add("disabled");
    a.setAttribute("aria-disabled", "true");
    a.removeAttribute("href");
    a.removeAttribute("target");
    a.title = "Link not configured yet";
  } else {
    a.href = url;
  }
}
setupContact("telegramBtn", CONFIG.TELEGRAM_URL);
setupContact("whatsappBtn", CONFIG.WHATSAPP_URL);

/* ---------- Modal ---------- */
function openModal() {
  if (videoLoaded || !el.modal.hidden) return; // ignore repeated clicks
  lastFocus = document.activeElement;
  el.modal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => el.name.focus(), 50);
}
function closeModal() {
  el.modal.hidden = true;
  document.body.style.overflow = "";
  if (lastFocus && !videoLoaded) lastFocus.focus();
}
el.thumb.addEventListener("click", openModal);
el.thumb.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(); }
});
el.close.addEventListener("click", closeModal);
el.modal.addEventListener("click", (e) => { if (e.target === el.modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.modal.hidden) closeModal(); });

/* ---------- Validation ---------- */
function validateName(v) {
  v = v.trim();
  if (!v) return "Please enter your full name.";
  if (v.length < 2) return "Name must be at least 2 characters.";
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(v)) return "Name can contain only letters and spaces.";
  return "";
}
function normalizeMobile(v) {
  const c = v.replace(/[\s-]/g, "");
  const m = c.match(/^(?:\+91)?([6-9]\d{9})$/);
  return m ? m[1] : null;
}
function validateMobile(v) {
  if (!v.trim()) return "Please enter your mobile number.";
  if (!normalizeMobile(v)) return "Enter a valid 10-digit Indian mobile number (optional +91).";
  return "";
}
function showErr(input, span, msg) {
  span.textContent = msg;
  input.classList.toggle("invalid", !!msg);
  input.setAttribute("aria-invalid", msg ? "true" : "false");
}
el.name.addEventListener("input", () => showErr(el.name, el.nameErr, ""));
el.mobile.addEventListener("input", () => showErr(el.mobile, el.mobileErr, ""));

/* ---------- Form submit ---------- */
el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  const nErr = validateName(el.name.value);
  const mErr = validateMobile(el.mobile.value);
  showErr(el.name, el.nameErr, nErr);
  showErr(el.mobile, el.mobileErr, mErr);
  if (nErr || mErr) { (nErr ? el.name : el.mobile).focus(); return; }

  isSubmitting = true;
  el.submit.disabled = true;
  el.submit.textContent = "PLEASE WAIT...";

  const name = el.name.value.trim().replace(/\s+/g, " ");
  const mobile = "+91" + normalizeMobile(el.mobile.value);

  // Everything below runs inside the same user gesture where possible,
  // so the browser allows autoplay of the video.
  handleLeadSubmission(name, mobile);
  closeModal();
  loadVideo();
});

/**
 * Receives the validated lead. Data is held in memory only.
 */
function handleLeadSubmission(name, mobile) {
  leadData = { name, mobile, time: new Date().toISOString() };

  // FUTURE GOOGLE SHEETS INTEGRATION
  // Add Google Apps Script Web App URL and API submission logic here.
  // Example (later): fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(leadData) });
  // Currently NO data is sent anywhere.
}

/* ---------- YouTube player ---------- */
let player = null;

function loadVideo() {
  if (videoLoaded) return;
  videoLoaded = true;

  // Remove thumbnail + play button, and create the player target in the same container
  el.box.innerHTML = '<div id="ytPlayer"></div>';

  if (window.YT && window.YT.Player) {
    createPlayer();
  } else {
    window.onYouTubeIframeAPIReady = createPlayer;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = fallbackIframe; // if the API script is blocked
    document.head.appendChild(s);
  }
}

function createPlayer() {
  player = new YT.Player("ytPlayer", {
    videoId: CONFIG.VIDEO_ID,
    width: "100%", height: "100%",
    playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: (e) => {
        e.target.playVideo();
        // If sound autoplay is blocked, retry muted and show an unmute button
        setTimeout(() => {
          const st = e.target.getPlayerState();
          if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING) {
            e.target.mute();
            e.target.playVideo();
            showUnmute();
          }
        }, 1200);
      }
    }
  });
}

function showUnmute() {
  if (document.getElementById("unmuteBtn")) return;
  const b = document.createElement("button");
  b.id = "unmuteBtn"; b.className = "unmute"; b.type = "button";
  b.textContent = "Tap to unmute";
  b.addEventListener("click", () => { player.unMute(); player.setVolume(100); b.remove(); });
  el.box.appendChild(b);
}

// Plain iframe fallback if the IFrame API cannot load
function fallbackIframe() {
  el.box.innerHTML =
    '<iframe src="https://www.youtube.com/embed/' + CONFIG.VIDEO_ID +
    '?autoplay=1&playsinline=1&rel=0" title="MT5 information video" ' +
    'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
}
