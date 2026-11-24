const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const ONE_DAY_MS = 86400000;
function toValidDate(input) {
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [year, month, day] = input.split("-").map(Number);
        const date = new Date(0);
        date.setHours(0, 0, 0, 0);
        date.setFullYear(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            throw new TypeError("Invalid date");
        }
        return date;
    }
    const date = input instanceof Date
        ? new Date(input.getTime())
        : new Date(input);
    if (Number.isNaN(date.getTime())) {
        throw new TypeError("Invalid date");
    }
    return date;
}
function localDayNumber(date) {
    const utcDay = new Date(0);
    utcDay.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return utcDay.getTime() / ONE_DAY_MS;
}
export function formatJaDate(input) {
    const date = toValidDate(input);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = WEEKDAYS_JA[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
}
export function formatRelativeJaDate(input, baseInput = new Date()) {
    const date = toValidDate(input);
    const baseDate = toValidDate(baseInput);
    const diffDays = localDayNumber(date) - localDayNumber(baseDate);
    if (diffDays === 0)
        return "今日";
    if (diffDays === -1)
        return "昨日";
    if (diffDays === 1)
        return "明日";
    if (diffDays < 0)
        return `${Math.abs(diffDays)}日前`;
    return `${diffDays}日後`;
}
export function isWeekendJP(input) {
    const date = toValidDate(input);
    const day = date.getDay();
    return day === 0 || day === 6;
}
export function nextBusinessDay(input, options = {}) {
    const date = toValidDate(input);
    const holidays = new Set(options.holidays?.map((holiday) => localDayNumber(toValidDate(holiday))));
    date.setHours(0, 0, 0, 0);
    do {
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
    } while (isWeekendJP(date) || holidays.has(localDayNumber(date)));
    return date;
}
