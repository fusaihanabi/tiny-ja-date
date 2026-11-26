import { describe, expect, it, vi } from "vitest"
import {
  addBusinessDays,
  addCalendarDays,
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
  startOfDay,
} from "../src"

describe("createBusinessCalendar", () => {
  it("matches the standalone functions with custom weekends, holidays, and time zone", () => {
    const options = { timeZone: "Asia/Tokyo", weekendDays: [0], holidays: ["2026-11-23"] }
    const calendar = createBusinessCalendar(options)
    const input = "2026-11-20T15:30:00Z"

    expect(calendar.isBusinessDay(input)).toBe(isBusinessDay(input, options))
    expect(calendar.nextBusinessDay(input)).toEqual(nextBusinessDay(input, options))
    expect(calendar.addBusinessDays(input, -2)).toEqual(addBusinessDays(input, -2, options))
    expect(calendar.countBusinessDays(input, "2026-11-24"))
      .toBe(countBusinessDays(input, "2026-11-24", options))
  })

  it("uses local dates and the default weekend when options are omitted", () => {
    const calendar = createBusinessCalendar()

    expect(calendar.isBusinessDay("2026-11-21")).toBe(false)
    expect(calendar.nextBusinessDay("2026-11-20")).toEqual(new Date(2026, 10, 23))
    expect(calendar.addBusinessDays("2026-11-20T12:30:00", 0)).toEqual(new Date(2026, 10, 20))
    expect(calendar.countBusinessDays("2026-11-20", "2026-11-24")).toBe(2)
  })

  it("preserves the configured rules when the original options are edited", () => {
    const holiday = new Date("2026-11-23T04:00:00Z")
    const options = { timeZone: "Asia/Tokyo", weekendDays: [0], holidays: [holiday] }
    const { isBusinessDay } = createBusinessCalendar(options)

    holiday.setUTCDate(24)
    options.holidays.push(new Date("2026-11-25T04:00:00Z"))
    options.weekendDays.push(6)
    options.timeZone = "America/Los_Angeles"

    expect(isBusinessDay("2026-11-23")).toBe(false)
    expect(isBusinessDay("2026-11-24")).toBe(true)
    expect(isBusinessDay("2026-11-25")).toBe(true)
    expect(isBusinessDay("2026-11-21")).toBe(true)
    expect(isBusinessDay("2026-11-21T15:30:00Z")).toBe(false)
  })

  it("validates settings at creation and arguments when a method is called", () => {
    expect(() => createBusinessCalendar({ timeZone: "Invalid/Zone" })).toThrow(RangeError)
    expect(() => createBusinessCalendar({ weekendDays: [7] })).toThrow(RangeError)
    expect(() => createBusinessCalendar({ holidays: ["2026-02-30"] })).toThrow(TypeError)

    const calendar = createBusinessCalendar({ timeZone: "UTC" })
    expect(() => calendar.isBusinessDay("2026-02-30")).toThrow(TypeError)
    expect(() => calendar.nextBusinessDay("2026-02-30")).toThrow(TypeError)
    expect(() => calendar.addBusinessDays("2026-11-20", 1.5)).toThrow(RangeError)
    expect(() => calendar.countBusinessDays("2026-11-20", "2026-11-21T15:30:00")).toThrow(TypeError)
  })

  it("preserves full-week closure and day-zero behavior", () => {
    const calendar = createBusinessCalendar({ timeZone: "UTC", weekendDays: [0, 1, 2, 3, 4, 5, 6] })

    expect(calendar.isBusinessDay("2026-11-20")).toBe(false)
    expect(calendar.countBusinessDays("2026-11-20", "2026-11-24")).toBe(0)
    expect(() => calendar.nextBusinessDay("2026-11-20")).toThrow(TypeError)
    expect(() => calendar.addBusinessDays("2026-11-20", -1)).toThrow(TypeError)
    expect(calendar.addBusinessDays("2026-11-20", 0).toISOString()).toBe("2026-11-20T00:00:00.000Z")
  })
})

