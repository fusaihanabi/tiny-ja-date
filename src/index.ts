export type DateInput = Date | string | number

export interface BusinessDayOptions {
  holidays?: readonly DateInput[]
}

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const
const ONE_DAY_MS = 86_400_000

function toValidDate(input: DateInput): Date {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
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

function localDayNumber(date: Date): number {
  const utcDay = new Date(0)
  utcDay.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate())
  return utcDay.getTime() / ONE_DAY_MS
}

export function formatJaDate(input: DateInput): string {
  const date = toValidDate(input)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = WEEKDAYS_JA[date.getDay()]

  return `${year}年${month}月${day}日（${weekday}）`
}

export function formatRelativeJaDate(
  input: DateInput,
  baseInput: DateInput = new Date(),
): string {
  const date = toValidDate(input)
  const baseDate = toValidDate(baseInput)
  const diffDays = localDayNumber(date) - localDayNumber(baseDate)

  if (diffDays === 0) return "今日"
  if (diffDays === -1) return "昨日"
  if (diffDays === 1) return "明日"
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`

  return `${diffDays}日後`
}

export function isWeekendJP(input: DateInput): boolean {
  const date = toValidDate(input)
  const day = date.getDay()

  return day === 0 || day === 6
}

export function nextBusinessDay(input: DateInput, options: BusinessDayOptions = {}): Date {
  const date = toValidDate(input)
  const holidays = new Set(options.holidays?.map((holiday) => localDayNumber(toValidDate(holiday))))

  date.setHours(0, 0, 0, 0)
  do {
    date.setDate(date.getDate() + 1)
    date.setHours(0, 0, 0, 0)
  } while (isWeekendJP(date) || holidays.has(localDayNumber(date)))

  return date
}
