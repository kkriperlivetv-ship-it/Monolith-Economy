const { getDb } = require('../database');
const config = require('../config');
const { awardXp } = require('../utils/levelSystem');

module.exports = async (client, message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const now = Date.now();
    const db = getDb();

    let user = await db.get('SELECT messages_today, last_message_reset, total_messages FROM users WHERE user_id = ?', userId);

    if (!user) {
        await db.run('INSERT INTO users (user_id) VALUES (?)', userId);
        user = await db.get('SELECT messages_today, last_message_reset, total_messages FROM users WHERE user_id = ?', userId);
    }

    if (!user.last_message_reset || now - user.last_message_reset > 24 * 60 * 60 * 1000) {
        await db.run('UPDATE users SET messages_today = 0, last_message_reset = ? WHERE user_id = ?', now, userId);
        user.messages_today = 0;
    }

    // ====== ОПЫТ ЗА СООБЩЕНИЯ: каждые 50 сообщений → +10 опыта ======
    const oldTotalMessages = user.total_messages || 0;
    const newTotalMessages = oldTotalMessages + 1;
    const oldMessageBlocks = Math.floor(oldTotalMessages / config.LEVELS.MESSAGE_XP_EVERY);
    const newMessageBlocks = Math.floor(newTotalMessages / config.LEVELS.MESSAGE_XP_EVERY);
    const xpGain = (newMessageBlocks - oldMessageBlocks) * config.LEVELS.MESSAGE_XP_AMOUNT;

    let messagesToday = (user.messages_today || 0) + 1;
    await db.run('UPDATE users SET messages_today = ?, total_messages = total_messages + 1 WHERE user_id = ?', messagesToday, userId);

    if (xpGain > 0) {
        await awardXp(client, userId, xpGain);
    }

    // ====== Награда за активность (только если включена в конфиге) ======
    if (!config.ACTIVITY.MESSAGE_REWARD) return;

    const rewardCount = Math.floor(messagesToday / config.ACTIVITY.MESSAGE_THRESHOLD);
    const totalReward = rewardCount * config.ACTIVITY.MESSAGE_REWARD;

    if (rewardCount > 0 && totalReward <= config.ACTIVITY.MESSAGE_LIMIT) {
        const currentRewards = Math.floor((messagesToday - 1) / config.ACTIVITY.MESSAGE_THRESHOLD) * config.ACTIVITY.MESSAGE_REWARD;
        if (totalReward > currentRewards) {
            await db.run('UPDATE users SET balance = balance + ? WHERE user_id = ?', config.ACTIVITY.MESSAGE_REWARD, userId);
        }
    }
};