export const asNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const asOptionalDate = (value: unknown) => {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
};

export const asRequiredDate = (value: unknown, fieldName: string) => {
    const date = asOptionalDate(value);
    if (!date) {
        throw new Error(`${fieldName} is required`);
    }
    return date;
};

export const requireNonEmptyString = (value: unknown, fieldName: string) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${fieldName} is required`);
    }
    return value.trim();
};
