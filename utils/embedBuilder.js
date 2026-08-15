const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Цвет из твоего шаблона (1711134 в десятичной системе = #1A1C1E в hex)
const EMBED_COLOR = 1711134;  // #1A1C1E

// URL гифки из твоего шаблона (СТРОКА!)
const BANNER_GIF_URL = 'https://cdn.discordapp.com/attachments/1177311446800023626/1496901956294410291/2GxE5Kn.gif?ex=69f81855&is=69f6c6d5&hm=98af9662f70130c06bce964ccd03e90bc418d747e2b20005f5580af77eeba7f7&';

/**
 * Создаёт embed в стиле твоего шаблона
 * @param {string} title - Заголовок embed
 * @param {Array} fields - Массив полей { name, value, inline }
 * @param {string|null} imageUrl - URL картинки (СТРОКА или null)
 * @returns {EmbedBuilder}
 */
function createEmbed(title, fields = [], imageUrl = null) {
    const embed = new EmbedBuilder()
        .setTitle(title || 'Панель управления')
        .setColor(EMBED_COLOR)
        .setTimestamp()
        .setFooter({ text: 'Экономическая система' });
    
    // Добавляем поля
    fields.forEach(field => {
        embed.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline || false
        });
    });
    
    // Добавляем изображение (только если imageUrl - строка и не пустая)
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
        embed.setImage(imageUrl);
    } else if (BANNER_GIF_URL && typeof BANNER_GIF_URL === 'string') {
        embed.setImage(BANNER_GIF_URL);
    }
    
    return embed;
}

/**
 * Создаёт embed с успешным результатом
 */
function createSuccessEmbed(title, fields) {
    return createEmbed(`✅ ${title}`, fields);
}

/**
 * Создаёт embed с ошибкой
 */
function createErrorEmbed(title, fields) {
    return createEmbed(`❌ ${title}`, fields);
}

/**
 * Создаёт embed с предупреждением
 */
function createWarningEmbed(title, fields) {
    return createEmbed(`⚠️ ${title}`, fields);
}

/**
 * Создаёт embed с информацией
 */
function createInfoEmbed(title, fields) {
    return createEmbed(`ℹ️ ${title}`, fields);
}

/**
 * Форматирует значение как код (в обратных кавычках, как в шаблоне)
 * @param {any} value - Значение для форматирования
 * @returns {string} - Отформатированная строка в виде ```значение```
 */
function formatCode(value) {
    return `\`\`\`${value}\`\`\``;
}

/**
 * Создаёт embed для профиля пользователя
 */
function createProfileEmbed(username, balance, totalSpent, duelsWon, dailyStreak, achievementsCount) {
    const fields = [
        { name: '💰 Баланс', value: formatCode(`${balance.toLocaleString()} экзпоинтов`), inline: true },
        { name: '💸 Потрачено', value: formatCode(`${totalSpent.toLocaleString()} экзпоинтов`), inline: true },
        { name: '⚔️ Победы', value: formatCode(`${duelsWon}`), inline: true },
        { name: '📅 Дейли стрик', value: formatCode(`${dailyStreak} дней`), inline: true },
        { name: '🏆 Достижения', value: formatCode(`${achievementsCount} / 15`), inline: true }
    ];
    
    return createEmbed(`Профиль ${username}`, fields);
}

/**
 * Создаёт embed для ежедневного бонуса
 */
function createDailyEmbed(streak, bonus, newBalance) {
    const fields = [
        { name: 'Стрик', value: formatCode(`${streak} дней`), inline: true },
        { name: 'Бонус', value: formatCode(`+${bonus.toLocaleString()} экзпоинтов`), inline: true },
        { name: 'Новый баланс', value: formatCode(`${newBalance.toLocaleString()} экзпоинтов`), inline: true }
    ];
    
    return createEmbed('Ежедневный бонус получен!', fields);
}

/**
 * Создаёт embed для результата казино
 */