describe("workingDates", () => {
  const tokyo = { timeZone: "Asia/Tokyo" }
  const saturday = "2026-11-21"
  const saturdayStart = new Date("2026-11-20T15:00:00Z")
  const allWeekdays = [0, 1, 2, 3, 4, 5, 6]

  it("opens a normally closed day across the business-day APIs", () => {
    const options = { ...tokyo, workingDates: [saturday] }
    expect(isWeekendJP(saturday, options)).toBe(true)
    expect(isBusinessDay(saturday, options)).toBe(true)
    expect(nextBusinessDay("2026-11-20", options)).toEqual(saturdayStart)
    expect(addBusinessDays("2026-11-23", -1, options)).toEqual(saturdayStart)
    expect(countBusinessDays("2026-11-20", saturday, options)).toBe(1)
    expect(listBusinessDays(saturday, "2026-11-22", options)).toEqual([saturdayStart])
    expect([...iterateBusinessDays("2026-11-22", saturday, options)]).toEqual([saturdayStart])
  })

  it("gives a holiday priority over a working date", () => {
    const options = { ...tokyo, workingDates: [saturday], holidays: [saturdayStart] }
    expect(isBusinessDay(saturday, options)).toBe(false)
    expect(nextBusinessDay("2026-11-20", options)).toEqual(new Date("2026-11-22T15:00:00Z"))
    expect(countBusinessDays("2026-11-20", saturday, options)).toBe(0)
    expect(listBusinessDays(saturday, saturday, options)).toEqual([])
  })

  it("uses the selected zone to normalize working dates and ignores dates skipped entirely", () => {
    const workingDates = ["2026-11-20T15:00:00Z"]
    expect(isBusinessDay(saturday, { ...tokyo, workingDates })).toBe(true)
    expect(isBusinessDay(saturday, { timeZone: "America/Los_Angeles", workingDates })).toBe(false)
    const apia = {
      timeZone: "Pacific/Apia",
      weekendDays: allWeekdays,
      workingDates: ["2011-12-30"],
    }
    expect(isBusinessDay("2011-12-30", apia)).toBe(false)
    expect(listBusinessDays("2011-12-29", "2012-01-02", apia)).toEqual([])
    expect(() => nextBusinessDay("2011-12-29", apia)).toThrow(TypeError)
  })

  it("uses eligible exceptions in either direction when every weekday is closed", () => {
    const options = {
      ...tokyo,
      weekendDays: allWeekdays,
      workingDates: ["2026-11-24", saturday, "2026-11-23", saturdayStart, "2026-11-22"],
      holidays: ["2026-11-23"],
    }
    const tuesdayStart = new Date("2026-11-23T15:00:00Z")
    const sundayStart = new Date("2026-11-21T15:00:00Z")
    const calendar = createBusinessCalendar(options)
    expect(calendar.nextBusinessDay("2026-11-20")).toEqual(saturdayStart)
    expect(calendar.addBusinessDays("2026-11-20", 3)).toEqual(tuesdayStart)
    expect(calendar.addBusinessDays("2026-11-25", -2)).toEqual(sundayStart)
    expect(calendar.countBusinessDays("2000-01-01", "2100-01-01")).toBe(3)
    expect(calendar.countBusinessDays("2026-11-24", saturday)).toBe(-2)
    expect(calendar.listBusinessDays(saturday, "2026-11-24")).toEqual([saturdayStart, sundayStart, tuesdayStart])
    expect([...calendar.iterateBusinessDays("2026-11-24", "2026-11-22")]).toEqual([tuesdayStart, sundayStart])
    expect(() => calendar.nextBusinessDay("2026-11-24")).toThrow(TypeError)
    expect(() => calendar.addBusinessDays("2026-11-20", 4)).toThrow(TypeError)
    expect(calendar.addBusinessDays("2026-11-23", 0)).toEqual(new Date("2026-11-22T15:00:00Z"))
  })

  it("snapshots working date arrays and Date objects when creating a calendar", () => {
    const date = new Date(saturdayStart)
    const workingDates = [date]
    const calendar = createBusinessCalendar({ ...tokyo, workingDates })
    date.setUTCDate(21)
    workingDates.length = 0
    expect(calendar.isBusinessDay(saturday)).toBe(true)
    expect(calendar.isBusinessDay("2026-11-22")).toBe(false)
  })

  it("validates working dates eagerly even for moves or ranges of zero days", () => {
    const invalid = { ...tokyo, workingDates: ["2026-02-30"] }
    expect(() => createBusinessCalendar(invalid)).toThrow(TypeError)
    expect(() => addBusinessDays(saturday, 0, invalid)).toThrow(TypeError)
    expect(() => countBusinessDays(saturday, saturday, invalid)).toThrow(TypeError)
    expect(() => iterateBusinessDays(saturday, saturday, invalid)).toThrow(TypeError)
    expect(() => isBusinessDay(saturday, { workingDates: 0 as unknown as readonly number[] })).toThrow(TypeError)
  })
})

describe("weekendDays", () => {
  it("opens Saturdays and combines weekly closures with holidays across all business-day functions", () => {
    const options = { timeZone: "Asia/Tokyo", weekendDays: [0], holidays: ["2026-11-23"] }

    expect(isBusinessDay("2026-11-21", options)).toBe(true)
    expect(isWeekendJP("2026-11-21", options)).toBe(true)
    expect(isBusinessDay("2026-11-22", options)).toBe(false)
    expect(isBusinessDay("2026-11-23", options)).toBe(false)
    expect(nextBusinessDay("2026-11-20", options).toISOString()).toBe("2026-11-20T15:00:00.000Z")
    expect(addBusinessDays("2026-11-24", -1, options).toISOString()).toBe("2026-11-20T15:00:00.000Z")
    expect(countBusinessDays("2026-11-20", "2026-11-24", options)).toBe(2)
  })

  it("can close midweek and remove weekly closures entirely", () => {
    expect(isBusinessDay("2026-11-25", { weekendDays: [0, 3, 3] })).toBe(false)
    expect(nextBusinessDay("2026-11-24", { weekendDays: [0, 3] })).toEqual(new Date(2026, 10, 26))
    expect(isBusinessDay("2026-11-22", { weekendDays: [] })).toBe(true)
    expect(isBusinessDay("2026-11-22", { weekendDays: [], holidays: ["2026-11-22"] })).toBe(false)
  })

  it("handles a calendar with no business days", () => {
    const options = { timeZone: "Asia/Tokyo", weekendDays: [0, 1, 2, 3, 4, 5, 6] }

    expect(isBusinessDay("2026-11-24", options)).toBe(false)
    expect(countBusinessDays("2026-11-20", "2026-11-25", options)).toBe(0)
    expect(countBusinessDays("2026-11-25", "2026-11-20", options)).toBe(0)
    expect(() => nextBusinessDay("2026-11-20", options)).toThrow(TypeError)
    expect(() => addBusinessDays("2026-11-20", -1, options)).toThrow(TypeError)
    expect(addBusinessDays("2026-11-20", 0, options).toISOString()).toBe("2026-11-19T15:00:00.000Z")
    expect(() => countBusinessDays("2026-11-20", "2026-11-20", {
      ...options,
      holidays: ["2026-02-30"],
    })).toThrow(TypeError)
  })

  it("validates weekday options even for a zero move or same-date count", () => {
    for (const day of [-1, 7, 1.5, NaN, Infinity]) {
      expect(() => addBusinessDays("2026-11-20", 0, { weekendDays: [day] })).toThrow(RangeError)
      expect(() => countBusinessDays("2026-11-20", "2026-11-20", { weekendDays: [day] })).toThrow(RangeError)
    }
    const malformed = { weekendDays: 0 as unknown as readonly number[] }
    expect(() => isBusinessDay("2026-11-21", malformed)).toThrow(TypeError)
    expect(() => nextBusinessDay("2026-11-20", malformed)).toThrow(TypeError)
  })
})

