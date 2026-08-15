const { getDb } = require('../database');
const { createEmbed } = require('../utils/embedBuilder');
const { logEconomy } = require('../utils/logger');
const config = require('../config');

let lotteryInterval;

function startLotteryInterval(client) {
    if (lotteryInterval) clearInterval(lotteryInterval);
    
    lotteryInterval = setInterval(async () => {
        await drawLottery(client);
    }, config.ECONOMY.LOTTERY_INTERVAL);
}

async function drawLottery(client) {
    const db = getDb();
    const now = Date.now();
    
    const tickets = await db.all('SELECT * FROM lottery_tickets WHERE draw_time <= ?', now);
    
    if (tickets.length === 0) return;
    
    let prize = 50000;
    if (tickets.length >= 5) {
        prize = Math.floor(tickets.length * config.ECONOMY.LOTTERY_TICKET_PRICE * 0.7);
    }
    
    const winner = tickets[Math.floor(Math.random() * tickets.length)];
    
    await db.run('UPDATE users SET balance = balance + ? WHERE user_id = ?', prize, winner.user_id);
    await db.run('DELETE FROM lottery_tickets WHERE draw_time <= ?', now);
    
    await logEconomy(client, '🎉 Лотерея', [
        { name: 'Победитель', value: `<@${winner.user_id}>`, inline: true },
        { name: 'Сумма', value: `${prize.toLocaleString()} экзпоинтов`, inline: true },
        { name: 'Всего билетов', value: `${tickets.length} шт.`, inline: true }
    ]);
    
    const channel = client.channels.cache.find(c => c.name === config.CHANNELS.ECONOMY_LOGS);
    if (channel) {
        await channel.send({
            content: `<@${winner.user_id}>`,
            embeds: [createEmbed('🎉 ПОБЕДИТЕЛЬ ЛОТЕРЕИ!', [
                { name: 'Выигрыш', value: `${prize.toLocaleString()} экзпоинтов`, inline: true },
                { name: 'Билетов в розыгрыше', value: `${tickets.length} шт.`, inline: true }
            ], 0xffaa00)]
        });
    }
}

module.exports = { startLotteryInterval, drawLottery };