import {
  addBusinessDays,
  countBusinessDays,
  createBusinessCalendar,
  formatIsoDate,
  formatJaDate,
  formatRelativeJaDate,
  isBusinessDay,
  isWeekendJP,
  iterateBusinessDays,
  listBusinessDays,
  nextBusinessDay,
  type BusinessCalendar,
  type BusinessDayOptions,
  type DateInput,
  type DateOptions,
} from "tiny-ja-date"

function expectEqual<T>(actual: T, expected: T): void {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${expected}, received ${actual}`)
}

const tokyo: DateOptions = { timeZone: "Asia/Tokyo" }
const instant: DateInput = "2026-11-23T15:30:00Z"
expectEqual(formatJaDate(instant, tokyo), "2026年11月24日（火）")
expectEqual(formatRelativeJaDate(instant, "2026-11-23", tokyo), "明日")
expectEqual(isWeekendJP("2026-11-21", tokyo), true)

const options: BusinessDayOptions = { ...tokyo, weekendDays: [0], holidays: ["2026-11-23"] }
const calendar: BusinessCalendar = createBusinessCalendar(options)
expectEqual(isBusinessDay("2026-11-23", options), false)
expectEqual(calendar.isBusinessDay("2026-11-21"), true)
expectEqual(nextBusinessDay("2026-11-20", options).toISOString(), "2026-11-20T15:00:00.000Z")
expectEqual(addBusinessDays("2026-11-20", 2, options).toISOString(), "2026-11-23T15:00:00.000Z")
expectEqual(countBusinessDays("2026-11-20", "2026-11-24", options), 2)

const dates: Date[] = listBusinessDays("2026-11-20", "2026-11-24", options)
const expected = "2026年11月20日（金）,2026年11月21日（土）,2026年11月24日（火）"
expectEqual(dates.map((date) => formatJaDate(date, tokyo)).join(","), expected)
expectEqual(calendar.listBusinessDays("2026-11-20", "2026-11-24")
  .map((date) => formatJaDate(date, tokyo)).join(","), expected)

const iterable: Generator<Date, void, unknown> = iterateBusinessDays("2026-11-20", "2026-11-24", options)
expectEqual([...iterable].map((date) => formatJaDate(date, tokyo)).join(","), expected)

const candidates: Date[] = []
for (const date of calendar.iterateBusinessDays("2026-11-20", "2026-12-31")) {
  candidates.push(date)
  if (candidates.length === 3) break
}
expectEqual(candidates.map((date) => formatJaDate(date, tokyo)).join(","), expected)

const exceptionOptions: BusinessDayOptions = { ...tokyo, workingDates: ["2026-11-21"] }
const exceptionCalendar: BusinessCalendar = createBusinessCalendar(exceptionOptions)
const next = exceptionCalendar.nextBusinessDay("2026-11-20")
expectEqual(next.toISOString(), "2026-11-20T15:00:00.000Z")
const isoDate: string = formatIsoDate(next, tokyo)
expectEqual(isoDate, "2026-11-21")
expectEqual(formatIsoDate(next, { timeZone: "America/Los_Angeles" }), "2026-11-20")
expectEqual(isBusinessDay("2026-11-21", { ...exceptionOptions, holidays: ["2026-11-21"] }), false)
