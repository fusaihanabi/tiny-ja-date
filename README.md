# tiny-ja-date

Tiny TypeScript date utilities for Japanese UI.

- 日本語の日付表示
- 日本語の相対日付表示
- 土日判定
- 営業日判定
- 次の営業日計算
- 営業日数の加算・減算
- 2つの日付間の営業日数

## Install

```bash
npm install tiny-ja-date
```

## Usage

```ts
import {
  addBusinessDays,
  countBusinessDays,
  createBusinessCalendar,
  formatJaDate,
  formatRelativeJaDate,
  isBusinessDay,
  isWeekendJP,
  nextBusinessDay,
} from "tiny-ja-date"

formatJaDate(new Date(2026, 4, 12))
// "2026年5月12日（火）"

formatRelativeJaDate(new Date(2026, 4, 15), new Date(2026, 4, 12))
// "3日後"

isWeekendJP(new Date(2026, 4, 16))
// true

isBusinessDay("2026-05-18", { holidays: ["2026-05-18"] })
// false

nextBusinessDay(new Date(2026, 4, 15))
// Date for 2026-05-18

addBusinessDays("2026-05-15", 2)
// Date for 2026-05-19

countBusinessDays("2026-05-15", "2026-05-19")
// 2

const calendar = createBusinessCalendar({ timeZone: "Asia/Tokyo", weekendDays: [0] })
calendar.isBusinessDay("2026-11-21")
// true
```

## API

### `formatJaDate(date: DateInput, options?: DateOptions): string`

Formats a date as a Japanese date label.

```ts
formatJaDate(new Date(2026, 4, 12))
// "2026年5月12日（火）"
```

### `formatRelativeJaDate(date: DateInput, baseDate?: DateInput, options?: DateOptions): string`

Formats a date relative to a base date.

```ts
formatRelativeJaDate(new Date(2026, 4, 12), new Date(2026, 4, 12))
// "今日"

formatRelativeJaDate(new Date(2026, 4, 11), new Date(2026, 4, 12))
// "昨日"

formatRelativeJaDate(new Date(2026, 4, 13), new Date(2026, 4, 12))
// "明日"

formatRelativeJaDate(new Date(2026, 4, 9), new Date(2026, 4, 12))
// "3日前"

formatRelativeJaDate(new Date(2026, 4, 15), new Date(2026, 4, 12))
// "3日後"
```

### `isWeekendJP(date: DateInput, options?: DateOptions): boolean`

Checks whether the date is Saturday or Sunday, regardless of the weekly
closures used by the business-day functions.

```ts
isWeekendJP(new Date(2026, 4, 16))
// true
```

### `isBusinessDay(date: DateInput, options?: BusinessDayOptions): boolean`

Checks the input date itself in the selected time zone. Returns `false` for
weekly closures, dates in `options.holidays`, and dates skipped entirely by
the time zone. A date that starts after midnight can still be a business day.
Invalid holiday inputs throw a `TypeError`, even when the input falls on a
weekly closure.

```ts
const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

isBusinessDay("2026-11-23", options)
// false

isBusinessDay("2026-11-24", options)
// true
```

### `nextBusinessDay(date: DateInput, options?: BusinessDayOptions): Date`

Returns a `Date` for the start of the next business day in the selected time
zone. If midnight is skipped, the result is the first valid time on that date.
If a time zone skipped an entire date, the search continues to the following date.

The search starts the day after the input and skips weekly closures and dates
in `options.holidays`. Each holiday accepts the same `DateInput` type as the
input date.

```ts
nextBusinessDay(new Date(2026, 4, 15))
// Date for 2026-05-18

nextBusinessDay("2026-05-15", { holidays: ["2026-05-18"] })
// Date for 2026-05-19
```

### `addBusinessDays(date: DateInput, amount: number, options?: BusinessDayOptions): Date`

Counts forward for a positive amount and backward for a negative amount. Counting
starts the day after or before the input and skips weekly closures, dates in
`options.holidays`, and dates skipped entirely by the time zone.
`addBusinessDays(date, 1, options)` is equivalent to `nextBusinessDay(date, options)`.

Zero returns the start of the input date, including a weekend or holiday.
When midnight is skipped, the result is the first valid time on that date.
If the entire input date is skipped, zero throws a `TypeError`. Holiday inputs
are validated for every amount, including zero. An amount that is not a safe
integer throws a `RangeError`. A result beyond the `Date` range throws a `TypeError`.

```ts
const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

addBusinessDays("2026-11-20", 2, options)
// Start of 2026-11-25 in Tokyo

addBusinessDays("2026-11-24", -1, options)
// Start of 2026-11-20 in Tokyo
```

### `countBusinessDays(from: DateInput, to: DateInput, options?: BusinessDayOptions): number`

Counts from the day after or before `from` through `to` in the selected time
zone. The starting date is excluded, and the destination counts if it is a
business day. Counts are positive going forward and negative going backward.
The same calendar date or a range with no business days returns `0`.

