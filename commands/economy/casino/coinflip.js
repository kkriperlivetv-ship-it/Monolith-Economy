const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { logEconomy } = require('../../../utils/logger');
const config = require('../../../config');

// Цвет #1A1C1E в десятичном формате
const EMBED_COLOR = 1711134;

// ТВОИ КАСТОМНЫЕ ЭМОДЗИ (замени ID на свои)
const EMOJIS = {
    eagle: '<:Eagle:1508460371252613210>',      // ID твоего эмодзи орла
    tails: '<:Tails:1508460394606235648>',     // ID твоего эмодзи решки
    shard: '<:shard:1503695998005018654>'     // ID твоего эмодзи экзпоинта
};

// Гифка для орла и решки
const COINFLIP_GIF = 'https://static.jojowiki.com/images/1/15/latest/20200801071936/DarbyCoin.gif';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Сыграть в орёл и решку')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Ставка')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option => 
            option.setName('choice')
                .setDescription('Ваш выбор')
                .setRequired(true)
                .addChoices(
                    { name: `Орёл`, value: 'орел' },
                    { name: `Решка`, value: 'решка' }
                )),
    
    async execute(client, interaction) {
        await interaction.deferReply();
        
        try {
            const userId = interaction.user.id;
            const amount = interaction.options.getInteger('amount');
            const choice = interaction.options.getString('choice');
            
            const db = getDb();
            const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
            
            if (!user || user.balance < amount) {
                return interaction.editReply({ 
                    content: '❌ Недостаточно средств для игры!',
                    embeds: [], 
                    files: [] 
                });
            }
            
            // Генерируем результат
            const result = Math.random() < 0.5 ? 'орел' : 'решка';
            const isWin = choice === result;
            
            // Снимаем ставку
            await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', amount, userId);
            
            let winAmount = 0;
            let resultText = '';
            let winText = '';
            
            if (isWin) {
                winAmount = amount * 2;
                await db.run('UPDATE users SET balance = balance + ? WHERE user_id = ?', winAmount, userId);
                resultText = 'ПОБЕДА!';
                winText = `+${winAmount.toLocaleString()} ${EMOJIS.shard}`;
                
                if (winAmount >= 10000) {
                    await logEconomy(client, 'Выигрыш в казино', [
                        { name: 'Игрок', value: `<@${userId}>`, inline: true },
                        { name: 'Игра', value: 'Орёл и Решка', inline: true },
                        { name: 'Выигрыш', value: `${winAmount} экзпоинтов`, inline: true }
                    ]);
                }
            } else {
                resultText = 'ПРОИГРЫШ';
                winText = `-${amount.toLocaleString()} ${EMOJIS.shard}`;
            }
            
            // Выбор и результат с твоими эмодзи
            const choiceEmoji = choice === 'орел' ? EMOJIS.eagle : EMOJIS.tails;
            const resultEmoji = result === 'орел' ? EMOJIS.eagle : EMOJIS.tails;
            
            const embed = {
                title: 'ОРЁЛ И РЕШКА',
                color: EMBED_COLOR,
                fields: [
                    {
                        name: 'ВЫБОР',
                        value: `> ${choiceEmoji} ${choice === 'орел' ? 'Орёл' : 'Решка'}`,
                        inline: true
                    },
                    {
                        name: 'РЕЗУЛЬТАТ',
                        value: `> ${resultEmoji} ${result === 'орел' ? 'Орёл' : 'Решка'}`,
                        inline: true
                    },
                    {
                        name: isWin ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ',
                        value: `> ${winText}`,
                        inline: true
                    }
                ],
                footer: {
                    text: `Экономическая система`
                },
                image: {
                    url: COINFLIP_GIF
                },
                timestamp: new Date()
            };
            
            await interaction.editReply({ embeds: [embed], files: [] });
            
        } catch (error) {
            console.error('Ошибка в coinflip:', error);
            await interaction.editReply({ 
                content: '❌ Ошибка при игре в орёл и решку', 
                embeds: [], 
                files: [] 
            });
        }
    }
};