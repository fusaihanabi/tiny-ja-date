export type DateInput = Date | string | number

export interface DateOptions {
  timeZone?: string
}

export interface BusinessDayOptions extends DateOptions {
  holidays?: readonly DateInput[]
  weekendDays?: readonly number[]
}

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const
const DEFAULT_WEEKEND_DAYS: ReadonlySet<number> = new Set([0, 6])
const ONE_DAY_MS = 86_400_000
const MAX_DATE_MS = 8_640_000_000_000_000
const GREGORIAN_CYCLE_MS = 146_097 * ONE_DAY_MS
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const OFFSET_DATE_TIME = /^((?:\d{4}|[+-]\d{6}))-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i

function toValidDate(input: DateInput): Date {
  if (typeof input === "string" && DATE_ONLY.test(input)) {
    const [year, month, day] = input.split("-").map(Number)
    const date = new Date(0)
    date.setHours(0, 0, 0, 0)
    date.setFullYear(year, month - 1, day)

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new TypeError("Invalid date")
    }

    return date
  }

  const date = input instanceof Date
    ? new Date(input.getTime())
    : new Date(input)

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid date")
  }

  return date
}

function utcDay(year: number, month: number, day: number): number {
  const date = new Date(0)
  // A zone can project an instant near the Date limit into an adjacent day.
  const cycles = Math.floor((year - 2000) / 400)
  return date.setUTCFullYear(year - cycles * 400, month - 1, day) + cycles * GREGORIAN_CYCLE_MS
}

function checkedUtcDay(year: number, month: number, day: number): number {
  const value = utcDay(year, month, day)
  const date = utcDateParts(value)
  if (date.year !== year || date.month !== month || date.day !== day) {
    throw new TypeError("Invalid date")
  }
  return value
}

function dateOnlyDay(input: DateInput): number | undefined {
  if (typeof input !== "string" || !DATE_ONLY.test(input)) return undefined

  const [year, month, day] = input.split("-").map(Number)
  return checkedUtcDay(year, month, day)
}

function utcDateParts(day: number) {
  const cycles = Math.floor(day / GREGORIAN_CYCLE_MS)
  const date = new Date(day - cycles * GREGORIAN_CYCLE_MS)
  return {
    year: date.getUTCFullYear() + cycles * 400,
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function createFormatter(timeZone: string | undefined): Intl.DateTimeFormat | undefined {
  if (timeZone === undefined) return undefined
  if (/^[+-]/.test(timeZone)) throw new RangeError("Expected an IANA time zone name")

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
  })
}

// Express the zoned wall clock on the UTC timeline for offset and day arithmetic.
function wallTime(instant: number, formatter: Intl.DateTimeFormat): number {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instant))
    .map(({ type, value }) => [type, value]))
  const year = Number(parts.year)
  const day = utcDay(parts.era === "BC" ? 1 - year : year, Number(parts.month), Number(parts.day))
  return day + (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000
}

