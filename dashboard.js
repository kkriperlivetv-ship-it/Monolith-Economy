const express = require('express');
const path = require('path');
const config = require('./config');
const { getDb } = require('./database');

function startDashboard(client, port = 3000) {
    const app = express();
    app.use(express.json());

    // API: Status
    app.get('/api/status', (req, res) => {
        const isReady = client && typeof client.isReady === 'function' ? client.isReady() : false;
        res.json({
            status: isReady ? 'online' : (process.env.TOKEN ? 'connecting' : 'token_required'),
            user: isReady && client.user ? client.user.tag : null,
            userId: isReady && client.user ? client.user.id : null,
            guildsCount: isReady && client.guilds ? client.guilds.cache.size : 0,
            uptime: isReady && client.uptime ? Math.floor(client.uptime / 1000) : 0,
            hasToken: Boolean(process.env.TOKEN),
            hasClientId: Boolean(process.env.CLIENT_ID),
            hasGuildId: Boolean(process.env.GUILD_ID),
            commandsLoaded: client && client.commands ? client.commands.size : 0
        });
    });

    // API: Stats
    app.get('/api/stats', async (req, res) => {
        try {
            const db = getDb();
            const totalUsersRow = await db.get('SELECT COUNT(*) as count, SUM(balance) as totalBalance, SUM(total_spent) as totalSpent, SUM(total_earned) as totalEarned FROM users');
            const totalTxRow = await db.get('SELECT COUNT(*) as count FROM transactions');
            const totalLotteryRow = await db.get('SELECT COUNT(*) as count FROM lottery_tickets');
            const totalMarriagesRow = await db.get('SELECT COUNT(*) as count FROM marriages');
            const totalSubsRow = await db.get('SELECT COUNT(*) as count FROM subscriptions WHERE expires_at > strftime("%s", "now")');

            res.json({
                totalUsers: totalUsersRow?.count || 0,
                circulatingBalance: totalUsersRow?.totalBalance || 0,
                totalSpent: totalUsersRow?.totalSpent || 0,
                totalEarned: totalUsersRow?.totalEarned || 0,
                totalTransactions: totalTxRow?.count || 0,
                activeLotteryTickets: totalLotteryRow?.count || 0,
                totalMarriages: totalMarriagesRow?.count || 0,
                activeSubscriptions: totalSubsRow?.count || 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // API: Users
    app.get('/api/users', async (req, res) => {
        try {
            const db = getDb();
            const users = await db.all('SELECT user_id, balance, total_spent, total_earned, total_won_duels, total_lost_duels, daily_streak, xp, total_messages, total_voice_minutes FROM users ORDER BY balance DESC LIMIT 50');
            res.json({ users });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // API: Commands
    app.get('/api/commands', (req, res) => {
        if (!client || !client.commands) {
            return res.json({ commands: [] });
        }
        const commands = Array.from(client.commands.values()).map(cmd => {
            const json = cmd.data ? (typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data) : { name: 'unknown' };
            return {
                name: json.name,
                description: json.description || 'Без описания',
                options: json.options || []
            };
        });
        res.json({ commands });
    });

    // API: Config
    app.get('/api/config', (req, res) => {
        res.json({
            economy: config.ECONOMY,
            activity: config.ACTIVITY,
            levels: config.LEVELS,
            roles: config.ROLES,
            marriage: config.MARRIAGE,
            channels: config.CHANNELS
        });
    });

    // Serve static assets and frontend
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`🌐 [AI Studio] Web dashboard running at http://0.0.0.0:${port}`);
    });

    return server;
}

module.exports = { startDashboard };