describe("timeZone", () => {
  const tokyo = { timeZone: "Asia/Tokyo" }
  const losAngeles = { timeZone: "America/Los_Angeles" }

  it("projects an instant into the requested calendar date and weekday", () => {
    const instant = new Date("2026-11-20T15:30:00Z")
    expect(formatJaDate(instant, tokyo)).toBe("2026年11月21日（土）")
    expect(formatJaDate(instant.getTime(), losAngeles)).toBe("2026年11月20日（金）")
    expect(isWeekendJP(instant, tokyo)).toBe(true)
    expect(isWeekendJP(instant, losAngeles)).toBe(false)
  })

  it("keeps date-only inputs on the stated calendar date", () => {
    expect(formatJaDate("2026-11-24", tokyo)).toBe("2026年11月24日（火）")
    expect(formatJaDate("2026-11-24", losAngeles)).toBe("2026年11月24日（火）")
    expect(formatJaDate("0000-01-01", tokyo)).toBe("0年1月1日（土）")
    expect(() => formatJaDate("2026-02-30", tokyo)).toThrow(TypeError)
  })

  it("uses the requested time zone for both dates and the default base", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-11-23T15:30:00Z"))
      expect(formatRelativeJaDate("2026-11-24", undefined, tokyo)).toBe("今日")
      expect(formatRelativeJaDate("2026-11-24", undefined, losAngeles)).toBe("明日")
      expect(formatRelativeJaDate("2026-11-24", "2026-11-23T15:30:00Z", tokyo)).toBe("今日")
    } finally {
      vi.useRealTimers()
    }
  })

  it("counts calendar days across a daylight saving change", () => {
    expect(formatRelativeJaDate("2026-03-09T07:00:00Z", "2026-03-07T08:00:00Z", losAngeles))
      .toBe("2日後")
    expect(nextBusinessDay("2026-03-06", losAngeles).toISOString()).toBe("2026-03-09T07:00:00.000Z")
  })

  it("compares holidays in the requested zone and returns its day start", () => {
    expect(nextBusinessDay("2026-11-20", {
      ...tokyo,
      holidays: ["2026-11-22T15:00:00Z"],
    }).toISOString()).toBe("2026-11-23T15:00:00.000Z")
    expect(nextBusinessDay("2026-11-20", {
      ...losAngeles,
      holidays: ["2026-11-22T15:00:00Z"],
    }).toISOString()).toBe("2026-11-23T08:00:00.000Z")
  })

  it("returns the first valid time when a weekday starts after midnight", () => {
    expect(nextBusinessDay("1985-12-31", { timeZone: "Asia/Kathmandu" }).toISOString())
      .toBe("1985-12-31T18:30:00.000Z")
  })

  it("skips a weekday that does not exist in the selected zone", () => {
    expect(nextBusinessDay("2011-12-29", { timeZone: "Pacific/Apia" }).toISOString())
      .toBe("2012-01-01T10:00:00.000Z")
  })

  it("rejects unknown zones and invalid or ambiguous input strings", () => {
    expect(() => formatJaDate("2026-11-24", { timeZone: "Invalid/Zone" })).toThrow(RangeError)
    expect(() => formatJaDate("2026-11-24T00:30:00", tokyo)).toThrow(TypeError)
    expect(() => formatJaDate("2026-02-30T00:00:00Z", tokyo)).toThrow(TypeError)
    expect(() => nextBusinessDay("2026-11-20", {
      ...tokyo,
      holidays: ["2026-11-23T00:00:00"],
    })).toThrow(TypeError)
  })
})

