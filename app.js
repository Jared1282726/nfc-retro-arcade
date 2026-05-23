const allowedTags = {};

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

// SNES
registerGame(
  "SNES_DKC_001",
  "snes",
  "roms/SNES/DKCountry.smc"
);

// PSX via Cloudflare R2
registerGame(
  "PSX_CRASH1_001",
  "psx",
  "https://pub-dfad97359ea943fa86c939804cd37680.r2.dev/Crash1.chd",
  {
    biosUrl: "data/bios/scph1001.bin"
  }
);

const params = new URLSearchParams(window.location.search);
const tag = params.get("tag");
const pageUrl = new URL(window.location.href);

const loadingScreen = document.getElementById("loading-screen");
const deniedScreen = document.getElementById("denied-screen");
const gameContainer = document.getElementById("game");

function disableBrowserGestures(container) {
  const preventDefault = (event) => {
    event.preventDefault();
  };

  const preventContextMenu = (event) => {
    event.preventDefault();
  };

  container.addEventListener("contextmenu", preventContextMenu);
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

  window.EJS_player = "#game";
  window.EJS_core = game.core;

  // Absolute URLs stay untouched, local files become full URLs
  window.EJS_gameUrl = new URL(game.gameUrl, pageUrl).toString();

  window.EJS_pathtodata = new URL("data/", pageUrl).toString();

  if (game.biosUrl) {
    window.EJS_biosUrl = new URL(game.biosUrl, pageUrl).toString();
  }

  window.EJS_alignStartButton = "center";
  window.EJS_startOnLoaded = false;
  window.EJS_adUrl = "";

  const script = document.createElement("script");
  script.src = window.EJS_pathtodata + "loader.js";
  document.body.appendChild(script);
}
