# tiny-ja-date

Tiny TypeScript date utilities for Japanese UI.

- 日本語の日付表示
- 日本語の相対日付表示
- 土日判定
- 次の営業日計算

## Install

```bash
npm install tiny-ja-date
```

## Usage

```ts
import {
  formatJaDate,
  formatRelativeJaDate,
  isWeekendJP,
  nextBusinessDay,
} from "tiny-ja-date"

formatJaDate(new Date(2026, 4, 12))
// "2026年5月12日（火）"

formatRelativeJaDate(new Date(2026, 4, 15), new Date(2026, 4, 12))
// "3日後"

isWeekendJP(new Date(2026, 4, 16))
// true

nextBusinessDay(new Date(2026, 4, 15))
// Date for 2026-05-18
```

## API

### `formatJaDate(date: Date | string | number): string`

Formats a date as a Japanese date label.

```ts
formatJaDate(new Date(2026, 4, 12))
// "2026年5月12日（火）"
```

### `formatRelativeJaDate(date: Date | string | number, baseDate?: Date | string | number): string`

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

### `isWeekendJP(date: Date | string | number): boolean`

Checks whether the date is Saturday or Sunday.

```ts
isWeekendJP(new Date(2026, 4, 16))
// true
```

### `nextBusinessDay(date: DateInput, options?: BusinessDayOptions): Date`

Returns the start of the next business day in the runtime's local time zone.

The search starts the day after the input and skips Saturdays, Sundays, and
any local calendar dates supplied in `options.holidays`. Each holiday accepts
the same `DateInput` type as the input date.

```ts
nextBusinessDay(new Date(2026, 4, 15))
// Date for 2026-05-18

nextBusinessDay("2026-05-15", { holidays: ["2026-05-18"] })
// Date for 2026-05-19
```

## Date inputs

- `YYYY-MM-DD` strings represent local calendar dates in the runtime's time zone.
  Invalid dates such as `2026-02-30` throw a `TypeError`.
- `Date` objects and Unix timestamps in milliseconds represent instants. The
  functions use the instant's date in the runtime's local time zone.
- For strings with a time, use ISO 8601 with an explicit offset such as
  `2026-05-12T09:00:00+09:00` to identify an instant. Strings without an
  explicit offset and other string formats follow JavaScript's `Date` parsing.

### Upgrading from 0.1

In 0.1, JavaScript parsed a bare `YYYY-MM-DD` string as midnight UTC. In 0.2,
it represents the local date as written. Pass an explicit UTC timestamp such
as `2026-05-12T00:00:00Z` to retain the 0.1 interpretation.

## Design policy

`tiny-ja-date` is intentionally small.

It does not:

- include Japanese holiday data
- convert time zones
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
