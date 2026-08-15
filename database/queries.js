const { getDb } = require('../database');

async function getUser(userId) {
    const db = getDb();
    let user = await db.get('SELECT * FROM users WHERE user_id = ?', userId);
    if (!user) {
        await db.run('INSERT INTO users (user_id) VALUES (?)', userId);
        user = await db.get('SELECT * FROM users WHERE user_id = ?', userId);
    }
    return user;
}

async function updateBalance(userId, amount) {
    const db = getDb();
    const user = await getUser(userId);
    const newBalance = user.balance + amount;
    if (newBalance < 0) return false;
    await db.run('UPDATE users SET balance = ? WHERE user_id = ?', newBalance, userId);
    return true;
}

async function addTransaction(fromUser, toUser, amount, type, commission = 0) {
    const db = getDb();
    await db.run(
        'INSERT INTO transactions (from_user, to_user, amount, type, commission) VALUES (?, ?, ?, ?, ?)',
        fromUser, toUser, amount, type, commission
    );
}

module.exports = { getUser, updateBalance, addTransaction };