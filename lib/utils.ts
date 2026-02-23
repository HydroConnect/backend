export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

export function getJam(date: Date): string {
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    })
        .format(date)
        .replace(":", ".");
}

export function getMidnightDate(date: Date): Date {
    date.setUTCHours(0, 0, 0, 1);
    return date;
}
