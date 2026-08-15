const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// node-canvas открывает файлы через нативный fopen, который на Windows
// не работает с не-ASCII путями (например, «Проекты»). Читаем файл в Buffer
// через fs и передаём Buffer — это обходит fopen (loadImage по Buffer).
async function loadImageFromFile(filePath) {
    try {
        const buf = fs.readFileSync(filePath);
        console.log(`📁 Файл прочитан: ${filePath} (${buf.length} байт)`);
        const image = await loadImage(buf);
        return image;
    } catch (e) {
        console.error(`❌ Ошибка чтения файла ${filePath}:`, e.message);
        throw e;
    }
}

try {
    const ppDir = '../assets/fonts/PP Neue Montreal Mono - Free for Personal Use v1.0/otf';
    registerFont(path.join(__dirname, ppDir, 'PPNeueMontrealMono-Book.otf'), { family: 'PP Neue Montreal' });
    registerFont(path.join(__dirname, ppDir, 'PPNeueMontrealMono-Bold.otf'), { family: 'PP Neue Montreal Bold' });
} catch (e) {
    console.log('Шрифт PP Neue Montreal не загружен, используем стандартный');
}

// Оставляем для обратной совместимости с другими файлами
const COLORS = {
    BACKGROUND: '#0A0A0B',
    CARD_BG: '#141416',
    TEXT: '#FFFFFF',
    TEXT_DARK: '#6A6A70',
    ACCENT: '#4A9EFF',
    SUCCESS: '#00FF88',
    DANGER: '#FF4444',
    GOLD: '#FFD700'
};

