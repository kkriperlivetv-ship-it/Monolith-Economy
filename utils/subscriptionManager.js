const { getDb } = require('../database');

async function checkExpiredSubscriptions(client) {
    const db = getDb();
    // Используем UNIX timestamp в секундах
    const now = Math.floor(Date.now() / 1000);

    // Находим просроченные подписки
    const expired = await db.all('SELECT * FROM subscriptions WHERE expires_at <= ?', now);
    
    for (const sub of expired) {
        if (sub.type === 'private_room' && sub.channel_id) {
            const channel = client.channels.cache.get(sub.channel_id);
            if (channel) {
                await channel.delete('Подписка истекла');
                console.log(`Удалён канал ${channel.name} (подписка истекла)`);
            }
        }
        
        // Удаляем запись о подписке
        await db.run('DELETE FROM subscriptions WHERE id = ?', sub.id);
        
        // Отправляем уведомление пользователю
        const user = await client.users.fetch(sub.user_id);
        if (user) {
            await user.send({
                content: `⚠️ Ваша подписка на **личную комнату** истекла. Комната была удалена.\n💰 Вы можете продлить подписку через магазин /shop`
            }).catch(() => {});
        }
    }
}

// Запускаем проверку каждый час
function startSubscriptionChecker(client) {
    setInterval(async () => {
        await checkExpiredSubscriptions(client);
    }, 60 * 60 * 1000); // Каждый час
}

module.exports = { checkExpiredSubscriptions, startSubscriptionChecker };