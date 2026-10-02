// Inlines the artifact build into one HTML file for the Artifact publisher,
// which adds its own <!doctype>/<head>/<body> skeleton around it.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = 'dist-artifact/build/assets';
const files = readdirSync(dir);
const read = (ext) => readFileSync(`${dir}/${files.find((f) => f.endsWith(ext))}`, 'utf8');
const css = read('.css').replace(/<\/style/gi, '<\\/style');
const js = read('.js').replace(/<\/script/gi, '<\\/script');

writeFileSync(
  'dist-artifact/zrkk-1m-game.html',
  `<title>ZRKK 1M GAME</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`,
);
