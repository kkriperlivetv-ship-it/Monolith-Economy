const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../database');
const { createEmbed } = require('../../utils/embedBuilder');
const { logAdmin } = require('../../utils/logger');
const config = require('../../config');

// ID РОЛЕЙ, КОТОРЫЕ МОГУТ ИСПОЛЬЗОВАТЬ КОМАНДУ (укажи свои)
const ALLOWED_ROLE_IDS = [
    '1482163875347693669', // Админ-роль 1
    '1497712134874730658', // Админ-роль 2
    '1498735261868101812', // Админ-роль 3
    '1500938977434407003'  // Админ-роль 4
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('💰 Выдать экзпоинты пользователю (Только для администрации)')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Сумма для выдачи')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Причина выдачи')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(client, interaction) {
        // Проверка прав по ID роли
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasAllowedRole = memberRoles.some(roleId => ALLOWED_ROLE_IDS.includes(roleId));
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        
        if (!hasAllowedRole && !isOwner) {
            const allowedRoleNames = ALLOWED_ROLE_IDS.map(roleId => {
                const role = interaction.guild.roles.cache.get(roleId);
                return role ? role.name : roleId;
            }).join(', ');
            
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [
                    { name: 'Нет доступа', value: `У вас нет прав на использование этой команды.\nТребуются роли: **${allowedRoleNames}**`, inline: false }
                ], 0xff0000)],
                ephemeral: true
            });
        }
        
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const reason = interaction.options.getString('reason') || 'Не указана';
        
        if (amount > 1000000) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [
                    { name: 'Сумма слишком большая', value: 'Максимальная сумма для выдачи: 1,000,000 экзпоинтов', inline: false }
                ], 0xff0000)],
                ephemeral: true
            });
        }
        
        const db = getDb();
        
        // Получаем текущий баланс пользователя
        let user = await db.get('SELECT balance FROM users WHERE user_id = ?', target.id);
        
        if (!user) {
            await db.run('INSERT INTO users (user_id) VALUES (?)', target.id);
            user = { balance: 500 };
        }
        
        const newBalance = user.balance + amount;
        
        // Проверка на максимальный баланс
        if (newBalance > config.ECONOMY.MAX_BALANCE) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [
                    { name: 'Превышение лимита', value: `Баланс пользователя не может превышать ${config.ECONOMY.MAX_BALANCE.toLocaleString()} экзпоинтов`, inline: false }
                ], 0xff0000)],
                ephemeral: true
            });
        }
        
        // Обновляем баланс
        await db.run('UPDATE users SET balance = ? WHERE user_id = ?', newBalance, target.id);
        
        // Логируем в админ-канал
        await logAdmin(client, '💰 Выдача экзпоинтов', [
            { name: 'Администратор', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Пользователь', value: `<@${target.id}>`, inline: true },
            { name: 'Сумма', value: `+${amount.toLocaleString()} экзпоинтов`, inline: true },
            { name: 'Причина', value: reason, inline: true },
            { name: 'Новый баланс', value: `${newBalance.toLocaleString()} экзпоинтов`, inline: true }
        ]);
        
        // Ответ админу
        await interaction.reply({
            embeds: [createEmbed('✅ Экзпоинты выданы', [
                { name: 'Пользователь', value: `<@${target.id}>`, inline: true },
                { name: 'Сумма', value: `+${amount.toLocaleString()} экзпоинтов`, inline: true },
                { name: 'Причина', value: reason, inline: true },
                { name: 'Новый баланс', value: `${newBalance.toLocaleString()} экзпоинтов`, inline: true }
            ], 0x00ff00)]
        });
        
        // Отправляем ЛС пользователю
        try {
            await target.send({
                embeds: [createEmbed('💰 Вам начислены экзпоинты!', [
                    { name: 'Сумма', value: `+${amount.toLocaleString()} экзпоинтов`, inline: true },
                    { name: 'Причина', value: reason, inline: true },
                    { name: 'Администратор', value: interaction.user.username, inline: true },
                    { name: 'Новый баланс', value: `${newBalance.toLocaleString()} экзпоинтов`, inline: true }
                ], 0x00ff00)]
            });
        } catch (e) {
            console.log('Не удалось отправить ЛС пользователю');
        }
    }
};