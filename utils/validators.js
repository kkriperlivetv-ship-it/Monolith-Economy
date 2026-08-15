const badWords = ['мат', 'хуй', 'пизда', 'бля', 'ебан', 'залупа'];

function containsBadWords(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return badWords.some(word => lowerText.includes(word));
}

function validateRoleName(name) {
    if (!name) return true;
    if (name.length > 100) return false;
    if (containsBadWords(name)) return false;
    if (/[^a-zA-Zа-яА-Я0-9\s\-_\[\]()]/.test(name)) return false;
    return true;
}

function validateAmount(amount, min, max) {
    return amount >= min && amount <= max;
}

module.exports = { containsBadWords, validateRoleName, validateAmount };