Weekly closures, dates in `options.holidays`, and dates skipped entirely by the time
zone do not count. Both endpoints and all holiday inputs are validated even
when the result is `0`.

```ts
const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

countBusinessDays("2026-11-20", "2026-11-25", options) // 2
countBusinessDays("2026-11-25", "2026-11-20", options) // -2

countBusinessDays("2026-11-20", "2026-11-22", options) // 0
countBusinessDays("2026-11-22", "2026-11-20", options) // -1
```

### `createBusinessCalendar(options?: BusinessDayOptions): BusinessCalendar`

Creates a reusable calendar with `isBusinessDay(date)`, `nextBusinessDay(date)`,
`addBusinessDays(date, amount)`, and `countBusinessDays(from, to)` methods.
Each method follows the same rules as the standalone function. The factory
validates the time zone, weekend days, and holidays when creating the calendar.
Method arguments are validated on each call.

The calendar stores the rules as they were at creation. Editing the original
options, arrays, or holiday `Date` objects has no effect on an existing calendar.
Create a new calendar when the rules change. The default uses the runtime's
local time zone and closes Saturday and Sunday.

```ts
const calendar = createBusinessCalendar({
  timeZone: "Asia/Tokyo",
  weekendDays: [0],
  holidays: ["2026-11-23"],
})

calendar.isBusinessDay("2026-11-21") // true
calendar.countBusinessDays("2026-11-20", "2026-11-24") // 2
```

## Weekly closures

`isBusinessDay`, `nextBusinessDay`, `addBusinessDays`, and `countBusinessDays`
accept `weekendDays?: readonly number[]` in `BusinessDayOptions`. Use integers
from `0` (Sunday) through `6` (Saturday).

- Omitting `weekendDays` closes Saturday and Sunday, equivalent to `[0, 6]`.
- An explicit array replaces the default. An empty array clears all weekly
  closures. `holidays` still applies to individual dates.
- Duplicate weekdays count once. Values outside the integer range throw a
  `RangeError`. A non-array value throws a `TypeError`. Validation also applies
  to zero-day moves and same-date counts.
- Closing all seven days makes `isBusinessDay` return `false` and
  `countBusinessDays` return `0`. `nextBusinessDay` and nonzero
  `addBusinessDays` calls throw a `TypeError`. A zero-day move still returns the
  start of the input date.

```ts
const options = {
  timeZone: "Asia/Tokyo",
  weekendDays: [0],
  holidays: ["2026-11-23"],
}

isBusinessDay("2026-11-21", options) // true (Saturday)
nextBusinessDay("2026-11-20", options) // Start of 2026-11-21 in Tokyo
countBusinessDays("2026-11-20", "2026-11-24", options) // 2 (Saturday and Tuesday)
```

## Time zones

All public functions accept an optional `timeZone` such as `"Asia/Tokyo"`.
When omitted, they keep the runtime-local behavior of 0.2. The runtime's
`Intl.DateTimeFormat` supplies the time zone rules. Unrecognized IANA names
throw a `RangeError`.

```ts
const tokyo = { timeZone: "Asia/Tokyo" }

formatJaDate("2026-11-23T15:30:00Z", tokyo)
// "2026年11月24日（火）"

formatRelativeJaDate("2026-11-24", undefined, tokyo)
// Relative to today's date in Tokyo

nextBusinessDay("2026-11-20", { ...tokyo, holidays: ["2026-11-23"] }).toISOString()
// "2026-11-23T15:00:00.000Z" (2026-11-24 at 00:00 in Tokyo)
```

## Date inputs

- `YYYY-MM-DD` strings represent calendar dates as written in the selected time
  zone. The runtime-local zone is used when no zone is specified.
  Invalid dates such as `2026-02-30` throw a `TypeError`.
- `Date` objects and Unix timestamps in milliseconds represent instants. The
  functions use the instant's date in the selected time zone.
- For strings with a time, use ISO 8601 with an explicit offset such as
  `2026-05-12T09:00:00+09:00` to identify an instant. With an explicit
  `timeZone`, date-time strings without an offset and other string formats
  throw a `TypeError`. Without `timeZone`, they follow JavaScript's `Date` parsing.

### Upgrading from 0.1

In 0.1, JavaScript parsed a bare `YYYY-MM-DD` string as midnight UTC. In 0.2,
it represents the local date as written. Pass an explicit UTC timestamp such
as `2026-05-12T00:00:00Z` to retain the 0.1 interpretation.

## Design policy

`tiny-ja-date` is intentionally small.

It does not:

- include Japanese holiday data
- format wareki
- generate calendars
- replace date-fns or dayjs

---

## Live Demo

Run `npm run build:demo` after changing the library source to refresh
`docs/index.js`, the compiled module used by the demo.

- Demo → `https://fusaihanabi.github.io/tiny-ja-date`
- npm → `https://www.npmjs.com/package/tiny-ja-date`
- GitHub → `https://github.com/fusaihanabi/tiny-ja-date`
- Official → `https://dl.fusai-hanabi.com`

---

## License

MIT
