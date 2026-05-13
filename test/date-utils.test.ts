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

  it("throws for invalid dates", () => {
    expect(() => nextBusinessDay("invalid-date")).toThrow(TypeError)
  })
})
