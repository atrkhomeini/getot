// Run with: bun run scripts/generate-icons.ts
// Requires: bun add sharp

import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  const publicDir = join(process.cwd(), "public");
  const iconsDir = join(publicDir, "icons");
  
  // Create icons directory
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  const logoPath = join(publicDir, "logo.png");
  
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(logoPath)
      .resize(size, size, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated: icon-${size}x${size}.png`);
  }

  // Generate apple-touch-icon (180x180)
  await sharp(logoPath)
    .resize(180, 180, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(join(iconsDir, "apple-touch-icon.png"));
  
  console.log("✓ Generated: apple-touch-icon.png");
  console.log("\n🎉 All icons generated successfully!");
}

generateIcons().catch(console.error);