function calendarDay(input: DateInput, formatter: Intl.DateTimeFormat | undefined): number {
  if (!formatter) {
    const date = toValidDate(input)
    return utcDay(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }

  if (typeof input === "string") {
    const day = dateOnlyDay(input)
    if (day !== undefined) return day

    const match = OFFSET_DATE_TIME.exec(input)
    if (!match) throw new TypeError("Expected YYYY-MM-DD or an ISO date-time with an offset")
    checkedUtcDay(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  const time = wallTime(toValidDate(input).getTime(), formatter)
  return Math.floor(time / ONE_DAY_MS) * ONE_DAY_MS
}

function zonedDayStart(day: number, formatter: Intl.DateTimeFormat): Date | undefined {
  const first = Math.max(-MAX_DATE_MS, day - ONE_DAY_MS * 2)
  const last = Math.min(MAX_DATE_MS, day + ONE_DAY_MS * 2)
  const offsets = new Set<number>()
  let earliest = Infinity
  let previous = first
  let previousWall = wallTime(first, formatter)
  if (previousWall >= day && previousWall < day + ONE_DAY_MS) earliest = first

  // Inspect offsets on both sides of midnight to handle repeated wall times.
  for (let instant = first; ; instant = Math.min(instant + ONE_DAY_MS / 4, last)) {
    const wall = wallTime(instant, formatter)
    offsets.add(wall - instant)

    // A forward jump can begin the date after midnight or skip the whole date.
    if (previousWall < day && wall >= day) {
      let before = previous
      let after = instant
      while (after - before > 1000) {
        const middle = Math.floor((before + after) / 2000) * 1000
        if (wallTime(middle, formatter) < day) before = middle
        else after = middle
      }
      if (wallTime(after, formatter) < day + ONE_DAY_MS) earliest = Math.min(earliest, after)
    }

    if (instant === last) break
    previous = instant
    previousWall = wall
  }

  for (const offset of offsets) {
    const instant = day - offset
    if (Math.abs(instant) <= MAX_DATE_MS && wallTime(instant, formatter) === day) {
      earliest = Math.min(earliest, instant)
    }
  }

  return Number.isFinite(earliest) ? new Date(earliest) : undefined
}

function weekdayOf(day: number): number {
  const weekday = (day / ONE_DAY_MS + 4) % 7
  return (weekday + 7) % 7
}

interface BusinessCalendar {
  holidays: ReadonlySet<number>
  weekendDays: ReadonlySet<number>
}

function weekendDaySet(input: readonly number[] | undefined): ReadonlySet<number> {
  if (input === undefined) return DEFAULT_WEEKEND_DAYS
  if (!Array.isArray(input)) throw new TypeError("Expected a weekendDays array")

  const days = new Set<number>()
  for (const day of input) {
    if (!Number.isInteger(day) || day < 0 || day >= WEEKDAYS_JA.length) {
      throw new RangeError("Expected a weekend day from 0 to 6")
    }
    days.add(day)
  }
  return days
}

function businessCalendar(
  options: BusinessDayOptions,
  formatter: Intl.DateTimeFormat | undefined,
): BusinessCalendar {
  return {
    holidays: new Set(options.holidays?.map((holiday) => calendarDay(holiday, formatter))),
    weekendDays: weekendDaySet(options.weekendDays),
  }
}

function dayStart(day: number, formatter: Intl.DateTimeFormat | undefined): Date | undefined {
  if (formatter) return zonedDayStart(day, formatter)

  const { year, month, day: dayOfMonth } = utcDateParts(day)
  const local = new Date(0)
  local.setHours(0, 0, 0, 0)
  local.setFullYear(year, month - 1, dayOfMonth)
  return local.getDate() === dayOfMonth ? local : undefined
}

function businessDayStart(
  candidate: number,
  calendar: BusinessCalendar,
  formatter: Intl.DateTimeFormat | undefined,
): Date | undefined {
  if (calendar.weekendDays.has(weekdayOf(candidate)) || calendar.holidays.has(candidate)) return undefined
  return dayStart(candidate, formatter)
}

export function formatJaDate(input: DateInput, options: DateOptions = {}): string {
  const formatter = createFormatter(options.timeZone)
  const date = calendarDay(input, formatter)
  const { year, month, day } = utcDateParts(date)
  const weekday = WEEKDAYS_JA[weekdayOf(date)]

  return `${year}年${month}月${day}日（${weekday}）`
}

export function formatRelativeJaDate(
  input: DateInput,
  baseInput: DateInput = new Date(),
  options: DateOptions = {},
): string {
  const formatter = createFormatter(options.timeZone)
  const diffDays = (calendarDay(input, formatter) - calendarDay(baseInput, formatter)) / ONE_DAY_MS

  if (diffDays === 0) return "今日"
  if (diffDays === -1) return "昨日"
  if (diffDays === 1) return "明日"
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`

  return `${diffDays}日後`
}

export function isWeekendJP(input: DateInput, options: DateOptions = {}): boolean {
  const day = calendarDay(input, createFormatter(options.timeZone))
  return DEFAULT_WEEKEND_DAYS.has(weekdayOf(day))
}

export function isBusinessDay(input: DateInput, options: BusinessDayOptions = {}): boolean {
  const formatter = createFormatter(options.timeZone)
  const day = dateOnlyDay(input) ?? calendarDay(input, formatter)
  const calendar = businessCalendar(options, formatter)
  return businessDayStart(day, calendar, formatter) !== undefined
}

export function addBusinessDays(input: DateInput, amount: number, options: BusinessDayOptions = {}): Date {
  if (!Number.isSafeInteger(amount)) throw new RangeError("Expected a safe integer business-day amount")

  const formatter = createFormatter(options.timeZone)
  const day = calendarDay(input, formatter)
  const calendar = businessCalendar(options, formatter)

  if (amount === 0) {
    const start = dayStart(day, formatter)
    if (!start) throw new TypeError("Invalid date")
    return start
  }

  if (calendar.weekendDays.size === WEEKDAYS_JA.length) throw new TypeError("No business days")

  const direction = Math.sign(amount)
  const step = direction * ONE_DAY_MS
  // A local calendar date can extend one day beyond the UTC Date limits.
  const limit = MAX_DATE_MS + ONE_DAY_MS
  let remaining = Math.abs(amount)
  if (remaining > (limit - direction * day) / ONE_DAY_MS) throw new TypeError("Invalid date")

  for (let candidate = day + step; Math.abs(candidate) <= limit; candidate += step) {
    const start = businessDayStart(candidate, calendar, formatter)
    if (!start) continue

    remaining -= 1
    if (remaining === 0) return start
  }

  throw new TypeError("Invalid date")
}

export function nextBusinessDay(input: DateInput, options: BusinessDayOptions = {}): Date {
  return addBusinessDays(input, 1, options)
}

export function countBusinessDays(from: DateInput, to: DateInput, options: BusinessDayOptions = {}): number {
  const formatter = createFormatter(options.timeZone)
  const start = dateOnlyDay(from) ?? calendarDay(from, formatter)
  const end = dateOnlyDay(to) ?? calendarDay(to, formatter)
  const calendar = businessCalendar(options, formatter)
  if (calendar.weekendDays.size === WEEKDAYS_JA.length) return 0

  const direction = Math.sign(end - start)
  const step = direction * ONE_DAY_MS
  let count = 0
  let day = start

  while (day !== end) {
    day += step
    if (businessDayStart(day, calendar, formatter)) count += direction
  }

  return count
}
