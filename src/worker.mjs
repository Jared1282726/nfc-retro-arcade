import { cards as bundledCards, resolveCard as resolveBundledCard, toPublicGameConfig } from "./nfc-registry.mjs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

const SESSION_COOKIE = "nfc_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const STORAGE_PREFIX = "card:";
const TAG_PREFIX = "tag:";
const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow"
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {})
    }
  });
}

function parseCookies(cookieHeader) {
  const cookies = {};

  for (const chunk of (cookieHeader || "").split(";")) {
    const trimmed = chunk.trim();

    if (!trimmed) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      cookies[trimmed] = "";
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    cookies[key] = value;
  }

  return cookies;
}

function encodeBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return diff === 0;
}

async function signValue(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return encodeBase64Url(signature);
}

async function createSessionToken(secret) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomUUID();
  const payload = `${expiresAt}.${nonce}`;
  const signature = await signValue(payload, secret);

  return `${payload}.${signature}`;
}

async function isAuthenticated(request, env) {
  if (!env.ADMIN_SESSION_SECRET) {
    return false;
  }

  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[SESSION_COOKIE];

  if (!token) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [expiresAt, nonce, signature] = parts;
  const expiration = Number(expiresAt);

  if (!Number.isFinite(expiration) || expiration < Date.now()) {
    return false;
  }

  const payload = `${expiresAt}.${nonce}`;
  const expectedSignature = await signValue(payload, env.ADMIN_SESSION_SECRET);
  return timingSafeEqual(signature, expectedSignature);
}

function shouldUseSecureCookies(urlString) {
  const hostname = new URL(urlString).hostname;
  return !["localhost", "127.0.0.1"].includes(hostname);
}

