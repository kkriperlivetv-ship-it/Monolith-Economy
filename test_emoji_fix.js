const { createCanvas, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

const ppDir = './assets/fonts/PP Neue Montreal Mono - Free for Personal Use v1.0/otf';
registerFont(path.join(ppDir, 'PPNeueMontrealMono-Book.otf'), { family: 'PP Neue Montreal' });

const canvas = createCanvas(800, 300);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#111';
ctx.fillRect(0, 0, 800, 300);

ctx.fillStyle = '#fff';

// With PP Neue Montreal first:
ctx.font = '40px "PP Neue Montreal", "Segoe UI Emoji", "Arial"';
ctx.fillText('PP Neue: 🏠 👑 🛡️ 💍 💰 🔥', 20, 80);

// With Segoe UI Emoji or Arial or sans-serif first:
ctx.font = '40px "Segoe UI Emoji", "Arial", sans-serif';
ctx.fillText('System Emoji: 🏠 👑 🛡️ 💍 💰 🔥', 20, 180);

fs.writeFileSync('test_emoji_fix.png', canvas.toBuffer());
console.log('Saved test_emoji_fix.png');
