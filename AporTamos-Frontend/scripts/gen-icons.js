// Generates app icon PNGs from the C-check-acento logo using resvg.
// Run: node scripts/gen-icons.js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT = path.join(__dirname, '..', 'assets', 'images');

const HOUSE = `<path d="M512 300 L724 486 L724 742 L300 742 L300 486 Z" fill="none"
        stroke="#fff" stroke-width="46" stroke-linejoin="round" stroke-linecap="round"/>
  <polyline points="398,602 480,682 650,508" fill="none" stroke="#FBBF24"
            stroke-width="62" stroke-linecap="round" stroke-linejoin="round"/>`;

// Full square icon (no rounded corners → fully opaque; iOS rounds it itself)
const ICON_SVG = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bgC" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366F1"/><stop offset="1" stop-color="#4338CA"/>
  </linearGradient></defs>
  <rect x="0" y="0" width="1024" height="1024" fill="url(#bgC)"/>
  ${HOUSE}
</svg>`;

// Adaptive foreground: transparent, logo scaled to ~0.78 so the circular mask
// doesn't clip it. Background comes from android.adaptiveIcon.backgroundColor.
const FOREGROUND_SVG = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(512 512) scale(0.78) translate(-512 -512)">
    ${HOUSE}
  </g>
</svg>`;

function render(svg, size, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(OUT, file), png);
  console.log('wrote', file, size + 'px', png.length, 'bytes');
}

render(ICON_SVG, 1024, 'icon.png');
render(FOREGROUND_SVG, 1024, 'android-icon-foreground.png');
render(ICON_SVG, 96, 'favicon.png');
console.log('done');