function createCasinoEmbed(gameType, bet, isWin, winAmount, details) {
    const fields = [
        { name: 'Игра', value: formatCode(gameType), inline: true },
        { name: 'Ставка', value: formatCode(`${bet.toLocaleString()} экзпоинтов`), inline: true },
        { name: 'Результат', value: formatCode(isWin ? 'ПОБЕДА!' : 'ПРОИГРЫШ'), inline: true }
    ];
    
    if (isWin) {
        fields.push({ name: 'Выигрыш', value: formatCode(`+${winAmount.toLocaleString()} экзпоинтов`), inline: true });
    }
    
    if (details) {
        if (gameType === 'Слоты' && details.results) {
            fields.push({ name: 'Комбинация', value: formatCode(details.results.join(' | ')), inline: false });
            if (details.multiplier) {
                fields.push({ name: 'Множитель', value: formatCode(`x${details.multiplier}`), inline: true });
            }
        } else if (gameType === 'Орёл и Решка' && details.choice && details.result) {
            fields.push({ name: 'Ваш выбор', value: formatCode(details.choice), inline: true });
            fields.push({ name: 'Результат', value: formatCode(details.result), inline: true });
        } else if (gameType === 'Рандом' && details.userNumber && details.botNumber) {
            fields.push({ name: 'Ваше число', value: formatCode(`${details.userNumber}`), inline: true });
            fields.push({ name: 'Число бота', value: formatCode(`${details.botNumber}`), inline: true });
            fields.push({ name: 'Разница', value: formatCode(`${details.diff}`), inline: true });
        }
    }
    
    const title = isWin ? 'ПОБЕДА В КАЗИНО!' : 'ПРОИГРЫШ В КАЗИНО';
    return createEmbed(title, fields);
}

/**
 * Создаёт embed для подарка
 */
function createGiftEmbed(fromUser, toUser, amount, message, commission) {
    const fields = [
        { name: 'Отправитель', value: formatCode(fromUser), inline: true },
        { name: 'Получатель', value: formatCode(toUser), inline: true },
        { name: 'Сумма', value: formatCode(`${amount.toLocaleString()} экзпоинтов`), inline: true }
    ];
    
    if (commission) {
        fields.push({ name: 'Комиссия (10%)', value: formatCode(`${commission.toLocaleString()} экзпоинтов`), inline: true });
    }
    
    if (message && message !== 'Подарок!') {
        fields.push({ name: 'Сообщение', value: `"${message}"`, inline: false });
    }
    
    return createEmbed('Подарок отправлен!', fields);
}

/**
 * Создаёт embed для перевода
 */
function createTransferEmbed(fromUser, toUser, amount) {
    const fields = [
        { name: 'Отправитель', value: formatCode(fromUser), inline: true },
        { name: 'Получатель', value: formatCode(toUser), inline: true },
        { name: 'Сумма', value: formatCode(`${amount.toLocaleString()} экзпоинтов`), inline: true }
    ];
    
    return createEmbed('Перевод выполнен', fields);
}

/**
 * Создаёт embed для дуэли
 */
function createDuelEmbed(challenger, opponent, amount, winner, winnerChoice, loserChoice) {
    const fields = [
        { name: 'Противники', value: formatCode(`${challenger} vs ${opponent}`), inline: true },
        { name: 'Ставка', value: formatCode(`${amount.toLocaleString()} экзпоинтов`), inline: true }
    ];
    
    if (winner) {
        fields.push({ name: 'Победитель', value: formatCode(winner), inline: true });
        fields.push({ name: 'Выбор победителя', value: formatCode(winnerChoice), inline: true });
        fields.push({ name: 'Выбор проигравшего', value: formatCode(loserChoice), inline: true });
        
        const winAmount = Math.floor(amount * 0.95);
        fields.push({ name: 'Выигрыш', value: formatCode(`${winAmount.toLocaleString()} экзпоинтов`), inline: true });
        
        return createEmbed('Результат дуэли!', fields);
    }
    
    return createEmbed('Вызов на дуэль!', fields);
}

/**
 * Создаёт embed для лотереи
 */
function createLotteryEmbed(ticketCount, totalCost, drawTime) {
    const fields = [
        { name: 'Куплено билетов', value: formatCode(`${ticketCount} шт.`), inline: true },
        { name: 'Общая стоимость', value: formatCode(`${totalCost.toLocaleString()} экзпоинтов`), inline: true },
        { name: 'Розыгрыш', value: formatCode(`через ${drawTime} часов`), inline: true }
    ];
    
    return createEmbed('Билеты лотереи куплены!', fields);
}

/**
 * Создаёт embed для результата лотереи
 */
