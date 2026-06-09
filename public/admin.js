const sessionBadge = document.getElementById("session-badge");
const logoutButton = document.getElementById("logout-button");
const loginPanel = document.getElementById("login-panel");
const loginForm = document.getElementById("login-form");
const dashboard = document.getElementById("dashboard");
const setupPanel = document.getElementById("setup-panel");
const setupIssues = document.getElementById("setup-issues");

const cardForm = document.getElementById("card-form");
const cardName = document.getElementById("card-name");
const cardTag = document.getElementById("card-tag");
const cardKey = document.getElementById("card-key");
const cardCore = document.getElementById("card-core");
const cardGameUrl = document.getElementById("card-game-url");
const cardBiosUrl = document.getElementById("card-bios-url");
const cardResult = document.getElementById("card-result");
const romFilterCore = document.getElementById("rom-filter-core");

const cardsList = document.getElementById("cards-list");
const cardsEmpty = document.getElementById("cards-empty");
const romsList = document.getElementById("roms-list");
const romsEmpty = document.getElementById("roms-empty");

const cardTemplate = document.getElementById("card-template");
const romTemplate = document.getElementById("rom-template");
let romCatalog = [];

function slugifyTag(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${bytes || 0} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let index = -1;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function setMessage(node, type, html) {
  node.className = `result ${type}`;
  node.innerHTML = html;
  node.classList.remove("hidden");
}

function clearMessage(node) {
  node.className = "result hidden";
  node.textContent = "";
}

function setButtonBusy(button, busy, label) {
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent;
  }

  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.defaultLabel;
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

function renderCards(cards) {
  cardsList.textContent = "";
  cardsEmpty.classList.toggle("hidden", cards.length !== 0);

  for (const card of cards) {
    const fragment = cardTemplate.content.cloneNode(true);
    fragment.querySelector('[data-role="name"]').textContent = card.name || card.tag;
    fragment.querySelector('[data-role="source"]').textContent = card.source;
    fragment.querySelector('[data-role="accessMode"]').textContent = card.accessMode;
    fragment.querySelector('[data-role="core"]').textContent = card.core;
    fragment.querySelector('[data-role="tag"]').textContent = `tag: ${card.tag}`;
    fragment.querySelector('[data-role="key"]').textContent = `key: ${card.key}`;
    fragment.querySelector('[data-role="game"]').textContent = `game: ${card.gameUrl}`;

    fragment.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const property = button.getAttribute("data-copy");
        await copyText(card[property]);
        button.textContent = "Copiado";
        setTimeout(() => {
          button.textContent = property === "writeUrl" ? "Copiar URL NFC" : "Copiar llave";
        }, 1200);
      });
    });

    cardsList.appendChild(fragment);
  }
}

function renderRoms(roms) {
  romsList.textContent = "";
  romsEmpty.classList.toggle("hidden", roms.length !== 0);

  for (const rom of roms) {
    const fragment = romTemplate.content.cloneNode(true);
    fragment.querySelector('[data-role="key"]').textContent = rom.name || rom.path;
    fragment.querySelector('[data-role="path"]').textContent = rom.path;
    fragment.querySelector('[data-role="size"]').textContent = formatBytes(rom.size);

    fragment.querySelector("[data-copy]").addEventListener("click", async (event) => {
      cardGameUrl.value = rom.path;
      cardCore.value = rom.core || cardCore.value;
      event.currentTarget.textContent = "Seleccionado";
      setTimeout(() => {
        event.currentTarget.textContent = "Usar en NFC";
      }, 1200);
    });

    romsList.appendChild(fragment);
  }
}

async function refreshCards() {
  const { cards } = await api("/api/admin/cards");
  renderCards(cards);
}

async function refreshRoms() {
  const { roms } = await api("/api/admin/roms");
  romCatalog = roms;
  const selectedCore = romFilterCore.value;
  const filtered = selectedCore
    ? romCatalog.filter((rom) => rom.core === selectedCore)
    : romCatalog;
  renderRoms(filtered);
}

async function loadDashboard() {
  await Promise.all([refreshCards(), refreshRoms()]);
}

async function updateSession() {
  const session = await api("/api/admin/session");
  const authenticated = session.authenticated;
  sessionBadge.textContent = authenticated ? "Sesion activa" : "Sesion cerrada";
  loginPanel.classList.toggle("hidden", authenticated);
  dashboard.classList.toggle("hidden", !authenticated);
  logoutButton.classList.toggle("hidden", !authenticated);

  setupPanel.classList.toggle("hidden", session.issues.length === 0);
  setupIssues.textContent = "";

  for (const issue of session.issues) {
    const item = document.createElement("li");
    item.textContent = issue;
    setupIssues.appendChild(item);
  }

  if (authenticated) {
    await loadDashboard();
  }
}

document.getElementById("tag-button").addEventListener("click", () => {
  cardTag.value = slugifyTag(cardName.value);
});

document.getElementById("key-button").addEventListener("click", () => {
  cardKey.value = crypto.randomUUID();
});

cardName.addEventListener("input", () => {
  if (!cardTag.value) {
    cardTag.value = slugifyTag(cardName.value);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Entrando...");

  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password: document.getElementById("password").value
      })
    });
    document.getElementById("password").value = "";
    await updateSession();
  } catch (error) {
    alert(error.message);
  } finally {
    setButtonBusy(button, false, "Entrar al panel");
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" });
  await updateSession();
});

cardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(cardResult);
  const button = cardForm.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Guardando...");

  try {
    const payload = {
      name: cardName.value.trim(),
      tag: cardTag.value.trim(),
      key: cardKey.value.trim(),
      core: cardCore.value.trim(),
      gameUrl: cardGameUrl.value.trim(),
      biosUrl: cardBiosUrl.value.trim()
    };

    const { card } = await api("/api/admin/cards", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    setMessage(
      cardResult,
      "success",
      `<strong>Tarjeta creada.</strong><br><span class="mono">${card.writeUrl}</span>`
    );

    cardForm.reset();
    await refreshCards();
  } catch (error) {
    setMessage(cardResult, "error", error.message);
  } finally {
    setButtonBusy(button, false, "Guardar tarjeta NFC");
  }
});

document.getElementById("refresh-cards").addEventListener("click", refreshCards);
document.getElementById("refresh-roms").addEventListener("click", refreshRoms);
document.getElementById("refresh-roms-top").addEventListener("click", refreshRoms);
romFilterCore.addEventListener("change", refreshRoms);

updateSession().catch((error) => {
  sessionBadge.textContent = "Error";
  alert(error.message);
});