// Числа с точкой как разделитель тысяч (для профиля)
function fmtDot(n) {
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Пути к SVG-иконкам и кеш загруженных изображений
const ICON_PATHS = {
    balance:    path.join(__dirname, '../assets/icons/balance.svg'),
    heart:      path.join(__dirname, '../assets/icons/heart.svg'),
    level:      path.join(__dirname, '../assets/icons/level.svg'),
    message:    path.join(__dirname, '../assets/icons/message.svg'),
    microphone: path.join(__dirname, '../assets/icons/microphone.svg'),
    fire:       path.join(__dirname, '../assets/icons/fire.svg'),
    coins:      path.join(__dirname, '../assets/icons/coins.svg'),
    gift:       path.join(__dirname, '../assets/icons/gift.svg'),
    user:       path.join(__dirname, '../assets/icons/user.svg'),
    house:      path.join(__dirname, '../assets/icons/house.svg'),
    role:       path.join(__dirname, '../assets/icons/role.svg'),
    ring:       path.join(__dirname, '../assets/icons/ring.svg'),
    slots:      path.join(__dirname, '../assets/icons/slots.svg'),
    diamond:    path.join(__dirname, '../assets/icons/diamond.svg'),
    seven:      path.join(__dirname, '../assets/icons/seven.svg'),
    cherry:     path.join(__dirname, '../assets/icons/cherry.svg'),
    lemon:      path.join(__dirname, '../assets/icons/lemon.svg'),
    star:       path.join(__dirname, '../assets/icons/star.svg'),
    bell:       path.join(__dirname, '../assets/icons/bell.svg'),
    eagle:      path.join(__dirname, '../assets/icons/eagle.svg'),
    coin:       path.join(__dirname, '../assets/icons/coin.svg'),
    target:     path.join(__dirname, '../assets/icons/target.svg'),
    dice:       path.join(__dirname, '../assets/icons/dice.svg'),
    bot:        path.join(__dirname, '../assets/icons/bot.svg'),
    ruler:      path.join(__dirname, '../assets/icons/ruler.svg'),
    trend_up:   path.join(__dirname, '../assets/icons/trend_up.svg'),
    trend_down: path.join(__dirname, '../assets/icons/trend_down.svg'),
    bet:        path.join(__dirname, '../assets/icons/bet.svg'),
};

const EMOJI_TO_ICON = {
    '🔥': 'fire',
    '💰': 'coins',
    '💸': 'bet',
    '🎁': 'gift',
    '👤': 'user',
    '🏠': 'house',
    '🎭': 'role',
    '💍': 'ring',
    '🎰': 'slots',
    '💎': 'diamond',
    '7️⃣': 'seven',
    '🍒': 'cherry',
    '🍋': 'lemon',
    '⭐': 'star',
    '🔔': 'bell',
    '🦅': 'eagle',
    '🪙': 'coin',
    '🎯': 'target',
    '🎲': 'dice',
    '🤖': 'bot',
    '📏': 'ruler',
    '📈': 'trend_up',
    '📉': 'trend_down',
    'role_custom': 'role',
    'private_room': 'house'
};

const _iconCache = {};

// ================================================================
// БАЗОВЫЕ УТИЛИТЫ
// ================================================================

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function formatNum(n) {
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function truncate(str, max) {
    return str && str.length > max ? str.substring(0, max - 1) + '…' : (str || '');
}

// Декоративные точки
function drawDots(ctx, fromX, toX, fromY, toY) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let px = fromX; px < toX; px += 27) {
        for (let py = fromY; py < toY; py += 27) {
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Стандартный футер (линия + подпись)
function drawFooter(ctx, x, y, label) {
    ctx.strokeStyle = '#2C2C2E';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 160, y);
    ctx.stroke();
    ctx.fillStyle = '#444446';
    ctx.font = '12px "PP Neue Montreal", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 20);
}

// Волновые бары (для карточки голоса)
function drawWaveformBars(ctx, x, y, w, h, seed) {
    const bars = 38;
    const sp = w / bars;
    const bw = sp * 0.52;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < bars; i++) {
        const t = Math.abs(Math.sin(i * 0.72 + (seed % 97) * 0.063)) * 0.55
                + Math.abs(Math.cos(i * 1.35)) * 0.3 + 0.12;
        const bh = h * Math.min(0.95, t);
        const bx = x + i * sp;
        const by = y + (h - bh) / 2;
        roundRect(ctx, bx, by, bw, bh, 2);
        ctx.fill();
    }
}

// Загружает SVG-иконку через loadImage с кешем
async function drawSvgIcon(ctx, iconName, x, y, size) {
    if (!ICON_PATHS[iconName]) return;
    try {
        if (!_iconCache[iconName]) {
            _iconCache[iconName] = await loadImageFromFile(ICON_PATHS[iconName]);
        }
        ctx.drawImage(_iconCache[iconName], x, y, size, size);
    } catch (e) {
        console.error(`❌ Ошибка загрузки иконки "${iconName}" (${ICON_PATHS[iconName]}):`, e.message);
    }
}

// Универсальная отрисовка иконки (по имени или эмодзи)
async function drawIcon(ctx, iconNameOrEmoji, x, y, size) {
    const iconName = EMOJI_TO_ICON[iconNameOrEmoji] || iconNameOrEmoji;
    if (ICON_PATHS[iconName]) {
        await drawSvgIcon(ctx, iconName, x, y, size);
    }
}

// Карточка правой колонки (иконка + метка сверху, значение крупно снизу)
async function drawRightCard(ctx, x, y, w, h, iconName, label, value) {
    roundRect(ctx, x, y, w, h, 20);
    ctx.fillStyle = '#141416';
    ctx.fill();
    const ICO = 32, IX = x + 28, IY = y + 28;
    await drawSvgIcon(ctx, iconName, IX, IY, ICO);
    ctx.fillStyle = '#6A6A70';
    ctx.font = '14px "PP Neue Montreal", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText(label, IX + ICO + 12, IY + ICO * 0.72);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px "PP Neue Montreal Bold", "Arial"';
    ctx.fillText(value, x + 28, y + h - 30);
}

// Карточка уровня — значение очень крупное
async function drawRightCardBig(ctx, x, y, w, h, iconName, label, value) {
    roundRect(ctx, x, y, w, h, 20);
    ctx.fillStyle = '#141416';
    ctx.fill();
    const ICO = 32, IX = x + 28, IY = y + 28;
    await drawSvgIcon(ctx, iconName, IX, IY, ICO);
    ctx.fillStyle = '#6A6A70';
    ctx.font = '14px "PP Neue Montreal", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText(label, IX + ICO + 12, IY + ICO * 0.72);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 86px "PP Neue Montreal Bold", "Arial"';
    ctx.fillText(value, x + 28, y + h - 22);
}

// ================================================================
// УНИВЕРСАЛЬНАЯ КАРТОЧКА (масштабируется по высоте h)
// ================================================================
async function drawCard(ctx, x, y, w, h, card) {
    roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = '#141416';
    ctx.fill();

    const p = h / 155;
    const iconY = y + Math.round(22 * p);
    const valY  = y + Math.round(88 * p);
    const subY  = y + Math.round(132 * p);
    const icoSz = Math.max(16, Math.round(20 * p));
    const lblSz = Math.max(9,  Math.round(11 * p));
    const valSz = Math.max(16, Math.round(28 * p));
    const subSz = Math.max(10, Math.round(12 * p));

    if (card.icon) {
        await drawIcon(ctx, card.icon, x + 20, iconY, icoSz);
    }

    ctx.fillStyle = '#6A6A70';
    ctx.font = `${lblSz}px "PP Neue Montreal", "Arial"`;
    ctx.textAlign = 'left';
    const labelX = card.icon ? x + 20 + icoSz + 8 : x + 20;
    ctx.fillText(card.label, labelX, iconY + icoSz * 0.78);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${valSz}px "PP Neue Montreal Bold", "Arial"`;
    ctx.fillText(card.unit ? `${card.value} ${card.unit}` : card.value, x + 20, valY);

    ctx.fillStyle = '#50505A';
    ctx.font = `${subSz}px "PP Neue Montreal", "Arial"`;
    ctx.textAlign = 'left';
    ctx.fillText(card.sub, x + 20, subY);
    ctx.textAlign = 'right';
    ctx.fillText('→', x + w - 20, subY);
    ctx.textAlign = 'left';
}

// ================================================================
// КАРТОЧКА МАГАЗИНА (с центрированием контента)
// ================================================================
async function drawShopCard(ctx, x, y, w, h, item, isActive) {
    roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = '#141416';
    ctx.fill();

    // Иконка
    const iconName = EMOJI_TO_ICON[item.id] || EMOJI_TO_ICON[item.emoji] || 'gift';
    const icoSz = 44;
    await drawIcon(ctx, iconName, x + Math.round((w - icoSz) / 2), y + 24, icoSz);

    const cleanName = truncate(item.name.replace(/^[^\w\sа-яА-ЯёЁ]+/, '').trim(), 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 17px "PP Neue Montreal Bold", "Arial"';
    ctx.textAlign = 'center';
    ctx.fillText(cleanName, x + w / 2, y + 100);

    // Описание
    ctx.fillStyle = '#6A6A70';
    ctx.font = '12px "PP Neue Montreal", "Arial"';
    ctx.fillText(truncate(item.description, 40), x + w / 2, y + 126);

    // Цена
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "PP Neue Montreal Bold", "Arial"';
    ctx.fillText(`${formatNum(item.price)} ЭП`, x + w / 2, y + 168);

    // Статус / подсказка
    ctx.fillStyle = isActive ? '#555558' : '#3A3A3E';
    ctx.font = '11px "PP Neue Montreal", "Arial"';
    ctx.fillText(isActive ? '● АКТИВНО' : '↓ кнопка ниже', x + w / 2, y + 196);

    ctx.textAlign = 'left';
}

// ================================================================
// ПРОФИЛЬ
// ================================================================
const _blockSvgCache = {};

async function renderProfile(userData) {
    const W = 1500, H = 750;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── BACKGROUND ────────────────────────────────────────────────
    try {
        if (!_blockSvgCache.bg)
            _blockSvgCache.bg = await loadImageFromFile(path.join(__dirname, '../assets/background.svg'));
        ctx.drawImage(_blockSvgCache.bg, 0, 0, W, H);
    } catch (e) {
        ctx.fillStyle = '#0B0B0C';
        ctx.fillRect(0, 0, W, H);
    }

    // ── BLOCK SVG ASSETS (cached) ─────────────────────────────────
    if (!_blockSvgCache.block)     _blockSvgCache.block     = await loadImageFromFile(path.join(__dirname, '../assets/block.svg'));
    if (!_blockSvgCache.block2)    _blockSvgCache.block2    = await loadImageFromFile(path.join(__dirname, '../assets/block2.svg'));
    if (!_blockSvgCache.backblock) _blockSvgCache.backblock = await loadImageFromFile(path.join(__dirname, '../assets/backblock.svg'));
    const blockImg  = _blockSvgCache.block;
    const block2Img = _blockSvgCache.block2;
    const backImg   = _blockSvgCache.backblock;

    // Унифицированная строка статистики: фон + квадрат-иконка + label/value
    async function drawStatRow(bg, x, y, w, h, iconName, label, value) {
        ctx.drawImage(bg, x, y, w, h);
        const blkY = y + Math.round((h - 80) / 2);
        ctx.drawImage(blockImg, x + 24, blkY, 80, 80);
        await drawSvgIcon(ctx, iconName, x + 44, blkY + 20, 40);
        const tx = x + 128;
        ctx.fillStyle = '#6A6A70';
        ctx.font = '15px "PP Neue Montreal", "Arial"';
        ctx.textAlign = 'left';
        ctx.fillText(label, tx, y + Math.round(h / 2) - 13);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px "PP Neue Montreal Bold", "Arial"';
        ctx.fillText(value, tx, y + Math.round(h / 2) + 24);
    }

    // ── LAYOUT CONSTANTS ──────────────────────────────────────────
    const PAD  = 50;
    const LX   = PAD,  LY = PAD, LW = 820, LH = 650;  // left big card
    const RX   = LX + LW + 40;                         // 910 — right column x
    const RW   = W - RX - PAD;                         // 540 — right column width
    const RSM  = 148;                                   // small right card height
    const RG   = 20;                                    // right card gap
    const RLH  = LH - RSM * 2 - RG * 2;               // level card height (314)

    // ── LEFT BIG CARD ─────────────────────────────────────────────
    ctx.drawImage(backImg, LX, LY, LW, LH);

    // Avatar
    const AVT_R  = 90;
    const AVT_CX = LX + 120;
    const AVT_CY = LY + 178;
    try {
        const avatar = await loadImage(userData.avatarURL || userData.defaultAvatarURL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(AVT_CX, AVT_CY, AVT_R, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, AVT_CX - AVT_R, AVT_CY - AVT_R, AVT_R * 2, AVT_R * 2);
        ctx.restore();
    } catch (e) {
        ctx.fillStyle = '#2A2A2E';
        ctx.beginPath();
        ctx.arc(AVT_CX, AVT_CY, AVT_R, 0, Math.PI * 2);
        ctx.fill();
    }

    // Username + marriage status + join date
    const NX = AVT_CX + AVT_R + 32;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px "PP Neue Montreal Bold", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText(truncate(userData.username, 16), NX, LY + 158);

    // Статус брака рядом с никнеймом
    if (userData.marriagePartner) {
        await drawIcon(ctx, 'ring', NX, LY + 178, 20);
        ctx.fillStyle = '#FF69B4';
        ctx.font = '18px "PP Neue Montreal", "Arial"';
        ctx.fillText(`В браке с ${truncate(userData.marriagePartner, 22)}`, NX + 26, LY + 194);
    } else {
        ctx.fillStyle = '#6A6A70';
        ctx.font = '18px "PP Neue Montreal", "Arial"';
        ctx.fillText('Свободен', NX, LY + 194);
    }

    ctx.fillStyle = '#6A6A70';
    ctx.font = '16px "PP Neue Montreal", "Arial"';
    ctx.fillText(`с ${userData.joinDate || '—'}`, NX, LY + 224);

    // Two info rows (Репутация, Баланс) — block2 bg + icon container
    const LROW_X = LX + 30;
    const LROW_W = LW - 60;
    const LROW_H = 148;
    const LROW_G = 18;
    const LROW_Y1 = LY + 310;
    const LROW_Y2 = LROW_Y1 + LROW_H + LROW_G;

    await drawStatRow(block2Img, LROW_X, LROW_Y1, LROW_W, LROW_H, 'heart',   'Репутация', `+${userData.duelsWon || 0}`);
    await drawStatRow(block2Img, LROW_X, LROW_Y2, LROW_W, LROW_H, 'balance', 'Баланс',    fmtDot(userData.balance));

    // ── COMPUTED VALUES ───────────────────────────────────────────
    const level = userData.level || 1;
    const voiceHours = Math.floor((userData.totalVoiceMinutes || 0) / 60);

    // ── RIGHT CARDS: small rows (backblock + block icon) ──────────
    await drawStatRow(backImg, RX, PAD,            RW, RSM, 'microphone', 'Онлайн',    `${fmtDot(voiceHours)} ч`);
    await drawStatRow(backImg, RX, PAD + RSM + RG, RW, RSM, 'message',    'Сообщения', fmtDot(userData.totalMessages || 0));

    // ── RIGHT CARD: Level (backblock) ─────────────────────────────
    const LVL_Y = PAD + (RSM + RG) * 2;  // 386
    ctx.drawImage(backImg, RX, LVL_Y, RW, RLH);
    // Icon block in top-left corner
    ctx.drawImage(blockImg, RX + 24, LVL_Y + 24, 80, 80);
    await drawSvgIcon(ctx, 'level', RX + 44, LVL_Y + 44, 40);
    // Label + number centered in the middle of the block
    const LVL_CX = RX + RW / 2;
    const LVL_MID = LVL_Y + RLH / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6A6A70';
    ctx.font = '24px "PP Neue Montreal", "Arial"';
    ctx.fillText('Уровень', LVL_CX, LVL_MID - 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 110px "PP Neue Montreal Bold", "Arial"';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${level}`, LVL_CX, LVL_MID + 18);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    return canvas;
}