function createLotteryResultEmbed(winner, prize, ticketsCount) {
    const fields = [
        { name: 'Победитель', value: formatCode(winner), inline: true },
        { name: 'Приз', value: formatCode(`${prize.toLocaleString()} экзпоинтов`), inline: true },
        { name: 'Билетов в розыгрыше', value: formatCode(`${ticketsCount} шт.`), inline: true }
    ];
    
    return createEmbed('🎉 РОЗЫГРЫШ ЛОТЕРЕИ!', fields);
}

/**
 * Создаёт embed для административного штрафа
 */
function createTaxEmbed(user, amount, reason, admin, newBalance) {
    const fields = [
        { name: 'Пользователь', value: formatCode(user), inline: true },
        { name: 'Сумма штрафа', value: formatCode(`${amount.toLocaleString()} экзпоинтов`), inline: true },
        { name: 'Причина', value: formatCode(reason), inline: true },
        { name: 'Администратор', value: formatCode(admin), inline: true },
        { name: 'Новый баланс', value: formatCode(`${newBalance.toLocaleString()} экзпоинтов`), inline: true }
    ];
    
    return createEmbed('Штраф выписан!', fields);
}

/**
 * Создаёт embed для ограбления
 */
function createRobberyEmbed(action, amount, result, userChoice, botChoice) {
    const fields = [
        { name: 'Действие', value: formatCode(action), inline: true }
    ];

    if (amount) {
        fields.push({ name: 'Сумма', value: formatCode(`${amount.toLocaleString()} экзпоинтов`), inline: true });
    }

    if (result) {
        fields.push({ name: 'Результат', value: formatCode(result), inline: true });
    }

    if (userChoice && botChoice) {
        fields.push({ name: 'Ваш ход', value: formatCode(userChoice), inline: true });
        fields.push({ name: 'Ход грабителей', value: formatCode(botChoice), inline: true });
    }

    const title = action === 'Заплатил' ? 'Вы заплатили грабителям' : 'Сражение с грабителями';
    return createEmbed(title, fields);
}

/**
 * Создаёт embed для отображения недавних транзакций
 * @param {Array} transactions - Массив транзакций [{fromUser, toUser, amount, type, timestamp}]
 * @param {string} username - Имя пользователя, чьи транзакции отображаются
 * @returns {EmbedBuilder}
 */
function createRecentTransactionsEmbed(username, transactions) {
    const fields = [];

    if (transactions.length === 0) {
        fields.push({ name: 'История', value: formatCode('Нет недавних транзакций'), inline: false });
    } else {
        fields.push({ name: 'Недавние действия', value: formatCode(`Показано ${transactions.length} транзакций`), inline: false });

        transactions.forEach((transaction, index) => {
            let transactionType = '';
            let transactionInfo = '';
            const timestamp = transaction.timestamp ?
                new Date(transaction.timestamp).toLocaleString('ru-RU') :
                'Недавно';

            switch (transaction.type) {
                case 'gift':
                    transactionType = '🎁 Подарок';
                    transactionInfo = `От: ${transaction.fromUser} → ${transaction.toUser}`;
                    break;
                case 'transfer':
                    transactionType = '💸 Перевод';
                    transactionInfo = `От: ${transaction.fromUser} → ${transaction.toUser}`;
                    break;
                case 'daily':
                    transactionType = '📅 Дейли';
                    transactionInfo = 'Ежедневный бонус';
                    break;
                case 'casino':
                    transactionType = '🎰 Казино';
                    transactionInfo = transaction.isWin ? `Победа` : `Проигрыш`;
                    break;
                case 'duel':
                    transactionType = '⚔️ Дуэль';
                    transactionInfo = `Победитель: ${transaction.winner}`;
                    break;
                case 'lottery':
                    transactionType = '🎫 Лотерея';
                    transactionInfo = transaction.isWin ? 'Победа в лотерее' : 'Покупка билета';
                    break;
                case 'shop':
                    transactionType = '🛒 Покупка';
                    transactionInfo = transaction.itemName || 'Товар';
                    break;
                default:
                    transactionType = '📊 Транзакция';
                    transactionInfo = transaction.type || 'Действие';
            }

            const amountSign = transaction.amount >= 0 ? '+' : '-';
            const amountColor = transaction.amount >= 0 ? '🟢' : '🔴';

            fields.push({
                name: `${transactionType} • ${timestamp}`,
                value: `${amountColor} **${amountSign}${Math.abs(transaction.amount).toLocaleString()} экзпоинтов**\n${formatCode(transactionInfo)}`,
                inline: false
            });
        });
    }

    return createEmbed(`Недавние действия ${username}`, fields);
}