describe("addCalendarDays", () => {
  const tokyo = { timeZone: "Asia/Tokyo" }

  it("moves in either direction across weekends and month or year boundaries", () => {
    expect(formatIsoDate(addCalendarDays("2026-11-20", 1, tokyo), tokyo)).toBe("2026-11-21")
    expect(formatIsoDate(addCalendarDays("2026-11-23", -1, tokyo), tokyo)).toBe("2026-11-22")
    expect(formatIsoDate(addCalendarDays("2024-02-28", 1, tokyo), tokyo)).toBe("2024-02-29")
    expect(formatIsoDate(addCalendarDays("2024-02-28", 2, tokyo), tokyo)).toBe("2024-03-01")
    expect(formatIsoDate(addCalendarDays("2026-01-01", -1, tokyo), tokyo)).toBe("2025-12-31")
  })

  it("uses the selected zone for the input instant and for the next day across daylight saving", () => {
    const options = { timeZone: "America/Los_Angeles" }
    const input = new Date("2026-03-08T08:00:00Z")
    expect(addCalendarDays(input, 1, options).toISOString()).toBe("2026-03-09T07:00:00.000Z")
    expect(addCalendarDays(input, 1, options).getTime() - input.getTime()).toBe(23 * 60 * 60 * 1000)
    expect(addCalendarDays("2026-03-09T00:00:00-07:00", -1, options)).toEqual(input)
    expect(addCalendarDays(input.getTime(), 1, options).toISOString()).toBe("2026-03-09T07:00:00.000Z")
  })

  it("matches startOfDay for zero and uses the runtime's local zone when omitted", () => {
    const input = new Date(2026, 10, 21, 18, 30)
    expect(addCalendarDays(input, 0, tokyo)).toEqual(startOfDay(input, tokyo))
    expect(addCalendarDays(input, -0)).toEqual(startOfDay(input))
    expect(addCalendarDays(input, 1)).toEqual(new Date(2026, 10, 22))
  })

  it("uses the first valid time when the target midnight is missing or repeated", () => {
    expect(addCalendarDays("1985-12-31", 1, { timeZone: "Asia/Kathmandu" }).toISOString())
      .toBe("1985-12-31T18:30:00.000Z")
    expect(addCalendarDays("2026-10-31", 1, { timeZone: "America/Havana" }).toISOString())
      .toBe("2026-11-01T04:00:00.000Z")
  })

  it("counts skipped dates and rejects a skipped destination", () => {
    const options = { timeZone: "Pacific/Apia" }
    expect(() => addCalendarDays("2011-12-29", 1, options)).toThrow(TypeError)
    expect(() => addCalendarDays("2011-12-31", -1, options)).toThrow(TypeError)
    expect(formatIsoDate(addCalendarDays("2011-12-29", 2, options), options)).toBe("2011-12-31")
    expect(formatIsoDate(addCalendarDays("2011-12-30", 1, options), options)).toBe("2011-12-31")
    expect(() => addCalendarDays("2011-12-30", 0, options)).toThrow(TypeError)
  })

  it("validates the amount, date, time zone, and Date range", () => {
    for (const amount of [0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => addCalendarDays("2026-11-20", amount, tokyo)).toThrow(RangeError)
    }
    const limit = 8_640_000_000_000_000
    const utc = { timeZone: "UTC" }
    expect(() => addCalendarDays(limit, 1, utc)).toThrow(TypeError)
    expect(() => addCalendarDays(-limit, -1, utc)).toThrow(TypeError)
    expect(() => addCalendarDays(-limit + 86_400_000, -1, { timeZone: "America/Los_Angeles" }))
      .toThrow(TypeError)
    expect(() => addCalendarDays("2026-11-20", Number.MAX_SAFE_INTEGER, utc)).toThrow(TypeError)
    expect(() => addCalendarDays("2026-02-30", 1, tokyo)).toThrow(TypeError)
    expect(() => addCalendarDays("2026-11-20", 1, { timeZone: "Invalid/Zone" })).toThrow(RangeError)
  })
})

describe("startOfDay", () => {
  const tokyo = { timeZone: "Asia/Tokyo" }

  it("finds the start of the calendar day in the selected time zone", () => {
    const instant = new Date("2026-11-20T15:30:00Z")
    expect(startOfDay(instant, tokyo).toISOString()).toBe("2026-11-20T15:00:00.000Z")
    expect(startOfDay(instant.getTime(), { timeZone: "America/Los_Angeles" }).toISOString())
      .toBe("2026-11-20T08:00:00.000Z")
    expect(instant.toISOString()).toBe("2026-11-20T15:30:00.000Z")
  })

  it("uses the runtime's local time zone when omitted", () => {
    const expected = new Date(2026, 10, 21)
    expect(startOfDay(new Date(2026, 10, 21, 18, 30))).toEqual(expected)
    expect(startOfDay("2026-11-21")).toEqual(expected)
  })

  it("matches a zero-day business move on weekends and holidays", () => {
    const options = { ...tokyo, holidays: ["2026-11-23"] }
    expect(startOfDay("2026-11-21", tokyo)).toEqual(addBusinessDays("2026-11-21", 0, options))
    expect(startOfDay("2026-11-23", tokyo)).toEqual(addBusinessDays("2026-11-23", 0, options))
  })

  it("returns the first valid time when midnight is skipped", () => {
    const options = { timeZone: "Asia/Kathmandu" }
    expect(startOfDay("1986-01-01", options).toISOString()).toBe("1985-12-31T18:30:00.000Z")
    expect(startOfDay("1986-01-01", options)).toEqual(addBusinessDays("1986-01-01", 0, options))
  })

  it("returns the earlier instant when midnight occurs twice", () => {
    const options = { timeZone: "America/Havana" }
    expect(startOfDay("2026-11-01", options).toISOString()).toBe("2026-11-01T04:00:00.000Z")
    expect(startOfDay("2026-11-01T00:00:00-05:00", options).toISOString())
      .toBe("2026-11-01T04:00:00.000Z")
  })

  it("rejects skipped days, invalid inputs, and invalid zones", () => {
    expect(() => startOfDay("2011-12-30", { timeZone: "Pacific/Apia" })).toThrow(TypeError)
    expect(() => startOfDay("2026-02-30", tokyo)).toThrow(TypeError)
    expect(() => startOfDay("2026-11-21T15:30:00", tokyo)).toThrow(TypeError)
    expect(() => startOfDay("2026-11-21", { timeZone: "Invalid/Zone" })).toThrow(RangeError)
  })
})

