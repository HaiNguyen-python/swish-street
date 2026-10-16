// Copies the game into www/, the folder Capacitor packs into the iOS app.
// The game is plain HTML/CSS/JS, so no bundler is needed.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const OUT = 'www';
const FILES = ['index.html', 'style.css', 'src'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of FILES) cpSync(f, `${OUT}/${f}`, { recursive: true });
console.log(`Copied ${FILES.join(', ')} into ${OUT}/`);