/**
 * Создаёт embed для отображения недавних игровых событий
 * @param {Array} gameEvents - Массив игровых событий [{gameType, result, details, amount, timestamp}]
 * @param {string} username - Имя пользователя
 * @returns {EmbedBuilder}
 */
function createRecentGameEventsEmbed(username, gameEvents) {
    const fields = [];

    if (gameEvents.length === 0) {
        fields.push({ name: 'История игр', value: formatCode('Нет недавних игровых событий'), inline: false });
    } else {
        fields.push({ name: 'Игровая активность', value: formatCode(`Последние ${gameEvents.length} событий`), inline: false });

        gameEvents.forEach((event, index) => {
            let gameIcon = '';
            let gameTitle = '';
            const timestamp = event.timestamp ?
                new Date(event.timestamp).toLocaleString('ru-RU') :
                'Недавно';

            switch (event.gameType) {
                case 'casino':
                    gameIcon = '🎰';
                    gameTitle = 'Казино';
                    break;
                case 'duel':
                    gameIcon = '⚔️';
                    gameTitle = 'Дуэль';
                    break;
                case 'lottery':
                    gameIcon = '🎫';
                    gameTitle = 'Лотерея';
                    break;
                case 'robbery':
                    gameIcon = '💰';
                    gameTitle = 'Ограбление';
                    break;
                default:
                    gameIcon = '🎮';
                    gameTitle = event.gameType || 'Игра';
            }

            let resultText = '';
            if (event.result === 'win') {
                resultText = `🟢 **ПОБЕДА** +${event.amount?.toLocaleString() || '0'} экзпоинтов`;
            } else if (event.result === 'loss') {
                resultText = `🔴 **ПРОИГРЫШ** -${event.amount?.toLocaleString() || '0'} экзпоинтов`;
            } else if (event.result === 'draw') {
                resultText = `🟡 **НИЧЬЯ** ${event.amount ? `${event.amount.toLocaleString()} экзпоинтов` : ''}`;
            } else {
                resultText = event.result || 'Завершено';
            }

            fields.push({
                name: `${gameIcon} ${gameTitle} • ${timestamp}`,
                value: `${formatCode(resultText)}${event.details ? `\n${formatCode(event.details)}` : ''}`,
                inline: false
            });
        });
    }

    return createEmbed(`Игровая история ${username}`, fields);
}

/**
 * Создаёт embed для отображения недавних покупок в магазине
 * @param {Array} purchases - Массив покупок [{itemName, price, itemType, timestamp}]
 * @param {string} username - Имя пользователя
 * @returns {EmbedBuilder}
 */
function createRecentPurchasesEmbed(username, purchases) {
    const fields = [];

    if (purchases.length === 0) {
        fields.push({ name: 'История покупок', value: formatCode('Нет недавних покупок'), inline: false });
    } else {
        fields.push({ name: 'Магазин', value: formatCode(`Последние ${purchases.length} покупок`), inline: false });

        purchases.forEach((purchase, index) => {
            let itemIcon = '';
            let itemType = '';
            const timestamp = purchase.timestamp ?
                new Date(purchase.timestamp).toLocaleString('ru-RU') :
                'Недавно';

            switch (purchase.itemType) {
                case 'role':
                    itemIcon = '👑';
                    itemType = 'Роль';
                    break;
                case 'color':
                    itemIcon = '🎨';
                    itemType = 'Цвет роли';
                    break;
                case 'icon':
                    itemIcon = '🖼️';
                    itemType = 'Иконка роли';
                    break;
                case 'subscription':
                    itemIcon = '⭐';
                    itemType = 'Подписка';
                    break;
                case 'marriage':
                    itemIcon = '💍';
                    itemType = 'Брак';
                    break;
                case 'room':
                    itemIcon = '🎙️';
                    itemType = 'Комната';
                    break;
                default:
                    itemIcon = '📦';
                    itemType = purchase.itemType || 'Товар';
            }

            fields.push({
                name: `${itemIcon} ${purchase.itemName || itemType} • ${timestamp}`,
                value: `${formatCode(`${itemType}`)}\n💰 Стоимость: **${purchase.price?.toLocaleString() || '0'} экзпоинтов**`,
                inline: false
            });
        });
    }

    return createEmbed(`Покупки ${username}`, fields);
}

