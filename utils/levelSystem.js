const { getDb } = require('../database');
const { createEmbed } = require('./embedBuilder');
const config = require('../config');

// Настройки уровней (можно менять в config.js → LEVELS)
const XP_PER_LEVEL = config.LEVELS.XP_PER_LEVEL;
const LEVEL_UP_REWARD = config.LEVELS.LEVEL_UP_REWARD;

// Уровень по количеству опыта (каждый уровень = 1000 XP)
function getLevel(xp) {
    return Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
}

// Прогресс до следующего уровня
function getLevelProgress(xp) {
    const level = getLevel(xp);
    const current = (xp || 0) % XP_PER_LEVEL;
    return { level, current, needed: XP_PER_LEVEL };
}

// Текущий опыт пользователя
async function getXp(userId) {
    const db = getDb();
    const user = await db.get('SELECT xp FROM users WHERE user_id = ?', userId);
    return user?.xp || 0;
}

/**
 * Начисляет опыт пользователю.
 * При повышении уровня выдаёт LEVEL_UP_REWARD экзпоинтов за каждый уровень
 * и отправляет пользователю ЛС-уведомление.
 * Возвращает { oldLevel, newLevel, reward } при повышении, иначе null.
 */
async function awardXp(client, userId, amount) {
    if (!amount || amount <= 0) return null;

    const db = getDb();

    let user = await db.get('SELECT xp FROM users WHERE user_id = ?', userId);
    if (!user) {
        await db.run('INSERT INTO users (user_id) VALUES (?)', userId);
        user = { xp: 0 };
    }

    const oldXp = user.xp || 0;
    const oldLevel = getLevel(oldXp);
    const newXp = oldXp + amount;

    await db.run('UPDATE users SET xp = ? WHERE user_id = ?', newXp, userId);

    const newLevel = getLevel(newXp);
    if (newLevel <= oldLevel) return null;

    const levelsGained = newLevel - oldLevel;
    const reward = levelsGained * LEVEL_UP_REWARD;

    // Начисляем награду за повышение уровня
    await db.run('UPDATE users SET balance = balance + ? WHERE user_id = ?', reward, userId);

    // Отправляем уведомление в ЛС
    try {
        const userObj = await client.users.fetch(userId);
        await userObj.send({
            embeds: [createEmbed(`🎉 Новый уровень: ${newLevel}!`, [
                { name: 'Уровень', value: `\`\`\`${oldLevel} → ${newLevel}\`\`\``, inline: true },
                { name: 'Награда', value: `\`\`\`+${reward.toLocaleString()} экзпоинтов\`\`\``, inline: true },
                { name: 'До следующего уровня', value: `\`\`\`${XP_PER_LEVEL} опыта\`\`\``, inline: true }
            ])]
        }).catch(() => {});
    } catch (e) {}

    return { oldLevel, newLevel, reward };
}

module.exports = {
    XP_PER_LEVEL,
    LEVEL_UP_REWARD,
    getLevel,
    getLevelProgress,
    getXp,
    awardXp
};
