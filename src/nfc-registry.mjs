const cards = [
  {
    name: "Super Mario Bros.",
    accessMode: "legacy",
    tag: "NES_MARIO_001",
    key: "JFgD96CXZOQtebuP35-j6Yqv",
    core: "nes",
    gameUrl: "roms/NES/mario.nes"
  },
  {
    name: "Super Mario World",
    accessMode: "legacy",
    tag: "NES_MARIOWORLD_002",
    key: "t-1WDUOCEOA9tSrdpfZ9LKxU",
    core: "nes",
    gameUrl: "roms/NES/SuperMarioWorld.nes"
  },
  {
    name: "Kirby Adventure",
    accessMode: "legacy",
    tag: "NES_KIRBYADV_003",
    key: "0VSjDgMxksCZoj1Eb5KP6jPS",
    core: "nes",
    gameUrl: "roms/NES/KirbyAdventure.nes"
  },
  {
    name: "Metroid",
    accessMode: "legacy",
    tag: "NES_METROID_004",
    key: "o7iKZqbKD7MRCe7FeUU7sLx7",
    core: "nes",
    gameUrl: "roms/NES/Metroid.nes"
  },
  {
    name: "Super Mario Bros. 3",
    accessMode: "legacy",
    tag: "NES_SPMARIO3_005",
    key: "hPE6hfqq4Q0cl_sgrFBWKk9G",
    core: "nes",
    gameUrl: "roms/NES/SuperMarioBros3.nes"
  },
  {
    name: "Super Mario Bros. 2",
    accessMode: "legacy",
    tag: "NES_SPMARIO2_006",
    key: "hcDnW0HmqTcaRneDf_kMdQhR",
    core: "nes",
    gameUrl: "roms/NES/SuperMarioBros2.nes"
  },
  {
    name: "Donkey Kong Country",
    accessMode: "legacy",
    tag: "SNES_DKC_001",
    key: "_Hr1SDbnoNQ2fTM6hLWcK-Fr",
    core: "snes",
    gameUrl: "roms/SNES/DKCountry.smc"
  },
  {
    name: "Super Mario World GBA",
    accessMode: "legacy",
    tag: "GBA_MARIOWORLD1_001",
    key: "xH4ALfRhOCgu3kE5g4im3nxU",
    core: "gba",
    gameUrl: "roms/GBA/spmarioworld1.gba"
  },
  {
    name: "Pokemon Rojo Fuego",
    accessMode: "legacy",
    tag: "GBA_PKMN_RF_002",
    key: "HfqVrxZ5DmeB_anMSvCDXzoX",
    core: "gba",
    gameUrl: "roms/GBA/pkmnRF.gba"
  },
  {
    name: "Pokemon Verde Hoja",
    accessMode: "legacy",
    tag: "GBA_PKMN_VH_003",
    key: "HXqD2ujDDLm9zL80ymU7Njzh",
    core: "gba",
    gameUrl: "roms/GBA/pkmnVH.gba"
  },
  {
    name: "Pokemon Esmeralda",
    accessMode: "legacy",
    tag: "GBA_PKMN_ESM_004",
    key: "nTxVNOUgO-3WPJHjH7Nd8NJs",
    core: "gba",
    gameUrl: "roms/GBA/pkmnESM.gba"
  },
  {
    name: "Star Fox 64",
    accessMode: "legacy",
    tag: "N64_SF_001",
    key: "hwVZbz7B4mRfw1QwP04rAwK4",
    core: "n64",
    gameUrl: "roms/N64/StarFox.z64"
  },
  {
    name: "Crash Bandicoot",
    accessMode: "legacy",
    tag: "PSX_CRASH1_001",
    key: "wkNSwl6YQg54ECzBRwpQGCej",
    core: "psx",
    gameUrl: "https://pub-dfad97359ea943fa86c939804cd37680.r2.dev/Crash1.chd",
    biosUrl: "data/bios/scph1001.BIN"
  }
];

const cardsByTag = new Map();
const cardsByKey = new Map();

for (const card of cards) {
  if (!card.tag || !card.key || !card.core || !card.gameUrl) {
    throw new Error("Each NFC card must include tag, key, core and gameUrl.");
  }

  if (cardsByTag.has(card.tag)) {
    throw new Error(`Duplicate NFC tag detected: ${card.tag}`);
  }

  if (cardsByKey.has(card.key)) {
    throw new Error(`Duplicate NFC key detected: ${card.key}`);
  }

  cardsByTag.set(card.tag, card);
  cardsByKey.set(card.key, card);
}

function resolveCard({ key, tag }) {
  if (key) {
    return cardsByKey.get(key) || null;
  }

  if (tag) {
    return cardsByTag.get(tag) || null;
  }

  return null;
}

function toPublicGameConfig(card) {
  if (!card) {
    return null;
  }

  return {
    ...(card.name ? { name: card.name } : {}),
    accessMode: card.accessMode || "secure",
    core: card.core,
    hasBios: Boolean(card.biosUrl)
  };
}

export { cards, resolveCard, toPublicGameConfig };
