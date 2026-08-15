const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { renderDailyBonus, sendImageEmbed } = require('../../../utils/imageGenerator');
const config = require('../../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Получить ежедневный бонус'),
    
    async execute(client, interaction) {
        await interaction.deferReply();
        
        try {
            const userId = interaction.user.id;
            const db = getDb();
            
            const user = await db.get('SELECT balance, daily_streak, last_daily FROM users WHERE user_id = ?', userId);
            const now = Date.now();
            let streak = user?.daily_streak || 0;
            const lastDaily = user?.last_daily || 0;
            
            const daysDiff = Math.floor((now - lastDaily) / (24 * 60 * 60 * 1000));
            
            if (daysDiff >= 1 && daysDiff < 2) {
                streak++;
            } else if (daysDiff >= 2) {
                streak = 1;
            } else if (daysDiff === 0) {
                return interaction.editReply({ 
                    content: '❌ Вы уже получили ежедневный бонус! Подождите 24 часа.',
                    embeds: [], 
                    files: [] 
                });
            }
            
            let bonus = config.ECONOMY.DAILY_BASE;
            if (streak >= 90) bonus = 2000;
            else if (streak >= 30) bonus = 1500;
            else if (streak >= 14) bonus = 1000;
            else if (streak >= 7) bonus = 800;
            else if (streak >= 4) bonus = 600;
            else if (streak >= 3) bonus = 550;
            
            const newBalance = (user?.balance || 500) + bonus;
            if (newBalance > config.ECONOMY.MAX_BALANCE) {
                return interaction.editReply({ 
                    content: `❌ Ваш баланс не может превышать ${config.ECONOMY.MAX_BALANCE}`,
                    embeds: [], 
                    files: [] 
                });
            }
            
            await db.run(`INSERT INTO users (user_id, balance, daily_streak, last_daily) 
                          VALUES (?, ?, ?, ?) 
                          ON CONFLICT(user_id) DO UPDATE SET 
                          balance = excluded.balance,
                          daily_streak = excluded.daily_streak,
                          last_daily = excluded.last_daily`,
                          userId, newBalance, streak, now);
            
            const canvas = await renderDailyBonus(streak, bonus, newBalance);
            await sendImageEmbed(interaction, canvas, '✅ Ежедневный бонус', '#0B0B0C');
        } catch (error) {
            console.error('Ошибка в daily:', error);
            await interaction.editReply({ content: '❌ Ошибка при получении бонуса', embeds: [], files: [] });
        }
    }
};