const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { renderProfile, sendImageEmbed } = require('../../../utils/imageGenerator');
const { getLevel } = require('../../../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Показать профиль пользователя')
        .addUserOption(option => option.setName('user').setDescription('Пользователь').setRequired(false)),
    
    async execute(client, interaction) {
        await interaction.deferReply();
        
        try {
            const target = interaction.options.getUser('user') || interaction.user;
            const db = getDb();
            
            let user = await db.get(`SELECT balance, total_spent, total_won_duels, daily_streak,
                                             total_messages, total_voice_minutes, xp
                                      FROM users WHERE user_id = ?`, target.id);

            if (!user) {
                await db.run('INSERT INTO users (user_id) VALUES (?)', target.id);
                user = await db.get(`SELECT balance, total_spent, total_won_duels, daily_streak,
                                             total_messages, total_voice_minutes, xp
                                      FROM users WHERE user_id = ?`, target.id);
            }
            
            const achievements = await db.all('SELECT achievement FROM achievements WHERE user_id = ? AND claimed = 1', target.id);

            // Статус брака: ищем пару пользователя, получаем никнейм партнёра
            const marriage = await db.get('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', target.id, target.id);
            let marriagePartner = null;
            if (marriage) {
                const partnerId = marriage.user1_id === target.id ? marriage.user2_id : marriage.user1_id;
                try {
                    const partnerMember = await interaction.guild.members.fetch(partnerId);
                    marriagePartner = partnerMember?.displayName || partnerMember?.user?.username || partnerId;
                } catch (e) {
                    marriagePartner = partnerId;
                }
            }

            let joinDate = '—';
            try {
                const member = await interaction.guild.members.fetch(target.id);
                if (member.joinedAt) {
                    const d = member.joinedAt;
                    joinDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
                }
            } catch (e) {}

            const userData = {
                username: target.username,
                userId: target.id,
                balance: user.balance,
                totalSpent: user.total_spent,
                duelsWon: user.total_won_duels,
                dailyStreak: user.daily_streak,
                totalMessages: user.total_messages || 0,
                totalVoiceMinutes: user.total_voice_minutes || 0,
                level: getLevel(user.xp || 0),
                xp: user.xp || 0,
                achievementsCount: achievements.length,
                achievements: achievements.map(a => a.achievement),
                joinDate,
                marriagePartner,
                avatarURL: target.displayAvatarURL({ extension: 'png', size: 256 }),
                defaultAvatarURL: target.defaultAvatarURL
            };
            
            const canvas = await renderProfile(userData);
            await sendImageEmbed(interaction, canvas, `👤 Профиль ${target.username}`, '#0B0B0C');
        } catch (error) {
            console.error('Ошибка в profile:', error);
            await interaction.editReply({ content: '❌ Ошибка при генерации профиля', embeds: [], files: [] });
        }
    }
};