describe("formatIsoDate", () => {
  const tokyo = { timeZone: "Asia/Tokyo" }
  const utc = { timeZone: "UTC" }

  it("formats the calendar date of an instant in the selected time zone", () => {
    const next = nextBusinessDay("2026-11-20", { ...tokyo, workingDates: ["2026-11-21"] })
    expect(next.toISOString()).toBe("2026-11-20T15:00:00.000Z")
    expect(formatIsoDate(next, tokyo)).toBe("2026-11-21")
    expect(formatIsoDate(next.getTime(), { timeZone: "America/Los_Angeles" })).toBe("2026-11-20")
    expect(formatIsoDate("2026-11-21T00:00:00+09:00", tokyo)).toBe("2026-11-21")
  })

  it("preserves date-only input and pads years, months, and days", () => {
    expect(formatIsoDate("0099-01-02", tokyo)).toBe("0099-01-02")
    expect(formatIsoDate("2026-01-02", { timeZone: "America/Los_Angeles" })).toBe("2026-01-02")
    expect(formatIsoDate("2024-02-29")).toBe("2024-02-29")
  })

  it("uses local dates when no time zone is provided", () => {
    expect(formatIsoDate(new Date(2026, 0, 2, 23, 30))).toBe("2026-01-02")
    expect(formatIsoDate("2026-01-02T23:30:00")).toBe("2026-01-02")
  })

  it("checks the four-digit year after time zone conversion", () => {
    expect(formatIsoDate("0000-01-01T00:00:00Z", utc)).toBe("0000-01-01")
    expect(formatIsoDate("9999-12-31T23:59:59Z", utc)).toBe("9999-12-31")
    expect(() => formatIsoDate("9999-12-31T15:00:00Z", tokyo)).toThrow(RangeError)
    expect(() => formatIsoDate("0000-01-01T00:00:00Z", { timeZone: "America/Los_Angeles" }))
      .toThrow(RangeError)
  })

  it("rejects invalid dates, strings, and time zones", () => {
    expect(() => formatIsoDate(NaN)).toThrow(TypeError)
    expect(() => formatIsoDate("2026-02-29", tokyo)).toThrow(TypeError)
    expect(() => formatIsoDate("2026-01-02T03:04:00", tokyo)).toThrow(TypeError)
    expect(() => formatIsoDate("2026-01-02", { timeZone: "Invalid/Zone" })).toThrow(RangeError)
  })
})

describe("formatJaDate", () => {
  it("formats a date in Japanese style", () => {
    expect(formatJaDate(new Date(2026, 4, 12))).toBe("2026年5月12日（火）")
    expect(formatJaDate(new Date(2026, 4, 17))).toBe("2026年5月17日（日）")
  })

  it("accepts number inputs", () => {
    expect(formatJaDate(new Date(2026, 4, 12).getTime())).toBe("2026年5月12日（火）")
  })

  it("reads date-only strings as local calendar dates", () => {
    expect(formatJaDate("2026-05-12")).toBe("2026年5月12日（火）")
    expect(isWeekendJP("2026-05-17")).toBe(true)
  })

  it("interprets timestamps with offsets as instants", () => {
    expect(formatJaDate("2026-05-12T00:00:00+09:00")).toBe(
      formatJaDate(new Date(Date.UTC(2026, 4, 11, 15))),
    )
  })

  it("validates leap days and date-only strings that would roll over", () => {
    expect(formatJaDate("2024-02-29")).toBe("2024年2月29日（木）")
    expect(() => formatJaDate("2026-02-29")).toThrow(TypeError)
    expect(() => formatJaDate("2026-04-31")).toThrow(TypeError)
    expect(() => formatJaDate("2026-13-01")).toThrow(TypeError)
  })

  it("throws for invalid dates", () => {
    expect(() => formatJaDate("invalid-date")).toThrow(TypeError)
  })
})

describe("formatRelativeJaDate", () => {
  it("formats same-day dates", () => {
    expect(formatRelativeJaDate(new Date(2026, 4, 12), new Date(2026, 4, 12))).toBe("今日")
  })

  it("formats yesterday and tomorrow", () => {
    expect(formatRelativeJaDate(new Date(2026, 4, 11), new Date(2026, 4, 12))).toBe("昨日")
    expect(formatRelativeJaDate(new Date(2026, 4, 13), new Date(2026, 4, 12))).toBe("明日")
  })

  it("formats past and future dates", () => {
    expect(formatRelativeJaDate(new Date(2026, 4, 9), new Date(2026, 4, 12))).toBe("3日前")
    expect(formatRelativeJaDate(new Date(2026, 4, 15), new Date(2026, 4, 12))).toBe("3日後")
  })

  it("ignores time of day", () => {
    expect(
      formatRelativeJaDate(new Date(2026, 4, 12, 23, 59), new Date(2026, 4, 12, 0, 1)),
    ).toBe("今日")
  })

  it("counts calendar days across month, year, and daylight saving boundaries", () => {
    expect(formatRelativeJaDate("2024-03-01", "2024-02-28")).toBe("2日後")
    expect(formatRelativeJaDate("2026-01-01", "2025-12-31")).toBe("明日")
    expect(formatRelativeJaDate("2026-03-09", "2026-03-07")).toBe("2日後")
    expect(formatRelativeJaDate("0100-01-01", "0099-12-31")).toBe("明日")
  })

  it("throws for invalid dates", () => {
    expect(() => formatRelativeJaDate("invalid-date", new Date(2026, 4, 12))).toThrow(TypeError)
  })
})

