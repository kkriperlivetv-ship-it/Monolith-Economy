const { createCanvas, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

const ppDir = './assets/fonts/PP Neue Montreal Mono - Free for Personal Use v1.0/otf';
registerFont(path.join(ppDir, 'PPNeueMontrealMono-Book.otf'), { family: 'PP Neue Montreal' });

const canvas = createCanvas(1000, 400);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#111';
ctx.fillRect(0, 0, 1000, 400);

ctx.fillStyle = '#fff';
ctx.font = '30px "PP Neue Montreal"';
ctx.fillText('PP Neue: 🏠 👑 💍 💰 🔥 👤 🎁 🎯 🎲 📈 📉 🤖 📏 🎰 🦅 🪙', 20, 50);

ctx.font = '30px "Arial"';
ctx.fillText('Arial: 🏠 👑 💍 💰 🔥 👤 🎁 🎯 🎲 📈 📉 🤖 📏 🎰 🦅 🪙', 20, 150);

fs.writeFileSync('test_emoji_font.png', canvas.toBuffer());
console.log('Saved test_emoji_font.png');
