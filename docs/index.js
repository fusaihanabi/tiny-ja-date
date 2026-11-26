const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const DEFAULT_WEEKEND_DAYS = new Set([0, 6]);
const ONE_DAY_MS = 86400000;
const MAX_DATE_MS = 8640000000000000;
const GREGORIAN_CYCLE_MS = 146097 * ONE_DAY_MS;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET_DATE_TIME = /^((?:\d{4}|[+-]\d{6}))-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
function toValidDate(input) {
    if (typeof input === "string" && DATE_ONLY.test(input)) {
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
function utcDay(year, month, day) {
    const date = new Date(0);
    // A zone can project an instant near the Date limit into an adjacent day.
    const cycles = Math.floor((year - 2000) / 400);
    return date.setUTCFullYear(year - cycles * 400, month - 1, day) + cycles * GREGORIAN_CYCLE_MS;
}
function checkedUtcDay(year, month, day) {
    const value = utcDay(year, month, day);
    const date = utcDateParts(value);
    if (date.year !== year || date.month !== month || date.day !== day) {
        throw new TypeError("Invalid date");
    }
    return value;
}
function dateOnlyDay(input) {
    if (typeof input !== "string" || !DATE_ONLY.test(input))
        return undefined;
    const [year, month, day] = input.split("-").map(Number);
    return checkedUtcDay(year, month, day);
}
function utcDateParts(day) {
    const cycles = Math.floor(day / GREGORIAN_CYCLE_MS);
    const date = new Date(day - cycles * GREGORIAN_CYCLE_MS);
    return {
        year: date.getUTCFullYear() + cycles * 400,
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    };
}
function createFormatter(timeZone) {
    if (timeZone === undefined)
        return undefined;
    if (/^[+-]/.test(timeZone))
        throw new RangeError("Expected an IANA time zone name");
    return new Intl.DateTimeFormat("en-US", {
        timeZone,
        calendar: "gregory",
        numberingSystem: "latn",
        era: "short",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hourCycle: "h23",
    });
}
// Express the zoned wall clock on the UTC timeline for offset and day arithmetic.
function wallTime(instant, formatter) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant))
        .map(({ type, value }) => [type, value]));
    const year = Number(parts.year);
    const day = utcDay(parts.era === "BC" ? 1 - year : year, Number(parts.month), Number(parts.day));
    return day + (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000;
}
function calendarDay(input, formatter) {
    if (!formatter) {
        const date = toValidDate(input);
        return utcDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
    if (typeof input === "string") {
        const day = dateOnlyDay(input);
        if (day !== undefined)
            return day;
        const match = OFFSET_DATE_TIME.exec(input);
        if (!match)
            throw new TypeError("Expected YYYY-MM-DD or an ISO date-time with an offset");
        checkedUtcDay(Number(match[1]), Number(match[2]), Number(match[3]));
    }
    const time = wallTime(toValidDate(input).getTime(), formatter);
    return Math.floor(time / ONE_DAY_MS) * ONE_DAY_MS;
}
function zonedDayStart(day, formatter) {
    const first = Math.max(-MAX_DATE_MS, day - ONE_DAY_MS * 2);
    const last = Math.min(MAX_DATE_MS, day + ONE_DAY_MS * 2);
    const offsets = new Set();
    let earliest = Infinity;
    let previous = first;
    let previousWall = wallTime(first, formatter);
    if (previousWall >= day && previousWall < day + ONE_DAY_MS)
        earliest = first;
    // Inspect offsets on both sides of midnight to handle repeated wall times.
    for (let instant = first;; instant = Math.min(instant + ONE_DAY_MS / 4, last)) {
        const wall = wallTime(instant, formatter);
        offsets.add(wall - instant);
        // A forward jump can begin the date after midnight or skip the whole date.
        if (previousWall < day && wall >= day) {
            let before = previous;
            let after = instant;
            while (after - before > 1000) {
                const middle = Math.floor((before + after) / 2000) * 1000;
                if (wallTime(middle, formatter) < day)
                    before = middle;
                else
                    after = middle;
            }
            if (wallTime(after, formatter) < day + ONE_DAY_MS)
                earliest = Math.min(earliest, after);
        }
        if (instant === last)
            break;
        previous = instant;
        previousWall = wall;
    }
    for (const offset of offsets) {
        const instant = day - offset;
        if (Math.abs(instant) <= MAX_DATE_MS && wallTime(instant, formatter) === day) {
            earliest = Math.min(earliest, instant);
        }
    }
    return Number.isFinite(earliest) ? new Date(earliest) : undefined;
}
function weekdayOf(day) {
    const weekday = (day / ONE_DAY_MS + 4) % 7;
    return (weekday + 7) % 7;
}
function weekendDaySet(input) {
    if (input === undefined)
        return DEFAULT_WEEKEND_DAYS;
    if (!Array.isArray(input))
        throw new TypeError("Expected a weekendDays array");
    const days = new Set();
    for (const day of input) {
        if (!Number.isInteger(day) || day < 0 || day >= WEEKDAYS_JA.length) {
            throw new RangeError("Expected a weekend day from 0 to 6");
        }
        days.add(day);
    }
    return days;
}
function businessDayRules(options, formatter) {
    return {
        holidays: new Set(options.holidays?.map((holiday) => calendarDay(holiday, formatter))),
        weekendDays: weekendDaySet(options.weekendDays),
        workingDates: workingDateSet(options.workingDates, formatter),
    };
}
function workingDateSet(input, formatter) {
    const dates = new Set();
    if (input === undefined)
        return dates;
    if (!Array.isArray(input))
        throw new TypeError("Expected a workingDates array");
    for (const date of input) {
        dates.add(calendarDay(date, formatter));
    }
    return dates;
}
function dayStart(day, formatter) {
    if (formatter)
        return zonedDayStart(day, formatter);
    const { year, month, day: dayOfMonth } = utcDateParts(day);
    const local = new Date(0);
    local.setHours(0, 0, 0, 0);
    local.setFullYear(year, month - 1, dayOfMonth);
    return local.getDate() === dayOfMonth ? local : undefined;
}
function checkedDayStart(day, formatter) {
    const start = dayStart(day, formatter);
    if (!start)
        throw new TypeError("Invalid date");
    return start;
}
function businessDayStart(candidate, rules, formatter) {
    if (rules.holidays.has(candidate))
        return undefined;
    if (rules.weekendDays.has(weekdayOf(candidate)) && !rules.workingDates.has(candidate))
        return undefined;
    return dayStart(candidate, formatter);
}
export function formatJaDate(input, options = {}) {
    const formatter = createFormatter(options.timeZone);
    const date = calendarDay(input, formatter);
    const { year, month, day } = utcDateParts(date);
    const weekday = WEEKDAYS_JA[weekdayOf(date)];
    return `${year}年${month}月${day}日（${weekday}）`;
}
export function formatIsoDate(input, options = {}) {
    const formatter = createFormatter(options.timeZone);
    const { year, month, day } = utcDateParts(calendarDay(input, formatter));
    if (year < 0 || year > 9999)
        throw new RangeError("Expected a year from 0000 to 9999");
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function startOfDay(input, options = {}) {
    const formatter = createFormatter(options.timeZone);
    return checkedDayStart(calendarDay(input, formatter), formatter);
}
export function formatRelativeJaDate(input, baseInput = new Date(), options = {}) {
    const formatter = createFormatter(options.timeZone);
    const diffDays = (calendarDay(input, formatter) - calendarDay(baseInput, formatter)) / ONE_DAY_MS;
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
export function isWeekendJP(input, options = {}) {
    const day = calendarDay(input, createFormatter(options.timeZone));
    return DEFAULT_WEEKEND_DAYS.has(weekdayOf(day));
}
export function isBusinessDay(input, options = {}) {
    const formatter = createFormatter(options.timeZone);
    const day = dateOnlyDay(input) ?? calendarDay(input, formatter);
    const rules = businessDayRules(options, formatter);
    return businessDayStart(day, rules, formatter) !== undefined;
}
function validateBusinessDayAmount(amount) {
    if (!Number.isSafeInteger(amount))
        throw new RangeError("Expected a safe integer business-day amount");
}
function moveBusinessDays(day, amount, rules, formatter) {
    if (amount === 0) {
        return checkedDayStart(day, formatter);
    }
    if (rules.weekendDays.size === WEEKDAYS_JA.length && rules.workingDates.size === 0) {
        throw new TypeError("No business days");
    }
    const direction = Math.sign(amount);
    const step = direction * ONE_DAY_MS;
    // A local calendar date can extend one day beyond the UTC Date limits.
    const limit = MAX_DATE_MS + ONE_DAY_MS;
    let remaining = Math.abs(amount);
    if (remaining > (limit - direction * day) / ONE_DAY_MS)
        throw new TypeError("Invalid date");
    for (const start of businessDaysBetween(day + step, direction * limit, rules, formatter)) {
        remaining -= 1;
        if (remaining === 0)
            return start;
    }
    throw new TypeError("Invalid date");
}
export function addBusinessDays(input, amount, options = {}) {
    validateBusinessDayAmount(amount);
    const formatter = createFormatter(options.timeZone);
    const day = calendarDay(input, formatter);
    return moveBusinessDays(day, amount, businessDayRules(options, formatter), formatter);
}
export function nextBusinessDay(input, options = {}) {
    return addBusinessDays(input, 1, options);
}
function countBusinessDaysBetween(start, end, rules, formatter) {
    if (start === end)
        return 0;
    const direction = Math.sign(end - start);
    const first = start + direction * ONE_DAY_MS;
    let count = 0;
    for (const _ of businessDaysBetween(first, end, rules, formatter)) {
        count += direction;
    }
    return count;
}
export function countBusinessDays(from, to, options = {}) {
    const formatter = createFormatter(options.timeZone);
    const start = dateOnlyDay(from) ?? calendarDay(from, formatter);
    const end = dateOnlyDay(to) ?? calendarDay(to, formatter);
    return countBusinessDaysBetween(start, end, businessDayRules(options, formatter), formatter);
}
function iterateBusinessDaysBetween(from, to, rules, formatter) {
    const start = dateOnlyDay(from) ?? calendarDay(from, formatter);
    const end = dateOnlyDay(to) ?? calendarDay(to, formatter);
    return businessDaysBetween(start, end, rules, formatter);
}
function* businessDaysBetween(start, end, rules, formatter) {
    const direction = start <= end ? 1 : -1;
    if (rules.weekendDays.size === WEEKDAYS_JA.length) {
        const candidates = [...rules.workingDates].sort((left, right) => direction * (left - right));
        for (const day of candidates) {
            if (direction * (day - start) < 0 || direction * (end - day) < 0)
                continue;
            const businessDay = businessDayStart(day, rules, formatter);
            if (businessDay)
                yield businessDay;
        }
        return;
    }
    const step = direction * ONE_DAY_MS;
    for (let day = start;; day += step) {
        const businessDay = businessDayStart(day, rules, formatter);
        if (businessDay)
            yield businessDay;
        if (day === end)
            return;
    }
}
export function iterateBusinessDays(from, to, options = {}) {
    const formatter = createFormatter(options.timeZone);
    return iterateBusinessDaysBetween(from, to, businessDayRules(options, formatter), formatter);
}
export function listBusinessDays(from, to, options = {}) {
    return Array.from(iterateBusinessDays(from, to, options));
}
export function createBusinessCalendar(options = {}) {
    const formatter = createFormatter(options.timeZone);
    const rules = businessDayRules(options, formatter);
    return {
        isBusinessDay(input) {
            const day = dateOnlyDay(input) ?? calendarDay(input, formatter);
            return businessDayStart(day, rules, formatter) !== undefined;
        },
        nextBusinessDay(input) {
            return moveBusinessDays(calendarDay(input, formatter), 1, rules, formatter);
        },
        addBusinessDays(input, amount) {
            validateBusinessDayAmount(amount);
            return moveBusinessDays(calendarDay(input, formatter), amount, rules, formatter);
        },
        countBusinessDays(from, to) {
            const start = dateOnlyDay(from) ?? calendarDay(from, formatter);
            const end = dateOnlyDay(to) ?? calendarDay(to, formatter);
            return countBusinessDaysBetween(start, end, rules, formatter);
        },
        listBusinessDays(from, to) {
            return Array.from(iterateBusinessDaysBetween(from, to, rules, formatter));
        },
        iterateBusinessDays(from, to) {
            return iterateBusinessDaysBetween(from, to, rules, formatter);
        },
    };
}
