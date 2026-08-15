const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../database');
const { createEmbed } = require('../../utils/embedBuilder');
const { logAdmin } = require('../../utils/logger');
const config = require('../../config');

// ID РОЛЕЙ, КОТОРЫЕ МОГУТ ИСПОЛЬЗОВАТЬ КОМАНДУ
const ALLOWED_ROLE_IDS = [
    '1482163875347693669', // Админ-роль 1
    '1497712134874730658', // Админ-роль 2
    '1498735261868101812', // Админ-роль 3
    '1500938977434407003'  // Админ-роль 4
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tax')
        .setDescription('💰 Снять экзпоинты с пользователя (Только для администрации)')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Сумма штрафа')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Причина штрафа')
                .setRequired(true))
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
        const reason = interaction.options.getString('reason');
        
        const db = getDb();
        const user = await db.get('SELECT balance FROM users WHERE user_id = ?', target.id);
        
        if (!user) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [
                    { name: 'Пользователь не найден', value: 'Пользователь не зарегистрирован в базе данных', inline: false }
                ], 0xff0000)],
                ephemeral: true
            });
        }
        
        const newBalance = Math.max(0, user.balance - amount);
        
        await db.run('UPDATE users SET balance = ? WHERE user_id = ?', newBalance, target.id);
        
        await logAdmin(client, '⚠️ Штраф', [
            { name: 'Администратор', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Пользователь', value: `<@${target.id}>`, inline: true },
            { name: 'Сумма', value: `-${amount.toLocaleString()} экзпоинтов`, inline: true },
            { name: 'Причина', value: reason, inline: true },
            { name: 'Новый баланс', value: `${newBalance.toLocaleString()} экзпоинтов`, inline: true }
        ]);
        
        await interaction.reply({
            embeds: [createEmbed('✅ Штраф выписан', [
                { name: 'Пользователь', value: `<@${target.id}>`, inline: true },
                { name: 'Сумма', value: `-${amount.toLocaleString()} экзпоинтов`, inline: true },
                { name: 'Причина', value: reason, inline: true },
                { name: 'Новый баланс', value: `${newBalance.toLocaleString()} экзпоинтов`, inline: true }
            ], 0xffaa00)]
        });
        
        try {
            await target.send({
                embeds: [createEmbed('⚠️ Вам выписан штраф', [
                    { name: 'Сумма', value: `-${amount.toLocaleString()} экзпоинтов`, inline: true },
                    { name: 'Причина', value: reason, inline: true },
                    { name: 'Администратор', value: interaction.user.username, inline: true },
                    { name: 'Новый баланс', value: `${newBalance.toLocaleString()} экзпоинтов`, inline: true }
                ], 0xff0000)]
            });
        } catch (e) {}
    }
};