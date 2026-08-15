const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { createEmbed } = require('../../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('Купить билет лотереи')
        .addIntegerOption(option => option.setName('quantity').setDescription('Количество билетов').setRequired(false).setMinValue(1).setMaxValue(10)),
    
    async execute(client, interaction) {
        const userId = interaction.user.id;
        const quantity = interaction.options.getInteger('quantity') || 1;
        const totalCost = config.ECONOMY.LOTTERY_TICKET_PRICE * quantity;
        
        const db = getDb();
        const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
        
        if (!user || user.balance < totalCost) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: `Недостаточно средств. Нужно ${totalCost} экзпоинтов`, inline: false }], 0xff0000)],
                ephemeral: true
            });
        }
        
        const drawTime = Date.now() + config.ECONOMY.LOTTERY_INTERVAL;
        
        for (let i = 0; i < quantity; i++) {
            await db.run('INSERT INTO lottery_tickets (user_id, draw_time) VALUES (?, ?)', userId, drawTime);
        }
        
        await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', totalCost, userId);
        
        await interaction.reply({
            embeds: [createEmbed('🎫 Билеты куплены', [
                { name: 'Количество', value: `${quantity} шт.`, inline: true },
                { name: 'Цена за билет', value: `${config.ECONOMY.LOTTERY_TICKET_PRICE} экзпоинтов`, inline: true },
                { name: 'Общая стоимость', value: `${totalCost} экзпоинтов`, inline: true },
                { name: 'Розыгрыш', value: 'Через 6 часов', inline: true }
            ], 0x00ff00)]
        });
    }
};