// ================================================================
// ЕЖЕДНЕВНЫЙ БОНУС
// ================================================================
async function renderDailyBonus(streak, bonus, newBalance) {
    const W = 900, H = 430;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, 430, W - 30, 8, 350);

    const M = 60, TW = W - M * 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px "PP Neue Montreal Bold", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText('ЕЖЕДНЕВНЫЙ БОНУС', M, 82);

    const CW = Math.floor((TW - 20) / 2);
    const SY = 108, CH = 155;

    await drawCard(ctx, M, SY, CW, CH, {
        icon: 'fire', label: 'ДЕЙЛИ СТРИК',
        value: `${streak}`,
        unit: 'дней',
        sub: 'Продолжай в том же духе!'
    });
    await drawCard(ctx, M + CW + 20, SY, CW, CH, {
        icon: 'coins', label: 'ПОЛУЧЕНО',
        value: `+${formatNum(bonus)}`,
        unit: 'ЭП',
        sub: `Баланс: ${formatNum(newBalance)} ЭП`
    });

    drawFooter(ctx, M, SY + CH + 36, 'ЕЖЕДНЕВНЫЙ БОНУС');

    return canvas;
}

// ================================================================
// КАЗИНО
// ================================================================
async function renderCasinoResult(gameType, bet, isWin, winAmount, details) {
    const isSlots = gameType === 'Слоты';
    const W = isSlots ? 1000 : 900;
    const H = isSlots ? 580 : 510;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, Math.round(W * 0.52), W - 30, 8, H - 130);

    const M = 60, TW = W - M * 2, GAP = 20;

    // Заголовок страницы
    const titles = { 'Слоты': 'СЛОТЫ', 'Орёл и Решка': 'ОРЁЛ И РЕШКА', 'Рандом': 'РАНДОМ' };
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px "PP Neue Montreal Bold", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText(titles[gameType] || gameType.toUpperCase(), M, 82);

    ctx.fillStyle = '#6A6A70';
    ctx.font = '13px "PP Neue Montreal", "Arial"';
    ctx.fillText(isWin ? 'ПОБЕДА' : 'ПРОИГРЫШ', M, 108);

    // Нижние карточки ставка/результат (общие для всех игр)
    const betCard = {
        icon: 'bet', label: 'СТАВКА',
        value: formatNum(bet), unit: 'ЭП', sub: 'экзпоинтов'
    };
    const resCard = {
        icon: isWin ? 'trend_up' : 'trend_down',
        label: isWin ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ',
        value: isWin ? `+${formatNum(winAmount)}` : `-${formatNum(bet)}`,
        unit: 'ЭП',
        sub: isWin
            ? (details.multiplier ? `множитель ×${details.multiplier}` : 'удача!')
            : 'попробуй снова'
    };

    // ── СЛОТЫ ──────────────────────────────────────────────────
    if (gameType === 'Слоты') {
        const drumCardY = 126, drumCardH = 205;

        roundRect(ctx, M, drumCardY, TW, drumCardH, 16);
        ctx.fillStyle = '#141416';
        ctx.fill();

        // Иконка и подпись внутри карточки
        await drawIcon(ctx, 'slots', M + 20, drumCardY + 16, 22);
        ctx.fillStyle = '#6A6A70';
        ctx.font = '11px "PP Neue Montreal", "Arial"';
        ctx.textAlign = 'left';
        ctx.fillText('БАРАБАНЫ', M + 48, drumCardY + 31);

        if (details.winDescription) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 13px "PP Neue Montreal Bold", "Arial"';
            ctx.textAlign = 'right';
            ctx.fillText(truncate(details.winDescription, 42), M + TW - 20, drumCardY + 31);
        }

        // Три барабана
        const dw = 158, dh = 148;
        const drumsTotalW = 3 * dw + 2 * GAP;
        const drumStartX = M + (TW - drumsTotalW) / 2;
        const drumY = drumCardY + 44;

        for (let i = 0; i < 3; i++) {
            const dx = drumStartX + i * (dw + GAP);
            roundRect(ctx, dx, drumY, dw, dh, 12);
            ctx.fillStyle = '#0D0D0F';
            ctx.fill();
            roundRect(ctx, dx + 4, drumY + 4, dw - 8, dh - 8, 10);
            ctx.fillStyle = '#1A1A1C';
            ctx.fill();
            
            const symIcon = details.results[i];
            const symSz = 64;
            await drawIcon(ctx, symIcon, dx + Math.round((dw - symSz) / 2), drumY + Math.round((dh - symSz) / 2), symSz);
        }

        const bY = drumCardY + drumCardH + GAP;
        const bW = Math.floor((TW - GAP) / 2);
        const bH = 145;
        await drawCard(ctx, M, bY, bW, bH, betCard);
        await drawCard(ctx, M + bW + GAP, bY, bW, bH, resCard);
        drawFooter(ctx, M, bY + bH + 26, 'КАЗИНО');

    // ── ОРЁЛ И РЕШКА ───────────────────────────────────────────
    } else if (gameType === 'Орёл и Решка') {
        const SY = 126, CH = 145, CW = Math.floor((TW - GAP) / 2);

        const choiceText = details.choice === 'орел' ? 'Орёл' : 'Решка';
        const choiceIcon = details.choice === 'орел' ? 'eagle' : 'coin';
        const resultText = details.result === 'орел' ? 'Орёл' : 'Решка';
        const resultIcon = details.result === 'орел' ? 'eagle' : 'coin';

        await drawCard(ctx, M, SY, CW, CH, {
            icon: choiceIcon, label: 'ВАШ ВЫБОР',
            value: choiceText,
            unit: '', sub: 'выбор сделан'
        });
        await drawCard(ctx, M + CW + GAP, SY, CW, CH, {
            icon: resultIcon, label: 'РЕЗУЛЬТАТ',
            value: resultText,
            unit: '', sub: isWin ? '✓ совпало!' : '✗ не совпало'
        });

        const bY = SY + CH + GAP;
        await drawCard(ctx, M, bY, CW, CH, betCard);
        await drawCard(ctx, M + CW + GAP, bY, CW, CH, resCard);
        drawFooter(ctx, M, bY + CH + 26, 'КАЗИНО');

    // ── РАНДОМ ─────────────────────────────────────────────────
    } else if (gameType === 'Рандом') {
        const SY = 126, CH = 145;
        const CW3 = Math.floor((TW - GAP * 2) / 3);
        const CW2 = Math.floor((TW - GAP) / 2);

        await drawCard(ctx, M, SY, CW3, CH, {
            icon: 'target', label: 'ВАШЕ ЧИСЛО',
            value: `${details.userNumber}`, unit: '', sub: 'загадано вами'
        });
        await drawCard(ctx, M + CW3 + GAP, SY, CW3, CH, {
            icon: 'bot', label: 'ЧИСЛО БОТА',
            value: `${details.botNumber}`, unit: '', sub: 'загадано ботом'
        });
        await drawCard(ctx, M + (CW3 + GAP) * 2, SY, CW3, CH, {
            icon: 'ruler', label: 'РАЗНИЦА',
            value: `${details.diff}`, unit: '',
            sub: details.diff === 0 ? 'точное попадание!' : 'отклонение'
        });

        const bY = SY + CH + GAP;
        await drawCard(ctx, M, bY, CW2, CH, betCard);
        await drawCard(ctx, M + CW2 + GAP, bY, CW2, CH, resCard);
        drawFooter(ctx, M, bY + CH + 26, 'КАЗИНО');
    }

    return canvas;
}