function buildSessionCookie(token, requestUrl) {
  const secure = shouldUseSecureCookies(requestUrl) ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

function buildLogoutCookie(requestUrl) {
  const secure = shouldUseSecureCookies(requestUrl) ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`;
}

function hasKv(env) {
  return env.NFC_REGISTRY && typeof env.NFC_REGISTRY.get === "function";
}

function getAdminIssues(env) {
  const issues = [];

  if (!env.ADMIN_PASSWORD) {
    issues.push("Missing ADMIN_PASSWORD secret.");
  }

  if (!env.ADMIN_SESSION_SECRET) {
    issues.push("Missing ADMIN_SESSION_SECRET secret.");
  }

  if (!hasKv(env)) {
    issues.push("Missing NFC_REGISTRY KV binding.");
  }

  return issues;
}

function sanitizeTag(tag) {
  return String(tag || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}

function normalizeGamePath(pathValue) {
  const trimmed = String(pathValue || "").trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return trimmed;
}

function withWriteUrl(card, origin) {
  const accessMode = card.accessMode || "secure";
  const writeUrl = accessMode === "legacy"
    ? `${origin}/?tag=${encodeURIComponent(card.tag)}`
    : `${origin}/?key=${encodeURIComponent(card.key)}`;

  return {
    ...card,
    accessMode,
    writeUrl,
    keyUrl: `${origin}/?key=${encodeURIComponent(card.key)}`,
    legacyUrl: card.tag ? `${origin}/?tag=${encodeURIComponent(card.tag)}` : null
  };
}

function getCredentialPair(url) {
  return {
    key: url.searchParams.get("key"),
    tag: url.searchParams.get("tag")
  };
}

function buildAssetRequestUrl(assetPath, requestUrl) {
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const origin = new URL(requestUrl).origin;
  return new URL(`/${assetPath.replace(/^\/+/, "")}`, origin).toString();
}

function clonePrivateAssetHeaders(sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  headers.set("Cache-Control", PRIVATE_RESPONSE_HEADERS["Cache-Control"]);
  headers.set("X-Robots-Tag", PRIVATE_RESPONSE_HEADERS["X-Robots-Tag"]);
  return headers;
}

async function getStoredCardByKey(env, key) {
  if (!hasKv(env) || !key) {
    return null;
  }

  return env.NFC_REGISTRY.get(`${STORAGE_PREFIX}${key}`, "json");
}

async function getStoredCardByTag(env, tag) {
  if (!hasKv(env) || !tag) {
    return null;
  }

  const key = await env.NFC_REGISTRY.get(`${TAG_PREFIX}${tag}`);

  if (!key) {
    return null;
  }

  return getStoredCardByKey(env, key);
}

function canUseLegacyTag(card) {
  return (card?.accessMode || "secure") === "legacy";
}

async function cardTagExists(env, tag) {
  if (!tag) {
    return false;
  }

  if (await getStoredCardByTag(env, tag)) {
    return true;
  }

  return Boolean(resolveBundledCard({ tag }));
}

async function cardKeyExists(env, key) {
  if (!key) {
    return false;
  }

  if (await getStoredCardByKey(env, key)) {
    return true;
  }

  return Boolean(resolveBundledCard({ key }));
}

async function listStoredCards(env) {
  if (!hasKv(env)) {
    return [];
  }

  const cards = [];
  let cursor;
  let truncated = true;

  while (truncated) {
    const batch = await env.NFC_REGISTRY.list({
      prefix: STORAGE_PREFIX,
      cursor
    });
    const loaded = await Promise.all(
      batch.keys.map((entry) => env.NFC_REGISTRY.get(entry.name, "json"))
    );

    cards.push(
      ...loaded
        .filter(Boolean)
        .map((card) => ({
          ...card,
          source: "admin"
        }))
    );

    truncated = !batch.list_complete;
    cursor = batch.cursor;
  }

  return cards;
}

async function listAllCards(env) {
  const dynamicCards = await listStoredCards(env);
  const allCards = [
    ...bundledCards.map((card) => ({
      ...card,
      source: "bundled"
    })),
    ...dynamicCards
  ];

  return allCards.sort((left, right) => {
    const leftDate = left.createdAt || "";
    const rightDate = right.createdAt || "";

    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }

    return (left.name || left.tag).localeCompare(right.name || right.tag);
  });
}

async function resolveAnyCard(env, { key, tag }) {
  if (key) {
    const storedCard = await getStoredCardByKey(env, key);

    if (storedCard) {
      return storedCard;
    }
  }

  if (tag) {
    const storedCard = await getStoredCardByTag(env, tag);

    if (storedCard && canUseLegacyTag(storedCard)) {
      return storedCard;
    }
  }

  const bundledCard = resolveBundledCard({ key, tag });

  if (!bundledCard) {
    return null;
  }

  if (tag && !canUseLegacyTag(bundledCard)) {
    return null;
  }

  return bundledCard;
}

async function listRepoRoms(request, env) {
  const catalogRequest = new Request(new URL("/roms/catalog.json", request.url), request);
  const response = await env.ASSETS.fetch(catalogRequest);

  if (!response.ok) {
    return [];
  }

  const payload = await response.json().catch(() => ({ roms: [] }));
  return Array.isArray(payload.roms) ? payload.roms : [];
}

async function requireAdmin(request, env) {
  const authenticated = await isAuthenticated(request, env);

  if (!authenticated) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleGameRequest(request, env) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const tag = url.searchParams.get("tag");
  const card = await resolveAnyCard(env, { key, tag });

  if (!card) {
    return json({ error: "Invalid NFC credential." }, { status: 404 });
  }

  return json(toPublicGameConfig(card));
}

async function handleProtectedAssetRequest(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.", { status: 405 });
  }

  const url = new URL(request.url);
  const { key, tag } = getCredentialPair(url);
  const card = await resolveAnyCard(env, { key, tag });

  if (!card) {
    return new Response("Invalid NFC credential.", {
      status: 404,
      headers: PRIVATE_RESPONSE_HEADERS
    });
  }

  const kind = url.searchParams.get("kind") || "game";
  const assetPath = kind === "bios" ? card.biosUrl : card.gameUrl;

  if (!assetPath) {
    return new Response("Asset not available.", {
      status: 404,
      headers: PRIVATE_RESPONSE_HEADERS
    });
  }

  if (/^https?:\/\//i.test(assetPath)) {
    const upstreamResponse = await fetch(assetPath, {
      method: request.method,
      headers: {
        Range: request.headers.get("Range") || ""
      }
    });

    return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: clonePrivateAssetHeaders(upstreamResponse.headers)
    });
  }

  const assetRequest = new Request(buildAssetRequestUrl(assetPath, request.url), request);
  const assetResponse = await env.ASSETS.fetch(assetRequest);

  if (!assetResponse.ok) {
    return new Response("Asset not found.", {
      status: assetResponse.status,
      headers: PRIVATE_RESPONSE_HEADERS
    });
  }

  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers: clonePrivateAssetHeaders(assetResponse.headers)
  });
}

async function handleSessionRequest(request, env) {
  return json({
    authenticated: await isAuthenticated(request, env),
    configured: getAdminIssues(env).length === 0,
    issues: getAdminIssues(env)
  });
}

async function handleLoginRequest(request, env) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return json({ error: "Admin secrets are not configured." }, { status: 500 });
  }

  const body = await parseJson(request);
  const password = String(body?.password || "");

  if (!timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return json({ error: "Invalid password." }, { status: 401 });
  }

  const response = json({ ok: true });
  response.headers.append("Set-Cookie", buildSessionCookie(await createSessionToken(env.ADMIN_SESSION_SECRET), request.url));
  return response;
}

async function handleLogoutRequest(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  const response = json({ ok: true });
  response.headers.append("Set-Cookie", buildLogoutCookie(request.url));
  return response;
}

async function handleCardsRequest(request, env) {
  const unauthorized = await requireAdmin(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  if (request.method === "GET") {
    const cards = await listAllCards(env);
    const origin = new URL(request.url).origin;
    return json({
      cards: cards.map((card) => withWriteUrl(card, origin))
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  if (!hasKv(env)) {
    return json({ error: "NFC_REGISTRY KV binding is not configured." }, { status: 500 });
  }

  const body = await parseJson(request);
  const key = String(body?.key || crypto.randomUUID()).trim();
  const tag = sanitizeTag(body?.tag);
  const name = String(body?.name || "").trim();
  const core = String(body?.core || "").trim();
  const gameUrl = normalizeGamePath(body?.gameUrl);
  const biosUrl = normalizeGamePath(body?.biosUrl);

  if (!tag || !core || !gameUrl) {
    return json({ error: "tag, core and gameUrl are required." }, { status: 400 });
  }

  if (await cardKeyExists(env, key) || await cardTagExists(env, tag)) {
    return json({ error: "That NFC tag or key already exists." }, { status: 409 });
  }

  const card = {
    accessMode: "secure",
    tag,
    key,
    name: name || tag,
    core,
    gameUrl,
    ...(biosUrl ? { biosUrl } : {}),
    createdAt: new Date().toISOString()
  };

  await env.NFC_REGISTRY.put(`${STORAGE_PREFIX}${key}`, JSON.stringify(card));
  await env.NFC_REGISTRY.put(`${TAG_PREFIX}${tag}`, key);

  return json({
    ok: true,
    card: withWriteUrl(card, new URL(request.url).origin)
  }, { status: 201 });
}

async function handleRomsRequest(request, env) {
  const unauthorized = await requireAdmin(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  return json({
    roms: await listRepoRoms(request, env)
  });
}

async function handleProtectedEntryRequest(request, env) {
  const url = new URL(request.url);
  const { key, tag } = getCredentialPair(url);

  if (!key && !tag) {
    return new Response("Not found.", {
      status: 404,
      headers: PRIVATE_RESPONSE_HEADERS
    });
  }

  const card = await resolveAnyCard(env, { key, tag });

  if (!card) {
    return new Response("Not found.", {
      status: 404,
      headers: PRIVATE_RESPONSE_HEADERS
    });
  }

  const rootAssetResponse = await env.ASSETS.fetch(request);

  if (rootAssetResponse.ok) {
    return rootAssetResponse;
  }

  const entryRequest = new Request(new URL("/index.html", request.url), request);
  const entryResponse = await env.ASSETS.fetch(entryRequest);

  if (entryResponse.ok) {
    return entryResponse;
  }

  return new Response("Entry asset not found.", {
    status: 404,
    headers: PRIVATE_RESPONSE_HEADERS
  });
}

async function serveAdminPage(request, env) {
  const adminRequest = new Request(new URL("/admin.html", request.url), request);
  const response = await env.ASSETS.fetch(adminRequest);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return handleProtectedEntryRequest(request, env);
    }

    if (url.pathname === "/api/game") {
      return handleGameRequest(request, env);
    }

    if (url.pathname === "/api/asset") {
      return handleProtectedAssetRequest(request, env);
    }

    if (url.pathname === "/api/admin/session") {
      return handleSessionRequest(request, env);
    }

    if (url.pathname === "/api/admin/login") {
      return handleLoginRequest(request, env);
    }

    if (url.pathname === "/api/admin/logout") {
      return handleLogoutRequest(request);
    }

    if (url.pathname === "/api/admin/cards") {
      return handleCardsRequest(request, env);
    }

    if (url.pathname === "/api/admin/roms") {
      return handleRomsRequest(request, env);
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/admin.html") {
      return serveAdminPage(request, env);
    }

    if (url.pathname.startsWith("/roms/") || url.pathname.startsWith("/data/bios/")) {
      return new Response("Not found.", {
        status: 404,
        headers: PRIVATE_RESPONSE_HEADERS
      });
    }

    return env.ASSETS.fetch(request);
  }
};
