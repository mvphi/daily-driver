import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, "public");

const COLOR = "#B9BA9B";
const SIZE = 512;
const RADIUS = 96; // visually rounded at small sizes too

const svg = Buffer.from(
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="${COLOR}"/>
</svg>`
);

async function writePng(filename, px) {
  const outPath = path.join(PUBLIC_DIR, filename);
  const buf = await sharp(svg).resize(px, px).png().toBuffer();
  await fs.writeFile(outPath, buf);
  return buf;
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const png16 = await writePng("favicon-16x16.png", 16);
  const png32 = await writePng("favicon-32x32.png", 32);
  await writePng("apple-touch-icon.png", 180);
  await writePng("android-chrome-192x192.png", 192);
  await writePng("android-chrome-512x512.png", 512);

  const ico = await toIco([png16, png32]);
  await fs.writeFile(path.join(PUBLIC_DIR, "favicon.ico"), ico);

  const manifest = {
    name: "megan's daily driver",
    short_name: "daily driver",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: COLOR,
    background_color: COLOR,
    display: "standalone",
  };
  await fs.writeFile(path.join(PUBLIC_DIR, "site.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");

  // Optional: keep an SVG source artifact
  await fs.writeFile(path.join(PUBLIC_DIR, "favicon.svg"), svg);

  console.log("Favicons generated in public/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