// ================================================================
// МАГАЗИН
// ================================================================
async function renderShop(balance, shopItems, hasActiveSubscription) {
    const W = 1400, H = 540;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, 600, W - 50, 8, 450);

    const M = 65, TW = W - M * 2;

    // Заголовок
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 78px "PP Neue Montreal Bold", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText('МАГАЗИН', M, 100);

    // Строка баланса
    const balY = 115, balH = 52;
    roundRect(ctx, M, balY, TW, balH, 12);
    ctx.fillStyle = '#141416';
    ctx.fill();

    await drawIcon(ctx, 'coins', M + 20, balY + 9, 18);
    ctx.fillStyle = '#6A6A70';
    ctx.font = '11px "PP Neue Montreal", "Arial"';
    ctx.fillText('ВАШ БАЛАНС', M + 44, balY + 23);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "PP Neue Montreal Bold", "Arial"';
    ctx.fillText(`${formatNum(balance)} ЭП`, M + 20, balY + 44);

    // Карточки товаров
    const items = Object.values(shopItems);
    const gap = 22;
    const cw = Math.floor((TW - gap * (items.length - 1)) / items.length);
    const cardY = balY + balH + 18;
    const cardH = 228;

    for (let i = 0; i < items.length; i++) {
        const isActive = items[i].id === 'private_room' && hasActiveSubscription;
        await drawShopCard(ctx, M + i * (cw + gap), cardY, cw, cardH, items[i], isActive);
    }

    drawFooter(ctx, M, cardY + cardH + 26, 'МАГАЗИН');

    return canvas;
}

