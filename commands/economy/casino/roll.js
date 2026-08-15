const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { createCasinoEmbed } = require('../../../utils/embedBuilder');
const { logEconomy } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Угадай число от 1 до 100')
        .addIntegerOption(option => option.setName('amount').setDescription('Ставка').setRequired(true).setMinValue(1))
        .addIntegerOption(option => option.setName('number').setDescription('Число от 1 до 100').setRequired(true).setMinValue(1).setMaxValue(100)),
    
    async execute(client, interaction) {
        await interaction.deferReply();
        
        try {
            const userId = interaction.user.id;
            const amount = interaction.options.getInteger('amount');
            const userNumber = interaction.options.getInteger('number');
            
            const db = getDb();
            const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
            
            if (!user || user.balance < amount) {
                return interaction.editReply({ 
                    content: '❌ Недостаточно средств',
                    embeds: [], 
                    files: [] 
                });
            }
            
            const botNumber = Math.floor(Math.random() * 100) + 1;
            const diff = Math.abs(userNumber - botNumber);
            
            let winAmount = 0;
            let isWin = false;
            
            if (userNumber === botNumber) {
                winAmount = amount * 10;
                isWin = true;
            } else if (diff <= 5) {
                winAmount = amount;
                isWin = true;
            }
            
            await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', amount, userId);
            
            if (winAmount > 0) {
                await db.run('UPDATE users SET balance = balance + ? WHERE user_id = ?', winAmount, userId);
                
                if (winAmount >= 10000) {
                    await logEconomy(client, 'Выигрыш в казино', [
                        { name: 'Игрок', value: `<@${userId}>`, inline: true },
                        { name: 'Игра', value: 'Рандом', inline: true },
                        { name: 'Выигрыш', value: `${winAmount} экзпоинтов`, inline: true }
                    ]);
                }
            }
            
            const details = { userNumber, botNumber, diff };
            const embed = createCasinoEmbed('Рандом', amount, isWin, winAmount, details);
            
            await interaction.editReply({ embeds: [embed], files: [] });
            
        } catch (error) {
            console.error('Ошибка в roll:', error);
            await interaction.editReply({ 
                content: '❌ Ошибка при игре в рандом', 
                embeds: [], 
                files: [] 
            });
        }
    }
};