/**
 * Создаёт embed для отображения сводки недавних действий
 * @param {Object} summary - Объект со статистикой {totalTransactions, totalSpent, totalEarned, lastActivities}
 * @param {string} username - Имя пользователя
 * @returns {EmbedBuilder}
 */
function createActivitySummaryEmbed(username, summary) {
    const fields = [
        {
            name: '📊 Общая статистика',
            value: formatCode(`${summary.totalTransactions || 0} действий за всё время`),
            inline: false
        },
        {
            name: '💰 Финансы',
            value: `Заработано: **+${(summary.totalEarned || 0).toLocaleString()} экзпоинтов**\nПотрачено: **-${(summary.totalSpent || 0).toLocaleString()} экзпоинтов**`,
            inline: false
        }
    ];

    if (summary.lastActivities && summary.lastActivities.length > 0) {
        fields.push({ name: '⏱️ Последние действия', value: '', inline: false });

        summary.lastActivities.forEach((activity, index) => {
            if (index < 5) { // Ограничиваем показ до 5 последних действий
                let activityIcon = '';

                switch (activity.type) {
                    case 'casino': activityIcon = '🎰'; break;
                    case 'gift': activityIcon = '🎁'; break;
                    case 'transfer': activityIcon = '💸'; break;
                    case 'duel': activityIcon = '⚔️'; break;
                    case 'shop': activityIcon = '🛒'; break;
                    case 'daily': activityIcon = '📅'; break;
                    default: activityIcon = '📝';
                }

                const timeAgo = activity.timeAgo || 'Недавно';
                const amountSign = activity.amount >= 0 ? '+' : '-';

                fields.push({
                    name: `​`,
                    value: `${activityIcon} **${activity.title}** (${timeAgo})\n${amountSign}${Math.abs(activity.amount).toLocaleString()} экзпоинтов`,
                    inline: true
                });
            }
        });
    }

    fields.push({
        name: '📈 Баланс',
        value: formatCode(`Текущий баланс: **${summary.currentBalance?.toLocaleString() || '0'} экзпоинтов**`),
        inline: false
    });

    return createEmbed(`Статистика активности ${username}`, fields);
}

/**
 * Создаёт embed для отображения timeline активности
 * @param {Array} timelineEvents - Массив событий [{type, title, description, timestamp, icon}]
 * @param {string} username - Имя пользователя
 * @returns {EmbedBuilder}
 */
function createActivityTimelineEmbed(username, timelineEvents) {
    const fields = [];

    if (timelineEvents.length === 0) {
        fields.push({ name: 'Таймлайн', value: formatCode('Нет данных активности'), inline: false });
    } else {
        fields.push({ name: 'Хронология активности', value: formatCode(`Последние события`), inline: false });

        timelineEvents.forEach((event, index) => {
            const timestamp = event.timestamp ?
                new Date(event.timestamp).toLocaleString('ru-RU') :
                'Сегодня';

            let icon = event.icon || '📌';
            if (!event.icon) {
                switch (event.type) {
                    case 'transaction': icon = '💱'; break;
                    case 'game': icon = '🎮'; break;
                    case 'purchase': icon = '🛒'; break;
                    case 'achievement': icon = '🏆'; break;
                    case 'level': icon = '📈'; break;
                    default: icon = '📌';
                }
            }

            fields.push({
                name: `${icon} ${event.title} • ${timestamp}`,
                value: `${formatCode(event.description || 'Событие')}`,
                inline: false
            });
        });
    }

    return createEmbed(`Таймлайн ��ктивности ${username}`, fields);
}

module.exports = {
    createEmbed,
    createSuccessEmbed,
    createErrorEmbed,
    createWarningEmbed,
    createInfoEmbed,
    createProfileEmbed,
    createDailyEmbed,
    createCasinoEmbed,
    createGiftEmbed,
    createTransferEmbed,
    createDuelEmbed,
    createLotteryEmbed,
    createLotteryResultEmbed,
    createTaxEmbed,
    createRobberyEmbed,
    createRecentTransactionsEmbed,
    createRecentGameEventsEmbed,
    createRecentPurchasesEmbed,
    createActivitySummaryEmbed,
    createActivityTimelineEmbed,
    formatCode,
    EMBED_COLOR,
    BANNER_GIF_URL
};