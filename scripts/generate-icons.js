const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('C:/Users/baxti/.gemini/antigravity-ide/brain/45c4b929-28de-4ca3-b611-4423767f6c90/snapline_logo_1782024870798.png');
const publicDir = path.resolve(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');

// Create directories if they do not exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy to public/icon.png
try {
  fs.copyFileSync(srcPath, path.join(publicDir, 'icon.png'));
  console.log('Copied base icon to public/icon.png');
} catch (err) {
  console.error('Error copying base icon:', err);
}

async function generate() {
  try {
    // 192x192 icon
    await sharp(srcPath)
      .resize(192, 192)
      .toFile(path.join(iconsDir, 'icon-192x192.png'));
    console.log('Generated icon-192x192.png');

    // 512x512 icon
    await sharp(srcPath)
      .resize(512, 512)
      .toFile(path.join(iconsDir, 'icon-512x512.png'));
    console.log('Generated icon-512x512.png');

    // Apple touch icon (180x180, solid slate-950 background for iOS)
    await sharp(srcPath)
      .resize(180, 180)
      .flatten({ background: { r: 2, g: 6, b: 23 } })
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('Generated apple-touch-icon.png');

    // Maskable icons (with background padding for adaptive Android icons)
    // 192x192 maskable: 130px core + 31px padding each side
    await sharp(srcPath)
      .resize(130, 130)
      .extend({
        top: 31,
        bottom: 31,
        left: 31,
        right: 31,
        background: { r: 2, g: 6, b: 23 }
      })
      .toFile(path.join(iconsDir, 'icon-192x192-maskable.png'));
    console.log('Generated icon-192x192-maskable.png');

    // 512x512 maskable: 358px core + 77px padding each side
    await sharp(srcPath)
      .resize(358, 358)
      .extend({
        top: 77,
        bottom: 77,
        left: 77,
        right: 77,
        background: { r: 2, g: 6, b: 23 }
      })
      .toFile(path.join(iconsDir, 'icon-512x512-maskable.png'));
    console.log('Generated icon-512x512-maskable.png');

    console.log('All icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generate();