// ================================================================
// ПОДАРОК
// ================================================================
async function renderGift(fromUser, toUser, amount, message) {
    const hasMsg = message && message !== 'Подарок!';
    const W = 900, H = hasMsg ? 460 : 430;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, 430, W - 30, 8, 360);

    const M = 60, TW = W - M * 2, GAP = 20;

    // Заголовок
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px "PP Neue Montreal Bold", "Arial"';
    ctx.textAlign = 'left';
    ctx.fillText('ПОДАРОК', M, 82);

    // Карточки от/кому
    const CW = Math.floor((TW - GAP) / 2);
    const SY = 105, CH = 128;

    await drawCard(ctx, M, SY, CW, CH, {
        icon: 'user', label: 'ОТ',
        value: truncate(fromUser, 14), unit: '', sub: 'отправитель'
    });
    await drawCard(ctx, M + CW + GAP, SY, CW, CH, {
        icon: 'gift', label: 'КОМУ',
        value: truncate(toUser, 14), unit: '', sub: 'получатель'
    });

    // Карточка суммы
    const amtY = SY + CH + GAP;
    const amtH = hasMsg ? 118 : 100;
    roundRect(ctx, M, amtY, TW, amtH, 16);
    ctx.fillStyle = '#141416';
    ctx.fill();

    await drawIcon(ctx, 'coins', M + 20, amtY + 20, 20);
    ctx.fillStyle = '#6A6A70';
    ctx.font = '11px "PP Neue Montreal", "Arial"';
    ctx.fillText('СУММА ПОДАРКА', M + 48, amtY + 32);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "PP Neue Montreal Bold", "Arial"';
    ctx.fillText(`${formatNum(amount)} ЭП`, M + 20, amtY + 72);

    if (hasMsg) {
        ctx.fillStyle = '#50505A';
        ctx.font = '13px "PP Neue Montreal", "Arial"';
        ctx.fillText(`"${truncate(message, 60)}"`, M + 20, amtY + 100);
    }

    drawFooter(ctx, M, amtY + amtH + 26, 'ПОДАРОК');

    return canvas;
}

// ================================================================
// УТИЛИТА ОТПРАВКИ EMBED
// ================================================================
async function sendImageEmbed(interaction, canvas, title, color = '#0A0A0B') {
    const buffer = canvas.toBuffer();
    const attachment = new AttachmentBuilder(buffer, { name: 'image.png' });

    const embed = {
        title,
        color: parseInt(color.replace('#', ''), 16),
        image: { url: 'attachment://image.png' },
        timestamp: new Date(),
        footer: { text: 'Экономическая система' }
    };

    if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    } else if (interaction.replied) {
        await interaction.followUp({ embeds: [embed], files: [attachment] });
    } else {
        await interaction.reply({ embeds: [embed], files: [attachment] });
    }
}

module.exports = {
    renderProfile,
    renderDailyBonus,
    renderCasinoResult,
    renderGift,
    renderShop,
    sendImageEmbed,
    COLORS
};
