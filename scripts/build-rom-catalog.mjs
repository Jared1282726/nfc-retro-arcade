import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const romsRoot = path.join(repoRoot, "public", "roms");
const outputPath = path.join(romsRoot, "catalog.json");

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath));
      continue;
    }

    if (entry.name === "catalog.json") {
      continue;
    }

    const stats = await fs.stat(absolutePath);
    const relativePath = path.relative(path.join(repoRoot, "public"), absolutePath).replace(/\\/g, "/");
    const segments = relativePath.split("/");

    files.push({
      name: entry.name,
      path: relativePath,
      core: (segments[1] || "").toLowerCase(),
      size: stats.size
    });
  }

  return files;
}

const roms = await walk(romsRoot);
roms.sort((left, right) => left.path.localeCompare(right.path));

await fs.writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), roms }, null, 2));
console.log(`ROM catalog generated with ${roms.length} entries at ${outputPath}`);
