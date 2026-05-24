const allowedTags = {};
const EJS_DATA_PATH = "https://cdn.emulatorjs.org/stable/data/";

function registerGame(tag, core, gameUrl, options = {}) {
  if (!tag || !core || !gameUrl) {
    throw new Error("Each game must include tag, core and gameUrl.");
  }

  if (allowedTags[tag]) {
    throw new Error(`Duplicate tag detected: ${tag}`);
  }

  allowedTags[tag] = {
    core,
    gameUrl,
    ...options
  };
}

// NES
registerGame(
  "NES_MARIO_001",
  "nes",
  "roms/NES/mario.nes"
);

registerGame(
  "NES_MARIO_002",
  "nes",
  "roms/NES/SuperMarioWorld.nes"
);

// SNES
registerGame(
  "SNES_DKC_001",
  "snes",
  "roms/SNES/DKCountry.smc"
);

//GBA
registerGame(
  "GBA_MARIOWORLD1_001",
  "gba",
  "roms/GBA/spmarioworld1.gba"
);

//N64
registerGame(
  "N64_SF_001",
  "n64",
  "roms/N64/StarFox.z64"
);

// PSX
registerGame(
  "PSX_CRASH1_001",
  "psx",
  "https://pub-dfad97359ea943fa86c939804cd37680.r2.dev/Crash1.chd",
  {
    biosUrl: "data/bios/scph1001.BIN"
  }
);

const params = new URLSearchParams(window.location.search);
const tag = params.get("tag");
const pageUrl = new URL(window.location.href);
const debugEnabled = params.get("debug") === "1";

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

setupDebugOverlay();

function disableBrowserGestures(container) {
  const preventDefault = (event) => event.preventDefault();

  container.addEventListener("contextmenu", preventDefault);
  container.addEventListener("dragstart", preventDefault);
  container.addEventListener("selectstart", preventDefault);
  container.addEventListener("gesturestart", preventDefault);
  container.addEventListener("gesturechange", preventDefault);
  container.addEventListener("gestureend", preventDefault);
}

disableBrowserGestures(gameContainer);

if (!tag || !allowedTags[tag]) {
  loadingScreen.classList.add("hidden");
  deniedScreen.classList.remove("hidden");
} else {
  loadingScreen.classList.add("hidden");

  const game = allowedTags[tag];

  window.EJS_DEBUG_XX = debugEnabled;
  window.EJS_player = "#game";
  window.EJS_core = game.core;
  window.EJS_gameUrl = new URL(game.gameUrl, pageUrl).toString();
  window.EJS_pathtodata = EJS_DATA_PATH;

  if (game.biosUrl) {
    window.EJS_biosUrl = new URL(game.biosUrl, pageUrl).toString();
  }

  window.EJS_alignStartButton = "center";
  window.EJS_startOnLoaded = false;
  window.EJS_adUrl = "";

  if (debugEnabled) {
    console.log("tag", tag);
    console.log("core", window.EJS_core);
    console.log("gameUrl", window.EJS_gameUrl);
    console.log("dataPath", window.EJS_pathtodata);
    console.log("biosUrl", window.EJS_biosUrl || "none");
  }

  const script = document.createElement("script");
  script.src = window.EJS_pathtodata + "loader.js";
  document.body.appendChild(script);
}
