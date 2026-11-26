# tiny-ja-date

Tiny TypeScript date utilities for Japanese UI.

- 日本語の日付表示
- `YYYY-MM-DD` 形式の日付表示
- 指定日の開始時刻
- 暦日数の加算・減算
- 日本語の相対日付表示
- 土日判定
- 営業日判定
- 次の営業日計算
- 営業日数の加算・減算
- 2つの日付間の営業日数
- 期間内の営業日一覧
- 営業日を1件ずつ取得
- 臨時営業日の指定

## Install

```bash
npm install tiny-ja-date
```

The package provides an ES module and TypeScript declarations.
Version 1.5.0 was verified on Windows x64 with Node.js 26.13.1, npm 11.20.0,
and TypeScript 5.9.3. Time zone calculations use the runtime's
`Intl.DateTimeFormat` and its time zone data.

## Usage

```ts
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
  listBusinessDays,
  nextBusinessDay,
  startOfDay,
} from "tiny-ja-date"

formatJaDate(new Date(2026, 4, 12))
// "2026年5月12日（火）"

formatIsoDate(new Date(2026, 4, 12))
// "2026-05-12"

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

listBusinessDays("2026-05-15", "2026-05-19")
// Dates for 2026-05-15, 2026-05-18, and 2026-05-19

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

### `formatIsoDate(date: DateInput, options?: DateOptions): string`

Formats the calendar date in the selected time zone as `YYYY-MM-DD`, with
four digits for the year and two each for the month and day. It accepts the
same inputs as `formatJaDate` and defaults to the runtime's local time zone.
An invalid date throws a `TypeError`. An unsupported time zone or a
calendar year outside `0000`–`9999` throws a `RangeError`.

```ts
const tokyo = { timeZone: "Asia/Tokyo" }
const next = nextBusinessDay("2026-11-20", {
  ...tokyo,
  workingDates: ["2026-11-21"],
})

formatIsoDate(next, tokyo) // "2026-11-21"
formatIsoDate(next, { timeZone: "America/Los_Angeles" }) // "2026-11-20"
next.toISOString() // "2026-11-20T15:00:00.000Z"
```

### `startOfDay(date: DateInput, options?: DateOptions): Date`

Returns a `Date` for the first valid time on the selected calendar date,
including weekends and holidays. It accepts the same inputs as `formatIsoDate`
and defaults to the runtime's local time zone. When midnight is skipped, it
uses the first valid time that day. When midnight occurs twice, it uses the
earlier instant.

An invalid or entirely skipped date throws a `TypeError`. An unrecognized
time zone throws a `RangeError`.

```ts
const tokyo = { timeZone: "Asia/Tokyo" }
const selectedDate = "2026-11-21" // e.g. an HTML date input's value
const searchStart = startOfDay(selectedDate, tokyo)

searchStart.toISOString() // "2026-11-20T15:00:00.000Z"
formatIsoDate(searchStart, tokyo) // "2026-11-21"
```

### `addCalendarDays(date: DateInput, amount: number, options?: DateOptions): Date`

Moves forward for a positive amount and backward for a negative amount,
counting calendar dates in the selected time zone, including weekends and
holidays. The result is the first valid time on the destination date.
When midnight occurs twice, the earlier instant is used.
Passing zero is equivalent to `startOfDay(date, options)`.

A day skipped entirely by the time zone still occupies a position in the
calendar. A date-only string for such a day can serve as a reference for a
nonzero move. A skipped destination or result outside the `Date` range throws
a `TypeError`. An amount that is not a safe integer throws a `RangeError`.

```ts
const tokyo = { timeZone: "Asia/Tokyo" }

formatIsoDate(addCalendarDays("2026-11-20", 1, tokyo), tokyo) // "2026-11-21" (Saturday)
formatIsoDate(addCalendarDays("2026-01-01", -1, tokyo), tokyo) // "2025-12-31"

