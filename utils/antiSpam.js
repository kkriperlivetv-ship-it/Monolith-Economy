const cooldowns = new Map();

function checkCooldown(userId, command, seconds = 5) {
    const key = `${userId}:${command}`;
    const now = Date.now();
    const cooldown = cooldowns.get(key);
    
    if (cooldown && now < cooldown) {
        return { allowed: false, remaining: Math.ceil((cooldown - now) / 1000) };
    }
    
    cooldowns.set(key, now + seconds * 1000);
    return { allowed: true };
}

module.exports = { checkCooldown };