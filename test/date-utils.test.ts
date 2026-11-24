import { describe, expect, it } from "vitest"
import {
  formatJaDate,
  formatRelativeJaDate,
  isWeekendJP,
  nextBusinessDay,
} from "../src"

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