const apia = { timeZone: "Pacific/Apia" }
formatIsoDate(addCalendarDays("2011-12-29", 2, apia), apia) // "2011-12-31"
// An amount of 1 from December 29 throws a TypeError because December 30 was skipped.
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
dates closed by the [business-day rules](#working-date-exceptions) and dates
skipped entirely by the time zone. A date that starts after midnight can still be a business day.
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
Calling `toISOString()` on the result displays the instant in UTC.
Use `formatIsoDate(result, { timeZone })` to get the calendar date in the selected zone.

The search starts the day after the input and applies the
[business-day rules](#working-date-exceptions).

```ts
nextBusinessDay(new Date(2026, 4, 15))
// Date for 2026-05-18

nextBusinessDay("2026-05-15", { holidays: ["2026-05-18"] })
// Date for 2026-05-19
```

### `addBusinessDays(date: DateInput, amount: number, options?: BusinessDayOptions): Date`

Counts forward for a positive amount and backward for a negative amount. Counting
starts the day after or before the input and applies the
[business-day rules](#working-date-exceptions).
`addBusinessDays(date, 1, options)` is equivalent to `nextBusinessDay(date, options)`.

Zero returns the start of the input date, including a weekend or holiday.
It matches `startOfDay(date, { timeZone })` with the same time zone.
When midnight is skipped, the result is the first valid time on that date.
If the entire input date is skipped, zero throws a `TypeError`. Calendar options
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

The [business-day rules](#working-date-exceptions) apply throughout the range.
Both endpoints and calendar options are validated even when the result is `0`.

```ts
const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

countBusinessDays("2026-11-20", "2026-11-25", options) // 2
countBusinessDays("2026-11-25", "2026-11-20", options) // -2

countBusinessDays("2026-11-20", "2026-11-22", options) // 0
countBusinessDays("2026-11-22", "2026-11-20", options) // -1
```

### `listBusinessDays(from: DateInput, to: DateInput, options?: BusinessDayOptions): Date[]`

Lists business days from `from` through `to`, including either endpoint when it
is a business day. The dates appear in the requested direction. Equal endpoints
return one date if it is a business day, or an empty array otherwise.

The [business-day rules](#working-date-exceptions) apply throughout the range.
Each `Date` represents the day's first valid time in the selected time zone.
Each call returns a fresh array with fresh `Date` objects.

```ts
const options = {
  timeZone: "Asia/Tokyo",
  weekendDays: [0],
  holidays: ["2026-11-23"],
}

listBusinessDays("2026-11-20", "2026-11-24", options)
// Starts of November 20, 21, and 24 in Tokyo

listBusinessDays("2026-11-24", "2026-11-20", options)
// Starts of November 24, 21, and 20 in Tokyo

countBusinessDays("2026-11-20", "2026-11-24", options)
// 2, starting the count after November 20
```

### `iterateBusinessDays(from: DateInput, to: DateInput, options?: BusinessDayOptions): Generator<Date, void, unknown>`

Yields business days one at a time. The inclusive endpoints, direction, and
start-of-day values follow `listBusinessDays`. Endpoints and options are
validated when called. The search starts on the first read, and breaking
from a `for...of` loop stops the search. Each call creates an independent
iterator with fresh `Date` values.

```ts
const calendar = createBusinessCalendar({
  timeZone: "Asia/Tokyo",
  weekendDays: [0],
  holidays: ["2026-11-23"],
})

const candidates: Date[] = []
for (const day of calendar.iterateBusinessDays("2026-11-20", "2026-12-31")) {
  candidates.push(day)
  if (candidates.length === 3) break
}
// Starts of November 20, 21, and 24 in Tokyo
```

### `createBusinessCalendar(options?: BusinessDayOptions): BusinessCalendar`

Creates a reusable calendar with `isBusinessDay(date)`, `nextBusinessDay(date)`,
`addBusinessDays(date, amount)`, `countBusinessDays(from, to)`,
`listBusinessDays(from, to)`, and `iterateBusinessDays(from, to)` methods.
Each method follows the same rules as the standalone function. The factory
validates the time zone, weekend days, holidays, and working dates when creating the calendar.
Method arguments are validated on each call.

Custom implementations of the `BusinessCalendar` interface must also provide
`iterateBusinessDays` starting in 1.1.0.

The calendar stores the rules as they were at creation. Editing the original
options, arrays, or the `Date` objects they contain has no effect on an existing calendar.
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
calendar.listBusinessDays("2026-11-20", "2026-11-24")
// Starts of November 20, 21, and 24 in Tokyo
```

## Weekly closures

`isBusinessDay`, `nextBusinessDay`, `addBusinessDays`, `countBusinessDays`,
`listBusinessDays`, and `iterateBusinessDays` accept `weekendDays?: readonly number[]`
in `BusinessDayOptions`. Use integers from `0` (Sunday) through `6` (Saturday).

- Omitting `weekendDays` closes Saturday and Sunday, equivalent to `[0, 6]`.
- An explicit array replaces the default. An empty array clears all weekly
  closures. `holidays` still applies to individual dates.
- Duplicate weekdays count once. Values outside the integer range throw a
  `RangeError`. A non-array value throws a `TypeError`. Validation also applies
  to zero-day moves and same-date counts.
- Closing all seven days leaves only eligible dates from `workingDates`.
  `nextBusinessDay` and nonzero `addBusinessDays` calls throw a `TypeError`
  when there is no reachable business day. A zero-day move returns the start
  of the input date.

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

## Working date exceptions

The business-day functions and calendar methods accept
`workingDates?: readonly DateInput[]` in `BusinessDayOptions`.
Both `workingDates` and `holidays` use the selected time zone and the same
date input rules. Multiple entries for the same calendar date count once.

A date skipped entirely by the time zone is closed. For dates that exist,
the first matching rule applies.

1. A date in `holidays` is closed.
2. A date in `workingDates` is open.
3. A weekday in `weekendDays` is closed.
4. Every other date is open.

```ts
const options = { timeZone: "Asia/Tokyo", workingDates: ["2026-11-21"] }

isBusinessDay("2026-11-21", options) // true (Saturday opening)
nextBusinessDay("2026-11-20", options).toISOString() // "2026-11-20T15:00:00.000Z"
isBusinessDay("2026-11-21", { ...options, holidays: ["2026-11-21"] }) // false
```

## Time zones

All public functions accept an optional `timeZone` such as `"Asia/Tokyo"`.
The selected zone applies to input dates, base dates, range endpoints,
holidays, and working dates. Omitting it uses the runtime's local time zone. Unrecognized IANA
names throw a `RangeError`.

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

| Input | Interpretation |
| --- | --- |
| `"2026-11-24"` | The calendar date as written in the selected zone. |
| A `Date`, a Unix timestamp in milliseconds, or `"2026-11-23T15:30:00Z"` | An instant. The functions use its calendar date in the selected zone. |
| `"2026-11-24T00:30:00"` or other string formats | Follows JavaScript's `Date` parsing when `timeZone` is omitted. With an explicit `timeZone`, these inputs throw a `TypeError`. |

An invalid calendar date such as `2026-02-30` throws a `TypeError`.
When time matters, use ISO 8601 with `Z` or a numeric offset such as `+09:00`.

### Upgrading from 0.1

In 0.1, JavaScript parsed a bare `YYYY-MM-DD` string as midnight UTC. In 0.2,
it represents the local date as written. Pass an explicit UTC timestamp such
as `2026-05-12T00:00:00Z` to retain the 0.1 interpretation.

## Design policy

`tiny-ja-date` focuses on Japanese date labels and business-day calculations.
Supply organization-specific holidays through `holidays`.

---

## Live Demo

Run `npm run build:demo` after changing the library source to refresh
`docs/index.js`, the compiled module used by the demo.

- Demo → `https://fusaihanabi.github.io/tiny-ja-date`
- npm → `https://www.npmjs.com/package/tiny-ja-date`
- GitHub → `https://github.com/fusaihanabi/tiny-ja-date`
- Official → `https://dl.fusai-hanabi.com`

## Release checks

With the development dependencies installed, run the tests. In PowerShell,
the following checks both runtime-local behavior and explicit time zones
using each of the three runtime defaults.

```powershell
foreach ($zone in @('Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Apia')) {
  $env:TZ = $zone
  npm test -- --run
  if ($LASTEXITCODE -ne 0) { throw "Tests failed in $zone" }
}
```

Then rebuild the demo and verify the package.

```bash
npm run build:demo
npm run check:package
```

`check:package` builds the library, creates a tarball with `npm pack`, and
installs it offline in a temporary consumer project. It type-checks the
consumer using Node-style ESM resolution, then runs the emitted JavaScript
against the installed package. The check covers imports, exported types,
and representative date and business-day examples.

---

## License

MIT
