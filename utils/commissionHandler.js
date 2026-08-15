const { getDb } = require('../database');
const config = require('../config');

// ID ролей, которые получают комиссию поровну
const COMMISSION_ROLE_IDS = [
    '1482163875347693669', // Админ-роль 1
    '1497712134874730658', // Админ-роль 2
    '1498735261868101812', // Админ-роль 3
    '1500938977434407003'  // Админ-роль 4
];

async function distributeCommission(client, amount) {
    if (!amount || amount <= 0 || COMMISSION_ROLE_IDS.length === 0) return;

    try {
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;

        // Собираем уникальных участников с нужными ролями
        const recipientSet = new Set();
        for (const roleId of COMMISSION_ROLE_IDS) {
            const role = guild.roles.cache.get(roleId);
            if (!role) continue;
            role.members.forEach(m => recipientSet.add(m.id));
        }

        if (recipientSet.size === 0) return;

        const share = Math.floor(amount / recipientSet.size);
        if (share <= 0) return;

        const db = getDb();
        for (const userId of recipientSet) {
            await db.run('INSERT OR IGNORE INTO users (user_id) VALUES (?)', userId);
            await db.run(
                'UPDATE users SET balance = MIN(balance + ?, ?) WHERE user_id = ?',
                share, config.ECONOMY.MAX_BALANCE, userId
            );
        }
    } catch (err) {
        console.error('[Commission] Ошибка распределения:', err);
    }
}

module.exports = { distributeCommission, COMMISSION_ROLE_IDS };
