const allowedTags = {
  "NES_MARIO_001": {
    game: "mario"
  }
};

const params = new URLSearchParams(window.location.search);
const tag = params.get("tag");

const loadingScreen = document.getElementById("loading-screen");
const deniedScreen = document.getElementById("denied-screen");
const gameContainer = document.getElementById("game");

if (!tag || !allowedTags[tag]) {
  loadingScreen.classList.add("hidden");
  deniedScreen.classList.remove("hidden");
} else {
  loadingScreen.querySelector("p").textContent = "Authorized NFC detected...";
  
  setTimeout(() => {
    loadingScreen.querySelector("p").textContent = "Emulator coming soon...";
  }, 1000);
}
