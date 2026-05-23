const allowedTags = {
  NES_MARIO_001: {
    gameUrl: "roms/mario.nes",
    core: "nes"
  }
};

const params = new URLSearchParams(window.location.search);
const tag = params.get("tag");
const pageUrl = new URL(window.location.href);

const loadingScreen = document.getElementById("loading-screen");
const deniedScreen = document.getElementById("denied-screen");

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
