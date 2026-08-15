const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const {
    createRecentTransactionsEmbed,
    createRecentGameEventsEmbed,
    createRecentPurchasesEmbed,
    createActivitySummaryEmbed,
    createActivityTimelineEmbed
} = require('../../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recent')
        .setDescription('Показать недавние действия и историю')
        .addUserOption(option => option.setName('user').setDescription('Пользователь').setRequired(false))
        .addStringOption(option => option.setName('type')
            .setDescription('Тип истории для просмотра')
            .setRequired(false)
            .addChoices(
                { name: 'Транзакции', value: 'transactions' },
                { name: 'Игры', value: 'games' },
                { name: 'Покупки', value: 'purchases' },
                { name: 'Сводка', value: 'summary' },
                { name: 'Таймлайн', value: 'timeline' }
            )),

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const target = interaction.options.getUser('user') || interaction.user;
            const historyType = interaction.options.getString('type');
            const db = getDb();

            // Проверяем существует ли пользователь в базе
            let user = await db.get('SELECT * FROM users WHERE user_id = ?', target.id);
            if (!user) {
                await db.run('INSERT INTO users (user_id) VALUES (?)', target.id);
                user = await db.get('SELECT * FROM users WHERE user_id = ?', target.id);
            }

            // Если тип истории не указан, показываем меню выбора
            if (!historyType) {
                return await this.showHistoryMenu(interaction, target);
            }

            // Обработка выбранного типа истории
            let embed;

            switch (historyType) {
                case 'transactions':
                    embed = await this.getRecentTransactionsEmbed(db, target);
                    break;

                case 'games':
                    embed = await this.getRecentGamesEmbed(db, target);
                    break;

                case 'purchases':
                    embed = await this.getRecentPurchasesEmbed(db, target);
                    break;

                case 'summary':
                    embed = await this.getActivitySummaryEmbed(db, target);
                    break;

                case 'timeline':
                    embed = await this.getActivityTimelineEmbed(db, target);
                    break;

                default:
                    return await interaction.editReply({
                        content: '❌ Неизвестный тип истории. Используйте меню для выбора.',
                        embeds: [],
                        components: []
                    });
            }

            await interaction.editReply({
                embeds: [embed],
                components: []
            });

        } catch (error) {
            console.error('Ошибка в recent:', error);
            await interaction.editReply({
                content: '❌ Ошибка при получении истории действий',
                embeds: [],
                components: []
            });
        }
    },

    async showHistoryMenu(interaction, target) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('history_type_select')
            .setPlaceholder('Выберите тип истории для просмотра')
            .addOptions([
                {
                    label: 'Транзакции',
                    description: 'Недавние переводы и подарки',
                    value: 'transactions',
                    emoji: '💸'
                },
                {
                    label: 'Игры',
                    description: 'История игровых событий',
                    value: 'games',
                    emoji: '🎮'
                },
                {
                    label: 'Покупки',
                    description: 'История покупок в магазине',
                    value: 'purchases',
                    emoji: '🛒'
                },
                {
                    label: 'Сводка активности',
                    description: 'Статистика и обзор',
                    value: 'summary',
                    emoji: '📊'
                },
                {
                    label: 'Таймлайн',
                    description: 'Хронология событий',
                    value: 'timeline',
                    emoji: '⏱️'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: `**📜 История действий ${target.username}**\nВыберите тип истории для просмотра:`,
            components: [row]
        });
    },

    async getRecentTransactionsEmbed(db, target) {
        // Получаем последние 10 транзакций с участием пользователя
        const transactions = await db.all(`
            SELECT * FROM transactions
            WHERE from_user = ? OR to_user = ?
            ORDER BY created_at DESC
            LIMIT 10
        `, target.id, target.id);

        const formattedTransactions = transactions.map(transaction => {
            const isSender = transaction.from_user === target.id;
            const isReceiver = transaction.to_user === target.id;

            let amount = transaction.amount;
            if (isSender && transaction.commission) {
                amount = -(transaction.amount + transaction.commission);
            } else if (isReceiver) {
                amount = transaction.amount;
            } else if (isSender) {
                amount = -transaction.amount;
            }

            return {
                fromUser: transaction.from_user === target.id ? 'Вы' : transaction.from_user,
                toUser: transaction.to_user === target.id ? 'Вы' : transaction.to_user,
                amount: amount,
                type: transaction.type,
                timestamp: transaction.created_at ? new Date(transaction.created_at * 1000) : null
            };
        });

        return createRecentTransactionsEmbed(target.username, formattedTransactions);
    },

    async getRecentGamesEmbed(db, target) {
        // Получаем историю игр (из таблиц duels, lottery, casino результатов)
        const gameEvents = [];

        // История дуэлей
        const duelResults = await db.all(`
            SELECT * FROM pending_duels
            WHERE (challenger = ? OR opponent = ?) AND expires_at < strftime('%s', 'now')
            ORDER BY created_at DESC
            LIMIT 5
        `, target.id, target.id);

        // Заглушки для других игр (в реальном проекте нужно реализовать запросы к соответствующим таблицам)
        const lotteryHistory = await db.all(`
            SELECT * FROM lottery_tickets
            WHERE user_id = ?
            ORDER BY bought_at DESC
            LIMIT 3
        `, target.id);

        // Добавляем дуэли
        duelResults.forEach(duel => {
            const isChallenger = duel.challenger === target.id;
            const opponent = isChallenger ? duel.opponent : duel.challenger;

            // В реальном проекте нужно определить результат дуэли
            const result = 'unknown'; // Здесь нужна логика определения результата

            gameEvents.push({
                gameType: 'duel',
                result: result,
                details: `Противник: ${opponent}`,
                amount: duel.amount,
                timestamp: duel.created_at ? new Date(duel.created_at * 1000) : null
            });
        });

        // Добавляем лотерею
        lotteryHistory.forEach(ticket => {
            gameEvents.push({
                gameType: 'lottery',
                result: 'pending',
                details: 'Куплен билет лотереи',
                amount: -100, // Стоимость билета
                timestamp: ticket.bought_at ? new Date(ticket.bought_at * 1000) : null
            });
        });

        // Сортируем по времени
        gameEvents.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.getTime() : 0;
            const timeB = b.timestamp ? b.timestamp.getTime() : 0;
            return timeB - timeA;
        });

        // Ограничиваем 8 событиями
        return createRecentGameEventsEmbed(target.username, gameEvents.slice(0, 8));
    },

    async getRecentPurchasesEmbed(db, target) {
        // Получаем последние покупки из user_roles
        const rolePurchases = await db.all(`
            SELECT * FROM user_roles
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 8
        `, target.id);

        // Получаем покупки из pending_purchases
        const otherPurchases = await db.all(`
            SELECT * FROM pending_purchases
            WHERE user_id = ? AND expires_at < strftime('%s', 'now')
            ORDER BY created_at DESC
            LIMIT 5
        `, target.id);

        const purchases = [];

        // Добавляем покупки ролей
        rolePurchases.forEach(role => {
            purchases.push({
                itemName: role.role_name || 'Кастомная роль',
                price: role.total_invested || 150000,
                itemType: 'role',
                timestamp: role.created_at ? new Date(role.created_at * 1000) : null
            });
        });

        // Добавляем другие покупки
        otherPurchases.forEach(purchase => {
            let itemType = purchase.type;
            let itemName = '';

            switch (purchase.type) {
                case 'subscription':
                    itemType = 'subscription';
                    itemName = 'Премиум подписка';
                    break;
                case 'marriage':
                    itemType = 'marriage';
                    itemName = 'Церемония брака';
                    break;
                case 'room':
                    itemType = 'room';
                    itemName = 'Личная комната';
                    break;
                default:
                    itemName = purchase.type;
            }

            purchases.push({
                itemName: itemName,
                price: purchase.price,
                itemType: itemType,
                timestamp: purchase.created_at ? new Date(purchase.created_at * 1000) : null
            });
        });

        // Сортируем по времени
        purchases.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.getTime() : 0;
            const timeB = b.timestamp ? b.timestamp.getTime() : 0;
            return timeB - timeA;
        });

        return createRecentPurchasesEmbed(target.username, purchases.slice(0, 10));
    },

    async getActivitySummaryEmbed(db, target) {
        // Получаем общую статистику
        const userStats = await db.get(`
            SELECT
                balance,
                total_spent,
                total_earned,
                total_won_duels,
                total_lost_duels,
                daily_streak,
                total_messages,
                total_voice_minutes,
                xp
            FROM users
            WHERE user_id = ?
        `, target.id);

        // Получаем количество транзакций
        const transactionCount = await db.get(`
            SELECT COUNT(*) as count FROM transactions
            WHERE from_user = ? OR to_user = ?
        `, target.id, target.id);

        // Получаем последние действия
        const lastTransactions = await db.all(`
            SELECT type, amount, created_at FROM transactions
            WHERE from_user = ? OR to_user = ?
            ORDER BY created_at DESC
            LIMIT 5
        `, target.id, target.id);

        const lastActivities = lastTransactions.map(tx => {
            let title = '';
            switch (tx.type) {
                case 'gift': title = 'Подарок'; break;
                case 'transfer': title = 'Перевод'; break;
                case 'casino': title = 'Казино'; break;
                default: title = tx.type;
            }

            const now = Math.floor(Date.now() / 1000);
            const diff = now - tx.created_at;
            let timeAgo = 'Только что';

            if (diff > 3600) {
                timeAgo = `${Math.floor(diff / 3600)}ч назад`;
            } else if (diff > 60) {
                timeAgo = `${Math.floor(diff / 60)}м назад`;
            }

            // Определяем сумму (положительная для получателя, отрицательная для отправителя)
            const isReceiver = true; // Упрощённо - в реальном проекте нужно определить
            const amount = isReceiver ? tx.amount : -tx.amount;

            return {
                title: title,
                type: tx.type,
                amount: amount,
                timeAgo: timeAgo
            };
        });

        const summary = {
            totalTransactions: transactionCount?.count || 0,
            totalSpent: userStats?.total_spent || 0,
            totalEarned: userStats?.total_earned || 0,
            currentBalance: userStats?.balance || 0,
            lastActivities: lastActivities
        };

        return createActivitySummaryEmbed(target.username, summary);
    },

    async getActivityTimelineEmbed(db, target) {
        // Собираем события из разных таблиц для создания таймлайна
        const timelineEvents = [];

        // Получаем дату регистрации пользователя
        const userCreated = await db.get('SELECT created_at FROM users WHERE user_id = ?', target.id);
        if (userCreated?.created_at) {
            timelineEvents.push({
                type: 'registration',
                title: 'Регистрация',
                description: `Пользователь ${target.username} зарегистрировался в экономической системе`,
                timestamp: new Date(userCreated.created_at * 1000),
                icon: '📝'
            });
        }

        // Получаем первую транзакцию
        const firstTransaction = await db.get(`
            SELECT * FROM transactions
            WHERE from_user = ? OR to_user = ?
            ORDER BY created_at ASC
            LIMIT 1
        `, target.id, target.id);

        if (firstTransaction) {
            timelineEvents.push({
                type: 'transaction',
                title: 'Первая транзакция',
                description: `${firstTransaction.type === 'gift' ? 'Подарок' : 'Перевод'} на ${firstTransaction.amount} экзпоинтов`,
                timestamp: firstTransaction.created_at ? new Date(firstTransaction.created_at * 1000) : null,
                icon: '💸'
            });
        }

        // Получаем первую покупку роли
        const firstRolePurchase = await db.get(`
            SELECT * FROM user_roles
            WHERE user_id = ?
            ORDER BY created_at ASC
            LIMIT 1
        `, target.id);

        if (firstRolePurchase) {
            timelineEvents.push({
                type: 'purchase',
                title: 'Первая роль',
                description: `Покупка роли "${firstRolePurchase.role_name || 'Кастомная роль'}"`,
                timestamp: firstRolePurchase.created_at ? new Date(firstRolePurchase.created_at * 1000) : null,
                icon: '👑'
            });
        }

        // Получаем последнюю победу в дуэли
        const lastDuelWin = await db.get(`
            SELECT * FROM pending_duels
            WHERE (challenger = ? OR opponent = ?)
            ORDER BY created_at DESC
            LIMIT 1
        `, target.id, target.id);

        if (lastDuelWin) {
            // В реальном проекте нужно определить результат дуэли
            timelineEvents.push({
                type: 'game',
                title: 'Последняя дуэль',
                description: `Дуэль на ${lastDuelWin.amount} экзпоинтов`,
                timestamp: lastDuelWin.created_at ? new Date(lastDuelWin.created_at * 1000) : null,
                icon: '⚔️'
            });
        }

        // Получаем информацию о браке
        const marriage = await db.get('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', target.id, target.id);
        if (marriage) {
            timelineEvents.push({
                type: 'achievement',
                title: 'Брак',
                description: 'Вступил в брак',
                timestamp: marriage.created_at ? new Date(marriage.created_at * 1000) : null,
                icon: '💍'
            });
        }

        // Сортируем по времени
        timelineEvents.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.getTime() : 0;
            const timeB = b.timestamp ? b.timestamp.getTime() : 0;
            return timeB - timeA;
        });

        return createActivityTimelineEmbed(target.username, timelineEvents.slice(0, 8));
    }
};