import crypto from "node:crypto";

function getArg(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] || null;
}

const tag = getArg("--tag");
const core = getArg("--core");
const gameUrl = getArg("--game");
const biosUrl = getArg("--bios");
const baseUrl = getArg("--base-url") || "https://your-domain.example";

if (!tag || !core || !gameUrl) {
  console.error("Usage: node scripts/create-nfc-card.mjs --tag TAG_ID --core nes --game roms/NES/mario.nes [--bios data/bios/scph1001.BIN] [--base-url https://your-domain.example]");
  process.exit(1);
}

const key = crypto.randomBytes(18).toString("base64url");
const card = {
  tag,
  key,
  core,
  gameUrl,
  ...(biosUrl ? { biosUrl } : {})
};

console.log("Paste this object into src/nfc-registry.mjs:\n");
console.log(JSON.stringify(card, null, 2));
console.log(`\nURL to write on the NFC:\n${baseUrl}/?key=${key}`);
