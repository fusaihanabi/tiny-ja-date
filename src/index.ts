export type DateInput = Date | string | number

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const
const ONE_DAY_MS = 86_400_000

function toValidDate(input: DateInput): Date {
  const date = input instanceof Date
    ? new Date(input.getTime())
    : new Date(input)

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid date")
  }

  return date
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
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
  const date = startOfLocalDay(toValidDate(input))
  const baseDate = startOfLocalDay(toValidDate(baseInput))

  const diffMs = date.getTime() - baseDate.getTime()
  const diffDays = Math.round(diffMs / ONE_DAY_MS)

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

export function nextBusinessDay(input: DateInput): Date {
  const date = startOfLocalDay(toValidDate(input))
  date.setDate(date.getDate() + 1)

  while (isWeekendJP(date)) {
    date.setDate(date.getDate() + 1)
  }

  return date
}
