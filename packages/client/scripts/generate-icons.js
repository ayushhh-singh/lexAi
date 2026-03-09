/**
 * Generate PWA icons from SVG source.
 * Run: node packages/client/scripts/generate-icons.js
 * Requires: sharp (npm i -D sharp)
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../public/icons/icon.svg");
const outDir = resolve(__dirname, "../public/icons");
const svg = readFileSync(svgPath);

const sizes = [192, 512];

async function generate() {
  for (const size of sizes) {
    // Standard icon
    await sharp(svg).resize(size, size).png().toFile(`${outDir}/icon-${size}.png`);
    console.log(`Generated icon-${size}.png`);

    // Maskable icon (add 20% padding for safe zone)
    const padding = Math.round(size * 0.1);
    const innerSize = size - padding * 2;
    const inner = await sharp(svg).resize(innerSize, innerSize).png().toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 26, g: 54, b: 93, alpha: 1 } },
    })
      .composite([{ input: inner, left: padding, top: padding }])
      .png()
      .toFile(`${outDir}/icon-${size}-maskable.png`);
    console.log(`Generated icon-${size}-maskable.png`);
  }

  // Apple touch icon (180x180)
  await sharp(svg).resize(180, 180).png().toFile(`${outDir}/apple-touch-icon.png`);
  console.log("Generated apple-touch-icon.png");

  // Favicon 32x32
  const faviconSvg = readFileSync(resolve(__dirname, "../public/favicon.svg"));
  await sharp(faviconSvg).resize(32, 32).png().toFile(`${outDir}/favicon-32.png`);
  console.log("Generated favicon-32.png");
}

generate().catch(console.error);
