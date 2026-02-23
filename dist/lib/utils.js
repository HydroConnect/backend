export function formatDate(date) {
    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}
export function getJam(date) {
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    })
        .format(date)
        .replace(":", ".");
}
export function getMidnightDate(date) {
    date.setUTCHours(0, 0, 0, 1);
    return date;
}
