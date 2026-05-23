const allowedTags = {};

function registerGame(tag, core, gameUrl) {
  if (!tag || !core || !gameUrl) {
    throw new Error("Each game must include tag, core and gameUrl.");
  }

  if (allowedTags[tag]) {
    throw new Error(`Duplicate tag detected: ${tag}`);
  }

  allowedTags[tag] = { core, gameUrl };
}

// Add one game per line with this structure:
// registerGame("TAG_UNICO", "core", "ruta/del/juego.ext");
registerGame("NES_MARIO_001", "nes", "roms/NES/mario.nes");
registerGame("SNES_DKC_001", "snes", "roms/SNES/DKCountry.smc");

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
  window.EJS_gameUrl = new URL(game.gameUrl, pageUrl).toString();
  window.EJS_pathtodata = new URL("data/", pageUrl).toString();
  window.EJS_alignStartButton = "center";

  window.EJS_startOnLoaded = false;

  // IMPORTANT
  window.EJS_adUrl = "";
}
