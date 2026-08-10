import Jimp from 'jimp';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\Talha\\.gemini\\antigravity-ide\\brain\\2ed5726b-8fb7-44cb-ab6c-3ef03307ab39';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

async function processAssets() {
  console.log('Processing Master Icon...');
  const iconPath = path.join(ARTIFACT_DIR, 'media__1786343118919.jpg');
  const icon = await Jimp.read(iconPath);
  await icon.clone().resize(192, 192).writeAsync(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  await icon.clone().resize(512, 512).writeAsync(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  await icon.clone().resize(512, 512).writeAsync(path.join(PUBLIC_DIR, 'maskable-icon-512x512.png'));

  console.log('Copying Splash Screen...');
  fs.copyFileSync(
    path.join(ARTIFACT_DIR, 'media__1786343422938.png'),
    path.join(PUBLIC_DIR, 'splash-screen.png')
  );

  console.log('Processing Screenshots...');
  const screen1Path = path.join(ARTIFACT_DIR, 'media__1786343564631.png');
  const screen2Path = path.join(ARTIFACT_DIR, 'media__1786343740191.png');

  const s1 = await Jimp.read(screen1Path);
  const s2 = await Jimp.read(screen2Path);

  if (s1.bitmap.width > s1.bitmap.height) {
    await s1.writeAsync(path.join(PUBLIC_DIR, 'screenshot-desktop.png'));
    await s2.writeAsync(path.join(PUBLIC_DIR, 'screenshot-mobile.png'));
  } else {
    await s2.writeAsync(path.join(PUBLIC_DIR, 'screenshot-desktop.png'));
    await s1.writeAsync(path.join(PUBLIC_DIR, 'screenshot-mobile.png'));
  }

  console.log('Assets processed successfully!');
}

processAssets().catch(console.error);