describe("isWeekendJP", () => {
  it("returns true for Saturday and Sunday", () => {
    expect(isWeekendJP(new Date(2026, 4, 16))).toBe(true)
    expect(isWeekendJP(new Date(2026, 4, 17))).toBe(true)
  })

  it("returns false for weekdays", () => {
    expect(isWeekendJP(new Date(2026, 4, 18))).toBe(false)
  })

  it("throws for invalid dates", () => {
    expect(() => isWeekendJP("invalid-date")).toThrow(TypeError)
  })
})

describe("isBusinessDay", () => {
  it("accepts weekdays and rejects weekends and holidays", () => {
    const options = { holidays: ["2026-11-23"] }

    expect(isBusinessDay("2026-11-21")).toBe(false)
    expect(isBusinessDay("2026-11-22")).toBe(false)
    expect(isBusinessDay("2026-11-23", options)).toBe(false)
    expect(isBusinessDay("2026-11-24", options)).toBe(true)
  })

  it("uses the selected time zone for the input and holidays", () => {
    const instant = new Date("2026-11-20T15:30:00Z")
    const holiday = "2026-11-22T15:00:00Z"

    expect(isBusinessDay(instant, { timeZone: "Asia/Tokyo" })).toBe(false)
    expect(isBusinessDay(instant, { timeZone: "America/Los_Angeles" })).toBe(true)
    expect(isBusinessDay("2026-11-23", { timeZone: "Asia/Tokyo", holidays: [holiday] })).toBe(false)
    expect(isBusinessDay("2026-11-23", { timeZone: "America/Los_Angeles", holidays: [holiday] })).toBe(true)
  })

  it("accepts weekdays with missing midnight but rejects skipped weekdays", () => {
    expect(isBusinessDay("1986-01-01", { timeZone: "Asia/Kathmandu" })).toBe(true)
    expect(isBusinessDay("2011-12-30", { timeZone: "Pacific/Apia" })).toBe(false)
  })

  it("agrees with nextBusinessDay under the same options", () => {
    const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }
    expect(isBusinessDay(nextBusinessDay("2026-11-20", options), options)).toBe(true)
  })

  it("validates invalid dates, zones, and holidays even when the input is a weekend", () => {
    expect(() => isBusinessDay("2026-02-30")).toThrow(TypeError)
    expect(() => isBusinessDay("2026-11-21", { timeZone: "Invalid/Zone" })).toThrow(RangeError)
    expect(() => isBusinessDay("2026-11-21", { holidays: ["2026-02-30"] })).toThrow(TypeError)
  })
})

describe("addBusinessDays", () => {
  const tokyo = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

  it("counts weekdays forward and backward across weekends and holidays", () => {
    expect(addBusinessDays("2026-11-20", 2, tokyo).toISOString()).toBe("2026-11-24T15:00:00.000Z")
    expect(addBusinessDays("2026-11-24", -1, tokyo).toISOString()).toBe("2026-11-19T15:00:00.000Z")
    expect(addBusinessDays("2026-11-22", -1, tokyo).toISOString()).toBe("2026-11-19T15:00:00.000Z")
    expect(addBusinessDays("2026-11-21", 1, tokyo).toISOString()).toBe("2026-11-23T15:00:00.000Z")
  })

  it("returns the input date's start for zero even on a weekend or holiday", () => {
    expect(addBusinessDays("2026-11-21T12:00:00+09:00", 0, tokyo).toISOString())
      .toBe("2026-11-20T15:00:00.000Z")
    expect(addBusinessDays("2026-11-23", -0, tokyo).toISOString()).toBe("2026-11-22T15:00:00.000Z")
    expect(() => addBusinessDays("2026-11-23", 0, { holidays: ["2026-02-30"] })).toThrow(TypeError)
  })

  it("uses the first valid time and skips dates that never occur", () => {
    expect(addBusinessDays("1986-01-01", 0, { timeZone: "Asia/Kathmandu" }).toISOString())
      .toBe("1985-12-31T18:30:00.000Z")
    const apia = { timeZone: "Pacific/Apia" }
    expect(addBusinessDays("2012-01-02", -1, apia).toISOString()).toBe("2011-12-29T10:00:00.000Z")
    expect(() => addBusinessDays("2011-12-30", 0, apia)).toThrow(TypeError)
  })

  it("rejects amounts that are not safe integers", () => {
    for (const amount of [1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => addBusinessDays("2026-11-20", amount, tokyo)).toThrow(RangeError)
    }
  })

  it("rejects results beyond the Date range in either direction", () => {
    const utc = { timeZone: "UTC" }
    const limit = 8_640_000_000_000_000
    expect(() => addBusinessDays(limit, 1, utc)).toThrow(TypeError)
    expect(() => addBusinessDays(-limit, -1, utc)).toThrow(TypeError)
    expect(() => addBusinessDays("2026-11-20", Number.MAX_SAFE_INTEGER, utc)).toThrow(TypeError)
  })

  it("agrees with nextBusinessDay for an amount of one", () => {
    expect(addBusinessDays("2026-11-20", 1, tokyo)).toEqual(nextBusinessDay("2026-11-20", tokyo))
  })
})

