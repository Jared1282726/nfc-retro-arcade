const allowedTags = {
  NES_MARIO_001: {
    gameUrl: "roms/mario.nes",
    core: "nes"
  }
};

const params = new URLSearchParams(window.location.search);
const tag = params.get("tag");

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
  window.EJS_gameUrl = game.gameUrl;
  window.EJS_pathtodata = "./data/";

  window.EJS_startOnLoaded = true;

  // IMPORTANT
  window.EJS_adUrl = "";
}
