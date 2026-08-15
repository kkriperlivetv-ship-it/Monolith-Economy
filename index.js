require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { initDatabase } = require('./database');
const { createEmbed } = require('./utils/embedBuilder');
const config = require('./config');
const buttonHandler = require('./handlers/buttonHandler');
const messageHandler = require('./handlers/messageHandler');
const voiceHandler = require('./handlers/voiceHandler');
const { startRobberyInterval } = require('./games/robberyGame');
const { startLotteryInterval } = require('./games/lotteryGame');
const { startSubscriptionChecker } = require('./utils/subscriptionManager');
const { createCustomRole, editRoleName, sendMarriageProposal } = require('./handlers/buttonHandler');

const { startDashboard } = require('./dashboard');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();
client.cooldowns = new Collection();

async function init() {
    try {
        console.log('🔄 Инициализация базы данных...');
        await initDatabase();
        
        console.log('🔄 Регистрация команд...');
        await require('./commands')(client);

        // Запуск панели мониторинга для AI Studio (порт 3000)
        startDashboard(client, 3000);
        
        client.on('ready', async () => {
            console.log(`✅ Бот запущен как ${client.user.tag}`);
            console.log(`✅ Бот на сервере: ${client.guilds.cache.size} серверов`);
            startRobberyInterval(client);
            startLotteryInterval(client);
            startSubscriptionChecker(client);
        });
        
        client.on('interactionCreate', async (interaction) => {
            try {
                // ========== ОБРАБОТКА КНОПОК ==========
                if (interaction.isButton()) {
                    return buttonHandler(client, interaction);
                }
                
                // ========== ОБРАБОТКА ВЫПАДАЮЩИХ МЕНЮ ==========
                if (interaction.isStringSelectMenu()) {
                    const [action, ...dataParts] = interaction.customId.split(':');
                    const data = dataParts.join(':');

                    if (action === 'room_kick_select') {
                        const [channelId, ownerId] = data.split(':');
                        const targetUserId = interaction.values[0];

                        if (interaction.user.id !== ownerId && !interaction.memberPermissions?.has('Administrator')) {
                            return interaction.reply({
                                content: '❌ Только владелец комнаты может исключать участников!',
                                ephemeral: true
                            });
                        }

                        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
                        if (!channel) {
                            return interaction.reply({
                                content: '❌ Голосовой канал не найден на сервере!',
                                ephemeral: true
                            });
                        }

                        const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
                        if (!member || member.voice?.channelId !== channelId) {
                            return interaction.reply({
                                content: '❌ Этот участник сейчас не находится в вашей комнате!',
                                ephemeral: true
                            });
                        }

                        try {
                            await member.voice.disconnect('Исключён владельцем комнаты');
                            await interaction.update({
                                content: `✅ Участник **${member.displayName || member.user.username}** был исключён из комнаты!`,
                                components: [],
                                embeds: []
                            });
                        } catch (err) {
                            await interaction.reply({
                                content: `❌ Не удалось кикнуть участника: ${err.message}`,
                                ephemeral: true
                            });
                        }
                        return;
                    }

                    // ========== ОБРАБОТКА МЕНЮ ИСТОРИИ ==========
                    if (action === 'history_type_select') {
                        await interaction.deferUpdate();

                        try {
                            const selectedType = interaction.values[0];
                            const db = require('./database').getDb();
                            const recentCommands = require('./commands/economy/economy/recent');

                            let embed;

                            switch (selectedType) {
                                case 'transactions':
                                    embed = await recentCommands.getRecentTransactionsEmbed(db, interaction.user);
                                    break;

                                case 'games':
                                    embed = await recentCommands.getRecentGamesEmbed(db, interaction.user);
                                    break;

                                case 'purchases':
                                    embed = await recentCommands.getRecentPurchasesEmbed(db, interaction.user);
                                    break;

                                case 'summary':
                                    embed = await recentCommands.getActivitySummaryEmbed(db, interaction.user);
                                    break;

                                case 'timeline':
                                    embed = await recentCommands.getActivityTimelineEmbed(db, interaction.user);
                                    break;

                                default:
                                    await interaction.editReply({
                                        content: '❌ Неизвестный тип истории',
                                        components: []
                                    });
                                    return;
                            }

                            await interaction.editReply({
                                content: `**📜 История действий ${interaction.user.username}**`,
                                embeds: [embed],
                                components: []
                            });

                        } catch (error) {
                            console.error('Ошибка обработки меню истории:', error);
                            await interaction.editReply({
                                content: '❌ Ошибка при загрузке истории',
                                components: []
                            });
                        }
                        return;
                    }

                    return;
                }
                
                // ========== ОБРАБОТКА МОДАЛЬНЫХ ОКОН ==========
                if (interaction.isModalSubmit()) {
                    const modalId = interaction.customId;
                    
                    // Создание роли
                    if (modalId.startsWith('role_name_modal')) {
                        const [, colorHex, colorName, userId, rolePrice] = modalId.split(':');
                        
                        if (interaction.user.id !== userId) {
                            return interaction.reply({
                                content: '❌ Это не твоя сессия покупки!',
                                ephemeral: true
                            });
                        }
                        
                        let roleName = '';
                        try {
                            roleName = interaction.fields.getTextInputValue('role_name');
                        } catch (e) {}
                        
                        let hoist = 'нет';
                        try {
                            hoist = interaction.fields.getTextInputValue('role_hoist') || 'нет';
                        } catch (e) {}
                        
                        await createCustomRole(client, interaction, colorHex, colorName, userId, parseInt(rolePrice), roleName, hoist);
                        return;
                    }

                    // Ввод партнёра для брака
                    if (modalId.startsWith('marriage_partner_modal')) {
                        const userId = modalId.split(':')[1];

                        if (interaction.user.id !== userId) {
                            return interaction.reply({
                                content: '❌ Это не твоя сессия покупки!',
                                ephemeral: true
                            });
                        }

                        const partnerInput = interaction.fields.getTextInputValue('partner_input');
                        await sendMarriageProposal(client, interaction, userId, partnerInput);
                        return;
                    }

                    // Изменение названия роли
                    if (modalId.startsWith('edit_name_modal')) {
                        const roleId = modalId.split(':')[1];
                        const newName = interaction.fields.getTextInputValue('new_name');
                        
                        await interaction.deferReply({ ephemeral: true });
                        await editRoleName(interaction, roleId, newName);
                        return;
                    }
                    
                    // Изменение названия комнаты
                    if (modalId.startsWith('room_name_modal')) {
                        const [, channelId, ownerId] = modalId.split(':');
                        
                        if (interaction.user.id !== ownerId && !interaction.memberPermissions?.has('Administrator')) {
                            return interaction.reply({
                                content: '❌ Вы не можете изменять название этой комнаты!',
                                ephemeral: true
                            });
                        }
                        
                        const newName = interaction.fields.getTextInputValue('new_name')?.trim();
                        if (!newName) {
                            return interaction.reply({
                                content: '❌ Название комнаты не может быть пустым!',
                                ephemeral: true
                            });
                        }

                        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
                        
                        if (!channel) {
                            return interaction.reply({
                                content: '❌ Голосовой канал не найден на сервере!',
                                ephemeral: true
                            });
                        }
                        
                        try {
                            await channel.setName(newName);
                            await interaction.reply({
                                content: `✅ Название комнаты изменено на **${newName}**!`,
                                ephemeral: true
                            });
                        } catch (err) {
                            await interaction.reply({
                                content: `❌ Ошибка при изменении названия: ${err.message}`,
                                ephemeral: true
                            });
                        }
                        return;
                    }
                    
                    // Изменение лимита комнаты
                    if (modalId.startsWith('room_limit_modal')) {
                        const [, channelId, ownerId] = modalId.split(':');
                        
                        if (interaction.user.id !== ownerId && !interaction.memberPermissions?.has('Administrator')) {
                            return interaction.reply({
                                content: '❌ Вы не можете изменять лимит этой комнаты!',
                                ephemeral: true
                            });
                        }
                        
                        const newLimit = parseInt(interaction.fields.getTextInputValue('new_limit'), 10);
                        
                        if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
                            return interaction.reply({
                                content: '❌ Лимит должен быть числом от 0 до 99 (0 — безлимит)!',
                                ephemeral: true
                            });
                        }
                        
                        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
                        
                        if (!channel) {
                            return interaction.reply({
                                content: '❌ Голосовой канал не найден на сервере!',
                                ephemeral: true
                            });
                        }
                        
                        try {
                            await channel.setUserLimit(newLimit);
                            await interaction.reply({
                                content: `✅ Лимит участников изменён на **${newLimit === 0 ? 'безлимит' : newLimit}**!`,
                                ephemeral: true
                            });
                        } catch (err) {
                            await interaction.reply({
                                content: `❌ Ошибка при изменении лимита: ${err.message}`,
                                ephemeral: true
                            });
                        }
                        return;
                    }
                    
                    return;
                }
                
                // ========== ОБРАБОТКА СЛЕШ-КОМАНД ==========
                if (interaction.isChatInputCommand()) {
                    const command = client.commands.get(interaction.commandName);
                    if (!command) return;
                    
                    try {
                        await command.execute(client, interaction);
                    } catch (error) {
                        console.error(`❌ Ошибка в команде ${interaction.commandName}:`, error);
                        
                        if (interaction.deferred || interaction.replied) {
                            await interaction.editReply({ 
                                content: '❌ Произошла ошибка при выполнении команды',
                                embeds: [], 
                                files: [] 
                            });
                        } else {
                            await interaction.reply({ 
                                content: '❌ Произошла ошибка при выполнении команды',
                                ephemeral: true 
                            });
                        }
                    }
                    return;
                }
                
            } catch (error) {
                console.error('❌ Ошибка в interactionCreate:', error);
                
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: '❌ Произошла непредвиденная ошибка', 
                            ephemeral: true 
                        });
                    }
                } catch (e) {}
            }
        });
        
        client.on('messageCreate', (message) => messageHandler(client, message));
        client.on('voiceStateUpdate', (oldState, newState) => voiceHandler(client, oldState, newState));
        
        client.on('error', (error) => {
            console.error('❌ Ошибка клиента:', error);
        });
        
        process.on('unhandledRejection', (error) => {
            console.error('❌ Необработанное отклонение промиса:', error);
        });
        
        if (config.TOKEN) {
            console.log('🔄 Подключение к Discord...');
            try {
                await client.login(config.TOKEN);
            } catch (loginErr) {
                console.error('❌ Ошибка авторизации Discord бота:', loginErr.message);
                console.log('💡 Проверьте правильность TOKEN в настройках окружения.');
            }
        } else {
            console.log('ℹ️ [AI Studio] Переменная TOKEN не установлена. Бот работает в режиме автономной панели веб-мониторинга.');
            console.log('💡 Для подключения к Discord укажите TOKEN в настройках переменных окружения.');
        }
        
    } catch (error) {
        console.error('❌ Ошибка при запуске:', error);
    }
}

init();