describe("countBusinessDays", () => {
  const tokyo = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

  it("counts in both directions across weekends and holidays", () => {
    expect(countBusinessDays("2026-11-20", "2026-11-25", tokyo)).toBe(2)
    expect(countBusinessDays("2026-11-25", "2026-11-20", tokyo)).toBe(-2)
    expect(countBusinessDays("2026-11-20", "2026-11-23", tokyo)).toBe(0)
    expect(countBusinessDays("2026-11-23", "2026-11-20", tokyo)).toBe(-1)
  })

  it("excludes the origin and includes an eligible destination", () => {
    expect(countBusinessDays("2026-11-20", "2026-11-22")).toBe(0)
    expect(countBusinessDays("2026-11-22", "2026-11-20")).toBe(-1)
    expect(countBusinessDays("2026-11-22", "2026-11-21")).toBe(0)
  })

  it("validates both endpoints and holidays even when the count is zero", () => {
    expect(countBusinessDays("2026-11-24", "2026-11-23T15:30:00Z", tokyo)).toBe(0)
    expect(() => countBusinessDays("2026-02-30", "2026-11-24")).toThrow(TypeError)
    expect(() => countBusinessDays("2026-11-24", "2026-02-30")).toThrow(TypeError)
    expect(() => countBusinessDays("2026-11-24", "2026-11-24", { holidays: ["2026-02-30"] }))
      .toThrow(TypeError)
    expect(() => countBusinessDays("2026-11-24", "2026-11-24", { timeZone: "Invalid/Zone" }))
      .toThrow(RangeError)
  })

  it("counts in the selected zone across a daylight saving change", () => {
    const losAngeles = { timeZone: "America/Los_Angeles" }
    expect(countBusinessDays("2026-03-06T08:00:00Z", "2026-03-10T07:00:00Z", losAngeles)).toBe(2)
    expect(countBusinessDays("2026-03-10T07:00:00Z", "2026-03-06T08:00:00Z", losAngeles)).toBe(-2)
  })

  it("skips a missing date, including when it is the destination", () => {
    const apia = { timeZone: "Pacific/Apia" }
    expect(countBusinessDays("2011-12-29", "2012-01-02", apia)).toBe(1)
    expect(countBusinessDays("2012-01-02", "2011-12-29", apia)).toBe(-1)
    expect(countBusinessDays("2011-12-29", "2011-12-30", apia)).toBe(0)
  })

  it("recovers positive and negative amounts passed to addBusinessDays", () => {
    const from = "2026-11-22"
    for (const amount of [2, -2]) {
      expect(countBusinessDays(from, addBusinessDays(from, amount, tokyo), tokyo)).toBe(amount)
    }
  })
})

describe("listBusinessDays", () => {
  const options = { timeZone: "Asia/Tokyo", weekendDays: [0], holidays: ["2026-11-23"] }
  const expected = [
    new Date("2026-11-19T15:00:00Z"),
    new Date("2026-11-20T15:00:00Z"),
    new Date("2026-11-23T15:00:00Z"),
  ]

  it("includes both business-day endpoints and follows the requested direction", () => {
    expect(listBusinessDays("2026-11-20", "2026-11-24", options)).toEqual(expected)
    expect(listBusinessDays("2026-11-24", "2026-11-20", options)).toEqual([...expected].reverse())
    expect(listBusinessDays("2026-11-22", "2026-11-24", options)).toEqual(expected.slice(2))
  })

  it("lists a single date only when it is a business day", () => {
    expect(listBusinessDays("2026-11-21", "2026-11-20T15:30:00Z", options)).toEqual([expected[1]])
    expect(listBusinessDays("2026-11-23", "2026-11-23", options)).toEqual([])
    expect(listBusinessDays("2026-11-21", "2026-11-22")).toEqual([])
    expect(listBusinessDays("2026-11-20", "2026-11-20")).toEqual([new Date(2026, 10, 20)])
  })

  it("returns an empty list when all weekdays are closed and still validates both dates", () => {
    const closed = { weekendDays: [0, 1, 2, 3, 4, 5, 6] }
    expect(listBusinessDays("2026-11-20", "2026-11-24", closed)).toEqual([])
    expect(() => listBusinessDays("2026-02-30", "2026-11-24", closed)).toThrow(TypeError)
    expect(() => listBusinessDays("2026-11-20", "2026-02-30", closed)).toThrow(TypeError)
    expect(() => listBusinessDays("2026-11-21", "2026-11-22", { holidays: ["2026-02-30"] }))
      .toThrow(TypeError)
  })

  it("uses the first valid time and skips dates that never occur", () => {
    expect(listBusinessDays("1986-01-01", "1986-01-01", { timeZone: "Asia/Kathmandu" }))
      .toEqual([new Date("1985-12-31T18:30:00Z")])
    expect(listBusinessDays("2012-01-02", "2011-12-29", { timeZone: "Pacific/Apia" }))
      .toEqual([new Date("2012-01-01T10:00:00Z"), new Date("2011-12-29T10:00:00Z")])
  })

  it("returns fresh dates and arrays from the reusable calendar", () => {
    const calendar = createBusinessCalendar(options)
    const days = calendar.listBusinessDays("2026-11-20", "2026-11-24")
    expect(days).toEqual(expected)

    days[0].setUTCDate(1)
    days.pop()
    expect(calendar.listBusinessDays("2026-11-20", "2026-11-24")).toEqual(expected)
  })
})

