const EJS_DATA_PATH = "/data/";

const params = new URLSearchParams(window.location.search);
const cardKey = params.get("key");
const legacyTag = params.get("tag");
const pageUrl = new URL(window.location.href);
const debugEnabled = params.get("debug") === "1";
const userAgent = navigator.userAgent || "";
const isIPhoneSafari = /iPhone|iPad|iPod/i.test(userAgent) && /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent);

const loadingScreen = document.getElementById("loading-screen");
const deniedScreen = document.getElementById("denied-screen");
const gameContainer = document.getElementById("game");

function setupDebugOverlay() {
  if (!debugEnabled) {
    return;
  }

  const panel = document.createElement("pre");
  panel.id = "debug-log";
  panel.style.position = "fixed";
  panel.style.left = "12px";
  panel.style.right = "12px";
  panel.style.bottom = "12px";
  panel.style.maxHeight = "40dvh";
  panel.style.overflow = "auto";
  panel.style.margin = "0";
  panel.style.padding = "12px";
  panel.style.background = "rgba(0, 0, 0, 0.9)";
  panel.style.color = "#7CFFB2";
  panel.style.font = "12px/1.4 monospace";
  panel.style.border = "1px solid rgba(124, 255, 178, 0.35)";
  panel.style.borderRadius = "10px";
  panel.style.zIndex = "99999";
  panel.style.whiteSpace = "pre-wrap";
  panel.style.pointerEvents = "none";
  document.body.appendChild(panel);

  const write = (label, value) => {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    panel.textContent += `[${label}] ${text}\n`;
    panel.scrollTop = panel.scrollHeight;
  };

  write("debug", "enabled");
  write("location", window.location.href);

  window.addEventListener("error", (event) => {
    write("error", `${event.message} @ ${event.filename}:${event.lineno}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.stack || event.reason?.message || String(event.reason);
    write("promise", reason);
  });

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalLog = console.log.bind(console);

  console.warn = (...args) => {
    write("warn", args.map(String).join(" "));
    originalWarn(...args);
  };

  console.error = (...args) => {
    write("console.error", args.map(String).join(" "));
    originalError(...args);
  };

  console.log = (...args) => {
    write("log", args.map(String).join(" "));
    originalLog(...args);
  };
}

function disableBrowserGestures(container) {
  const preventDefault = (event) => event.preventDefault();

  container.addEventListener("contextmenu", preventDefault);
  container.addEventListener("dragstart", preventDefault);
  container.addEventListener("selectstart", preventDefault);
  container.addEventListener("gesturestart", preventDefault);
  container.addEventListener("gesturechange", preventDefault);
  container.addEventListener("gestureend", preventDefault);
}

function showDeniedScreen() {
  loadingScreen.classList.add("hidden");
  deniedScreen.classList.remove("hidden");
}

async function fetchGameConfig() {
  if (!cardKey && !legacyTag) {
    return null;
  }

  const apiUrl = new URL("/api/game", pageUrl);

  if (cardKey) {
    apiUrl.searchParams.set("key", cardKey);
  } else {
    apiUrl.searchParams.set("tag", legacyTag);
  }

  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function bootGame(game) {
  loadingScreen.classList.add("hidden");
  const assetUrl = new URL("/api/asset", pageUrl);

  if (cardKey) {
    assetUrl.searchParams.set("key", cardKey);
  } else if (legacyTag) {
    assetUrl.searchParams.set("tag", legacyTag);
  }

  window.EJS_DEBUG_XX = debugEnabled;
  window.EJS_player = "#game";
  window.EJS_core = game.core;
  assetUrl.searchParams.set("kind", "game");
  window.EJS_gameUrl = assetUrl.toString();
  window.EJS_pathtodata = EJS_DATA_PATH;
  window.EJS_disableLocalStorage = isIPhoneSafari;
  window.EJS_cacheConfig = isIPhoneSafari ? { enabled: false } : undefined;
  window.EJS_disableDatabases = isIPhoneSafari;

  if (game.hasBios) {
    const biosUrl = new URL(assetUrl);
    biosUrl.searchParams.set("kind", "bios");
    window.EJS_biosUrl = biosUrl.toString();
  }

  window.EJS_alignStartButton = "center";
  window.EJS_startOnLoaded = false;
  window.EJS_adUrl = "";

  if (debugEnabled) {
    console.log("credentialType", cardKey ? "key" : "tag");
    console.log("core", window.EJS_core);
    console.log("gameUrl", window.EJS_gameUrl);
    console.log("dataPath", window.EJS_pathtodata);
    console.log("biosUrl", window.EJS_biosUrl || "none");
    console.log("isIPhoneSafari", isIPhoneSafari);
    console.log("disableDatabases", window.EJS_disableDatabases);
  }

  const script = document.createElement("script");
  script.src = window.EJS_pathtodata + "loader.js";
  document.body.appendChild(script);
}

setupDebugOverlay();
disableBrowserGestures(gameContainer);

(async () => {
  try {
    const game = await fetchGameConfig();

    if (!game) {
      showDeniedScreen();
      return;
    }

    bootGame(game);
  } catch (error) {
    console.error("Unable to resolve NFC credential.", error);
    showDeniedScreen();
  }
})();
