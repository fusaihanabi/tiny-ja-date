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

### `nextBusinessDay(date: Date | string | number): Date`

Returns the next business day.

The input date itself is not included.

```ts
nextBusinessDay(new Date(2026, 4, 15))
// Date for 2026-05-18
```

## Note

Business day calculation excludes weekends only.

Japanese holidays are intentionally out of scope for v0.1.

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

- Demo → `https://fusaihanabi.github.io/tiny-ja-date`
- npm → `https://www.npmjs.com/package/tiny-ja-date`
- GitHub → `https://github.com/fusaihanabi/tiny-ja-date`
- Official → `https://dl.fusai-hanabi.com`

---

## License

MIT