describe("iterateBusinessDays", () => {
  const options = { timeZone: "Asia/Tokyo", weekendDays: [0], holidays: ["2026-11-23"] }

  it("yields the same days as the list in both directions", () => {
    const expected = [
      new Date("2026-11-19T15:00:00Z"),
      new Date("2026-11-20T15:00:00Z"),
      new Date("2026-11-23T15:00:00Z"),
    ]
    const calendar = createBusinessCalendar(options)
    expect([...iterateBusinessDays("2026-11-20", "2026-11-24", options)]).toEqual(expected)
    expect([...calendar.iterateBusinessDays("2026-11-24", "2026-11-20")]).toEqual([...expected].reverse())
    expect([...calendar.iterateBusinessDays("2026-11-24", "2026-11-20")])
      .toEqual(calendar.listBusinessDays("2026-11-24", "2026-11-20"))
  })

  it("includes equal endpoints only when open and yields nothing when all weekdays are closed", () => {
    expect([...iterateBusinessDays("2026-11-21", "2026-11-21", options)])
      .toEqual([new Date("2026-11-20T15:00:00Z")])
    expect([...iterateBusinessDays("2026-11-23", "2026-11-23", options)]).toEqual([])
    expect([...iterateBusinessDays("2026-11-20", "2026-11-24", {
      weekendDays: [0, 1, 2, 3, 4, 5, 6],
    })]).toEqual([])
  })

  it("validates endpoints and settings before the first read", () => {
    expect(() => iterateBusinessDays("2026-02-30", "2026-11-24", options)).toThrow(TypeError)
    expect(() => createBusinessCalendar(options).iterateBusinessDays("2026-11-20", "2026-02-30"))
      .toThrow(TypeError)
    expect(() => iterateBusinessDays("2026-11-20", "2026-11-20", { holidays: ["2026-02-30"] }))
      .toThrow(TypeError)
    expect(() => iterateBusinessDays("2026-11-20", "2026-11-20", { timeZone: "Invalid/Zone" }))
      .toThrow(RangeError)
  })

  it("starts searching on the first read and stops after a break", () => {
    const formatParts = vi.spyOn(Intl.DateTimeFormat.prototype, "formatToParts")
    try {
      const from = "2026-11-20"
      const iterator = iterateBusinessDays(from, "2026-12-31", options)
      expect(formatParts).not.toHaveBeenCalled()

      const received: Date[] = []
      for (const date of iterator) {
        received.push(date)
        break
      }
      expect(iterator.next().done).toBe(true)
      const probes = formatParts.mock.calls.length
      expect(probes).toBeGreaterThan(0)

      formatParts.mockClear()
      expect(received).toEqual(listBusinessDays(from, from, options))
      expect(formatParts).toHaveBeenCalledTimes(probes)
    } finally {
      formatParts.mockRestore()
    }
  })

  it("keeps iterators independent and returns fresh dates", () => {
    const calendar = createBusinessCalendar(options)
    const first = calendar.iterateBusinessDays("2026-11-20", "2026-11-24")
    const second = calendar.iterateBusinessDays("2026-11-20", "2026-11-24")
    const start = first.next().value
    expect(start).toEqual(new Date("2026-11-19T15:00:00Z"))
    if (start) start.setUTCDate(1)

    expect(second.next().value).toEqual(new Date("2026-11-19T15:00:00Z"))
    expect(first.next().value).toEqual(new Date("2026-11-20T15:00:00Z"))
  })
})

describe("nextBusinessDay", () => {
  it("returns the next weekday from a weekday", () => {
    expect(nextBusinessDay(new Date(2026, 4, 18))).toEqual(new Date(2026, 4, 19))
  })

  it("skips weekends", () => {
    expect(nextBusinessDay(new Date(2026, 4, 15))).toEqual(new Date(2026, 4, 18))
    expect(nextBusinessDay(new Date(2026, 4, 16))).toEqual(new Date(2026, 4, 18))
    expect(nextBusinessDay(new Date(2026, 4, 17))).toEqual(new Date(2026, 4, 18))
  })

  it("skips consecutive holidays, comparing their local dates", () => {
    const mondayEvening = new Date(2026, 4, 18, 22)
    expect(nextBusinessDay("2026-05-15", {
      holidays: ["2026-05-16", mondayEvening, "2026-05-19"],
    })).toEqual(new Date(2026, 4, 20))
  })

  it("skips holidays across a year boundary", () => {
    expect(nextBusinessDay("2026-12-31", { holidays: ["2027-01-01"] }))
      .toEqual(new Date(2027, 0, 4))
  })

  it("rejects an invalid holiday", () => {
    expect(() => nextBusinessDay("2026-05-15", { holidays: ["2026-02-30"] }))
      .toThrow(TypeError)
  })

  it("throws for invalid dates", () => {
    expect(() => nextBusinessDay("invalid-date")).toThrow(TypeError)
  })
})
