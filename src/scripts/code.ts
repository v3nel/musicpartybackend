export function generateSessionCode() {
    const num = Math.floor(Math.random() * 1000000);
    const code = num.toString().padStart(6, '0');
    return code;
}

export function normalizedSessionCode(code: string) {
    const normalized = code.trim();

    if (!/^\d{6}$/.test(normalized)) {
        throw new Error('Session code must contain exactly 6 digits');
    }

    return normalized;
}