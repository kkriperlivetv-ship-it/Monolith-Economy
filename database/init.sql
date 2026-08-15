-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 500,
    total_spent INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_won_duels INTEGER DEFAULT 0,
    total_lost_duels INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    last_daily INTEGER,
    daily_sent INTEGER DEFAULT 0,
    daily_received INTEGER DEFAULT 0,
    daily_gifts_sent INTEGER DEFAULT 0,
    daily_gifts_received INTEGER DEFAULT 0,
    last_robbery INTEGER,
    messages_today INTEGER DEFAULT 0,
    voice_minutes_today INTEGER DEFAULT 0,
    last_message_reset INTEGER,
    last_voice_reset INTEGER,
    total_messages INTEGER DEFAULT 0,
    total_voice_minutes INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Добавляем недостающие колонки (если их нет)
ALTER TABLE users ADD COLUMN total_voice_minutes INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN voice_minutes_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_voice_reset INTEGER;

-- Таблица достижений
CREATE TABLE IF NOT EXISTS achievements (
    user_id TEXT,
    achievement TEXT,
    claimed INTEGER DEFAULT 0,
    claimed_at INTEGER,
    PRIMARY KEY (user_id, achievement)
);

-- Таблица билетов лотереи
CREATE TABLE IF NOT EXISTS lottery_tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    draw_time INTEGER,
    bought_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Таблица ожидающих дуэлей
CREATE TABLE IF NOT EXISTS pending_duels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger TEXT,
    opponent TEXT,
    amount INTEGER,
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Таблица пользовательских ролей
CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    role_id TEXT,
    role_name TEXT,
    total_invested INTEGER DEFAULT 0,
    color_hex TEXT DEFAULT '#808080',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Таблица транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    amount INTEGER,
    type TEXT,
    commission INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Таблица подписок
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    channel_id TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Таблица ожидающих покупок
CREATE TABLE IF NOT EXISTS pending_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    price INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance);
CREATE INDEX IF NOT EXISTS idx_lottery_draw_time ON lottery_tickets(draw_time);
CREATE INDEX IF NOT EXISTS idx_duels_expires ON pending_duels(expires_at);