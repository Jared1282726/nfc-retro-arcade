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
  window.EJS_pathtodata = "data/";

  // Auto start
  window.EJS_startOnLoaded = true;
  window.EJS_disableCue = true;
  window.EJS_fullscreenOnLoad = true;

  // UI cleanup
  window.EJS_hideSettings = true;
  window.EJS_hideSaveState = true;
  window.EJS_hideLoadState = true;
  window.EJS_hideScreenshot = true;
  window.EJS_hideQuickSave = true;
  window.EJS_hideQuickLoad = true;

  // Mobile friendly
  window.EJS_backgroundColor = "#000000";
  window.EJS_disableDatabases = true;
}
