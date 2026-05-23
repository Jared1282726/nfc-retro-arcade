const allowedTags = {
  NES_MARIO_001: {
    gameUrl: "roms/NES/mario.nes",
    core: "nes"
  },
  SNES_DKC_001: {
    gameUrl: "roms/SNES/DKCountry.smc",
    core: "snes"
  }
};

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
