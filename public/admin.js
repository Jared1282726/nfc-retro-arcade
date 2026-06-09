const sessionBadge = document.getElementById("session-badge");
const logoutButton = document.getElementById("logout-button");
const loginPanel = document.getElementById("login-panel");
const loginForm = document.getElementById("login-form");
const dashboard = document.getElementById("dashboard");
const setupPanel = document.getElementById("setup-panel");
const setupIssues = document.getElementById("setup-issues");

const romUploadForm = document.getElementById("rom-upload-form");
const uploadSetup = document.getElementById("upload-setup");
const uploadCore = document.getElementById("upload-core");
const uploadSubfolder = document.getElementById("upload-subfolder");
const uploadFile = document.getElementById("upload-file");
const uploadFileName = document.getElementById("upload-file-name");
const uploadResult = document.getElementById("rom-upload-result");
const githubTarget = document.getElementById("github-target");

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

function normalizeCoreValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function resolveSelectValue(select, value) {
  const wanted = normalizeCoreValue(value);
  const option = Array.from(select.options).find((entry) => normalizeCoreValue(entry.value) === wanted);
  return option?.value || "";
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

function guessGameName(value) {
  const fileName = String(value || "").split("/").pop() || "";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const withSpaces = baseName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!withSpaces) {
    return "";
  }

  return withSpaces.replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function primeCardForm() {
  if (!cardKey.value.trim()) {
    cardKey.value = crypto.randomUUID();
  }
}

function applyRomToCard(rom, options = {}) {
  const resolvedCore = resolveSelectValue(cardCore, rom.core);
  const suggestedName = rom.suggestedName || rom.name || guessGameName(rom.path);
  const shouldReplaceName = options.replaceName || !cardName.value.trim();
  const shouldReplaceTag = options.replaceTag || !cardTag.value.trim();

  cardGameUrl.value = rom.path;

  if (resolvedCore) {
    cardCore.value = resolvedCore;
  }

  if (suggestedName && shouldReplaceName) {
    cardName.value = suggestedName;
  }

  if (shouldReplaceTag) {
    cardTag.value = slugifyTag(cardName.value || suggestedName || "");
  }

  primeCardForm();
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
      applyRomToCard(rom);
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
  const selectedCore = normalizeCoreValue(romFilterCore.value);
  const filtered = selectedCore
    ? romCatalog.filter((rom) => normalizeCoreValue(rom.core) === selectedCore)
    : romCatalog;
  renderRoms(filtered);
}

async function loadDashboard() {
  await Promise.all([refreshCards(), refreshRoms()]);
}

function renderUploadSetup(session) {
  githubTarget.textContent = session.githubTarget || "GitHub no configurado";
  clearMessage(uploadSetup);

  if (session.uploadConfigured) {
    setMessage(
      uploadSetup,
      "success",
      `Los ROMs nuevos se subiran directo a <span class="mono">${session.githubTarget}</span> y dejaran lista la ruta para la NFC.`
    );
    romUploadForm.classList.remove("hidden");
    return;
  }

  setMessage(
    uploadSetup,
    "error",
    session.uploadIssues.map((issue) => `<span>${issue}</span>`).join("<br>")
  );
  romUploadForm.classList.add("hidden");
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

  renderUploadSetup(session);

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

romUploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(uploadResult);
  const button = romUploadForm.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Subiendo...");

  try {
    const formData = new FormData();
    formData.set("core", uploadCore.value);
    formData.set("subfolder", uploadSubfolder.value.trim());
    formData.set("fileName", uploadFileName.value.trim());

    if (!uploadFile.files?.[0]) {
      throw new Error("Elige un ROM antes de subirlo.");
    }

    formData.set("rom", uploadFile.files[0]);

    const { upload } = await api("/api/admin/roms", {
      method: "POST",
      body: formData
    });

    applyRomToCard(upload, { replaceName: true, replaceTag: true });
    setMessage(
      uploadResult,
      "success",
      `<strong>ROM subido al repo.</strong><br><span class="mono">${upload.path}</span><br><span>La ruta ya quedo lista para la NFC. Si Pages hace auto deploy, espera a que termine antes de probar el juego en vivo.</span>`
    );

    romUploadForm.reset();
    uploadCore.value = resolveSelectValue(uploadCore, upload.core) || uploadCore.value;
    await refreshRoms();
  } catch (error) {
    setMessage(uploadResult, "error", error.message);
  } finally {
    setButtonBusy(button, false, "Subir ROM al repo");
  }
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
    primeCardForm();
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

primeCardForm();

updateSession().catch((error) => {
  sessionBadge.textContent = "Error";
  alert(error.message);
});
