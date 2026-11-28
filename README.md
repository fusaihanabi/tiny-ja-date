# tiny-ja-date

[English](README.en.md) · [ライブデモ](https://fusaihanabi.github.io/tiny-ja-date/) · [API](#api) · [関連ライブラリ](#関連ライブラリ)

日本語 UI 向けの日付表示と営業日計算を提供する、依存ゼロの TypeScript ライブラリです。

- 日本語の日付表示、相対日付表示、`YYYY-MM-DD` 形式の日付表示
- 指定日の開始時刻、暦日・暦月の加算と減算、2つの日付間の暦日数
- 土日・営業日判定、次の営業日、営業日数の加算と減算、2つの日付間の営業日数
- 定休日・休業日・臨時営業日の指定、営業日一覧の取得と1件ずつの列挙

<a id="install"></a>

## インストール

```bash
npm install tiny-ja-date
```

ブラウザでは [unpkg](https://unpkg.com/tiny-ja-date/dist/index.js) または [jsDelivr](https://cdn.jsdelivr.net/npm/tiny-ja-date/dist/index.js) から ES モジュールを読み込めます。[CDN の使用例](https://fusaihanabi.github.io/tiny-ja-date/#cdn)

パッケージは ES モジュールと TypeScript 型定義を提供します。1.7.1 は Windows x64、Node.js 26.13.1、npm 11.20.0、TypeScript 5.9.3 で検証しました。タイムゾーンの計算には実行環境の `Intl.DateTimeFormat` とタイムゾーンデータを使います。

<a id="usage"></a>

## 使い方

```ts
import {
  addBusinessDays,
  addCalendarDays,
  addCalendarMonths,
  countBusinessDays,
  countCalendarDays,
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
// 2026-05-18 の開始時刻

addBusinessDays("2026-05-15", 2)
// 2026-05-19 の開始時刻

countBusinessDays("2026-05-15", "2026-05-19")
// 2

listBusinessDays("2026-05-15", "2026-05-19")
// 2026-05-15、2026-05-18、2026-05-19 の日付

const calendar = createBusinessCalendar({ timeZone: "Asia/Tokyo", weekendDays: [0] })
calendar.isBusinessDay("2026-11-21")
// true
```

## API

### `formatJaDate(date: DateInput, options?: DateOptions): string`

日本語の日付ラベルを返します。

```ts
formatJaDate(new Date(2026, 4, 12))
// "2026年5月12日（火）"
```

### `formatIsoDate(date: DateInput, options?: DateOptions): string`

選択したタイムゾーンの暦日を、年4桁、月と日各2桁の `YYYY-MM-DD` 形式で返します。`formatJaDate` と同じ入力を受け付け、既定では実行環境のローカルタイムゾーンを使います。不正な日付は `TypeError`、未対応のタイムゾーンや `0000`〜`9999` の範囲外の年は `RangeError` になります。

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

土日や休業日も含め、選択した暦日の最初に存在する時刻を `Date` で返します。`formatIsoDate` と同じ入力を受け付け、既定では実行環境のローカルタイムゾーンを使います。午前0時が存在しない場合は当日の最初の時刻を、午前0時が2回ある場合は早い方を使います。

不正な日付やタイムゾーン上で丸一日存在しない日付は `TypeError`、認識できないタイムゾーンは `RangeError` になります。

```ts
const tokyo = { timeZone: "Asia/Tokyo" }
const selectedDate = "2026-11-21" // HTML の日付入力欄の値など
const searchStart = startOfDay(selectedDate, tokyo)

searchStart.toISOString() // "2026-11-20T15:00:00.000Z"
formatIsoDate(searchStart, tokyo) // "2026-11-21"
```

### `addCalendarDays(date: DateInput, amount: number, options?: DateOptions): Date`

選択したタイムゾーンで、土日や休業日を含む暦日を数えます。正の値で先へ、負の値で前へ進み、移動先の暦日の最初に存在する時刻を返します。午前0時が2回ある日は早い方を使います。0 は `startOfDay(date, options)` と同じです。

タイムゾーン上で丸一日存在しない日付も、暦日数には含まれます。その日を表す日付文字列は、日数が0以外の場合の起点にも使えます。移動先の暦日が存在しない場合や結果が `Date` の範囲外の場合は `TypeError`、日数が安全な整数でない場合は `RangeError` になります。

```ts
const tokyo = { timeZone: "Asia/Tokyo" }

formatIsoDate(addCalendarDays("2026-11-20", 1, tokyo), tokyo) // "2026-11-21" （土曜）
formatIsoDate(addCalendarDays("2026-01-01", -1, tokyo), tokyo) // "2025-12-31"

const apia = { timeZone: "Pacific/Apia" }
formatIsoDate(addCalendarDays("2011-12-29", 2, apia), apia) // "2011-12-31"
// 12月30日は存在しないため、12月29日から1日進むと TypeError になります。
```

### `addCalendarMonths(date: DateInput, amount: number, options?: DateOptions): Date`

選択したタイムゾーンで暦月を前後に移動します。日付の入力形式とタイムゾーンの扱いは `addCalendarDays` と共通です。移動先に元の日と同じ日番号があればその日を、なければ月末を使います。0 は `startOfDay(date, options)` と同じです。

移動先の暦日の最初に存在する時刻を返します。その暦日が存在しない場合や結果が `Date` の範囲外の場合は `TypeError`、月数が安全な整数でない場合は `RangeError` になります。

毎月の請求日を求める場合は、毎回、元の請求日に対して経過した月数を指定します。

```ts
const tokyo = { timeZone: "Asia/Tokyo" }
const billingDate = "2026-01-31"

formatIsoDate(addCalendarMonths(billingDate, 1, tokyo), tokyo) // "2026-02-28"
formatIsoDate(addCalendarMonths(billingDate, 2, tokyo), tokyo) // "2026-03-31"
formatIsoDate(addCalendarMonths("2024-03-31", -1, tokyo), tokyo) // "2024-02-29"
```

### `countCalendarDays(from: DateInput, to: DateInput, options?: DateOptions): number`

選択したタイムゾーンで2つの暦日間の日数を返します。タイムゾーンの既定値は実行環境のローカルタイムゾーンです。`to` が後なら正、前なら負、同じ暦日なら0です。

土日、休業日、タイムゾーン上で丸一日存在しない日付も数えます。存在しない日付は、両端のどちらにも日付文字列で指定できます。夏時間による時刻の変化は暦日数に影響しません。不正な日付は `TypeError`、認識できないタイムゾーンは `RangeError` になります。

```ts
const tokyo = { timeZone: "Asia/Tokyo" }

countCalendarDays("2026-11-20", "2026-11-23", tokyo) // 3
countCalendarDays("2026-11-23", "2026-11-20", tokyo) // -3
countCalendarDays("2026-11-21", "2026-11-20T15:30:00Z", tokyo) // 0

const apia = { timeZone: "Pacific/Apia" }
countCalendarDays("2011-12-29", "2011-12-31", apia) // 2
```

### `formatRelativeJaDate(date: DateInput, baseDate?: DateInput, options?: DateOptions): string`

基準日から見た相対日付を日本語で返します。基準日を省略すると、選択したタイムゾーンでの今日が基準になります。

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

土曜日または日曜日かを判定します。営業日計算に使う定休日の設定とは独立しています。

```ts
isWeekendJP(new Date(2026, 4, 16))
// true
```

### `isBusinessDay(date: DateInput, options?: BusinessDayOptions): boolean`

選択したタイムゾーンで、入力した暦日自体が営業日かを判定します。[休業日と臨時営業日の優先順位](#休業日と臨時営業日の優先順位)で休業日となる日や、そのタイムゾーンで丸一日存在しない日には `false` を返します。午前0時より後に始まる日も、営業日の対象になります。休業日の入力に不正な値があれば、判定対象が定休日でも `TypeError` になります。

```ts
const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

isBusinessDay("2026-11-23", options)
// false

isBusinessDay("2026-11-24", options)
// true
```

### `nextBusinessDay(date: DateInput, options?: BusinessDayOptions): Date`

選択したタイムゾーンで、次の営業日の開始時刻を `Date` で返します。午前0時が存在しない場合は当日の最初の時刻を使い、丸一日存在しない場合は翌日以降を探します。`toISOString()` はその瞬間を UTC で表示します。選択したタイムゾーンの暦日は `formatIsoDate(result, { timeZone })` で取得できます。

入力日の翌日から、[休業日と臨時営業日の優先順位](#休業日と臨時営業日の優先順位)に従って探します。

```ts
nextBusinessDay(new Date(2026, 4, 15))
// 2026-05-18 の開始時刻

nextBusinessDay("2026-05-15", { holidays: ["2026-05-18"] })
// 2026-05-19 の開始時刻
```

### `addBusinessDays(date: DateInput, amount: number, options?: BusinessDayOptions): Date`

営業日数が正の場合は入力日の翌日から先へ、負の場合は前日から前へ、[休業日と臨時営業日の優先順位](#休業日と臨時営業日の優先順位)に従って数えます。`addBusinessDays(date, 1, options)` は `nextBusinessDay(date, options)` と同じです。

0 の場合は土日や休業日も含め、入力日の開始時刻を返します。同じタイムゾーンでの `startOfDay(date, { timeZone })` と同じです。午前0時が存在しない場合は当日の最初の時刻を使います。0 を指定して入力日が丸一日存在しない場合や、結果が `Date` の範囲外の場合は `TypeError`、日数が安全な整数でない場合は `RangeError` になります。設定は日数が0でも検証します。

```ts
const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

addBusinessDays("2026-11-20", 2, options)
// 東京での 2026-11-25 の開始時刻

addBusinessDays("2026-11-24", -1, options)
// 東京での 2026-11-20 の開始時刻
```

### `countBusinessDays(from: DateInput, to: DateInput, options?: BusinessDayOptions): number`

選択したタイムゾーンで、`from` の翌日または前日から `to` までの営業日数を数えます。出発日は除き、到着日は営業日の場合に含めます。先へ数えると正、前へ数えると負になります。両端が同じ暦日または期間内に営業日がなければ0を返します。

期間全体に[休業日と臨時営業日の優先順位](#休業日と臨時営業日の優先順位)を適用します。結果が0になる場合も、両端の日付と設定を検証します。

```ts
const options = { timeZone: "Asia/Tokyo", holidays: ["2026-11-23"] }

countBusinessDays("2026-11-20", "2026-11-25", options) // 2
countBusinessDays("2026-11-25", "2026-11-20", options) // -2

countBusinessDays("2026-11-20", "2026-11-22", options) // 0
countBusinessDays("2026-11-22", "2026-11-20", options) // -1
```

### `listBusinessDays(from: DateInput, to: DateInput, options?: BusinessDayOptions): Date[]`

`from` から `to` までの営業日を、指定した方向順に返します。両端は営業日なら含みます。両端が同じ日であれば、営業日の場合に1件、そのほかの場合は空配列を返します。

期間全体に[休業日と臨時営業日の優先順位](#休業日と臨時営業日の優先順位)を適用します。それぞれの `Date` は、選択したタイムゾーンでその日の最初に存在する時刻です。呼び出すたびに新しい配列と `Date` オブジェクトを返します。

```ts
const options = {
  timeZone: "Asia/Tokyo",
  weekendDays: [0],
  holidays: ["2026-11-23"],
}

listBusinessDays("2026-11-20", "2026-11-24", options)
// 東京での11月20日、21日、24日の開始時刻

listBusinessDays("2026-11-24", "2026-11-20", options)
// 東京での11月24日、21日、20日の開始時刻

countBusinessDays("2026-11-20", "2026-11-24", options)
// 2（11月20日を除いて数える）
```

### `iterateBusinessDays(from: DateInput, to: DateInput, options?: BusinessDayOptions): Generator<Date, void, unknown>`

期間内の営業日を1件ずつ返します。両端を含む扱い、列挙の順序、日の開始時刻は `listBusinessDays` と同じです。両端の日付と設定は呼び出し時に検証し、最初の読み取り時に探索を始めます。`for...of` を途中で抜けると探索も止まります。呼び出すたびに独立したイテレーターと新しい `Date` を返します。

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
// 東京での11月20日、21日、24日の開始時刻
```

### `createBusinessCalendar(options?: BusinessDayOptions): BusinessCalendar`

同じ設定を使い回せるカレンダーを作ります。`isBusinessDay(date)`、`nextBusinessDay(date)`、`addBusinessDays(date, amount)`、`countBusinessDays(from, to)`、`listBusinessDays(from, to)`、`iterateBusinessDays(from, to)` を備え、各メソッドは同名の関数と同じ規則で動作します。タイムゾーン、定休日、休業日、臨時営業日はカレンダーの作成時に、各メソッドの引数は呼び出し時に検証します。

`BusinessCalendar` を独自に実装する場合、1.1.0 以降は `iterateBusinessDays` も実装してください。

カレンダーは作成時の設定を保持します。元の設定や配列、その中の `Date` を変更しても既存のカレンダーには反映されません。ルールを変えるときは、新しいカレンダーを作成します。既定では実行環境のローカルタイムゾーンを使い、土曜と日曜を定休日とします。

```ts
const calendar = createBusinessCalendar({
  timeZone: "Asia/Tokyo",
  weekendDays: [0],
  holidays: ["2026-11-23"],
})

calendar.isBusinessDay("2026-11-21") // true
calendar.countBusinessDays("2026-11-20", "2026-11-24") // 2
calendar.listBusinessDays("2026-11-20", "2026-11-24")
// 東京での11月20日、21日、24日の開始時刻
```

<a id="weekly-closures"></a>

## 定休日の設定

`isBusinessDay`、`nextBusinessDay`、`addBusinessDays`、`countBusinessDays`、`listBusinessDays`、`iterateBusinessDays` では、`BusinessDayOptions` に `weekendDays?: readonly number[]` を指定できます。曜日は0（日曜）から6（土曜）までの整数です。

- `weekendDays` を省略すると土曜と日曜が定休日になります。`[0, 6]` と同じです。
- 配列を指定すると既定値を上書きします。空配列は毎週の定休日を解除します。日付ごとの `holidays` は引き続き適用します。
- 同じ曜日を複数指定しても1件として扱います。範囲外の値や整数以外の値は `RangeError`、配列以外は `TypeError` になります。0日移動や同じ日付間の計算でも検証します。
- 7日すべてを定休日にすると、条件を満たす `workingDates` だけが営業日になります。到達できる営業日がなければ、`nextBusinessDay` と日数が0以外の `addBusinessDays` は `TypeError` をスローします。0日移動は入力日の開始時刻を返します。

```ts
const options = {
  timeZone: "Asia/Tokyo",
  weekendDays: [0],
  holidays: ["2026-11-23"],
}

isBusinessDay("2026-11-21", options) // true （土曜）
nextBusinessDay("2026-11-20", options) // 東京での 2026-11-21 の開始時刻
countBusinessDays("2026-11-20", "2026-11-24", options) // 2 （土曜と火曜）
```

<a id="working-date-exceptions"></a>

## 休業日と臨時営業日の優先順位

営業日計算の関数とカレンダーのメソッドには、`BusinessDayOptions` の `workingDates?: readonly DateInput[]` で臨時営業日を指定できます。`workingDates` と `holidays` はどちらも、選択したタイムゾーンと[日付の入力形式](#日付の入力形式)に従います。異なる値でも同じ暦日に当たる場合は1件として扱います。

タイムゾーン上で丸一日存在しない日付は休業日です。存在する日付には、上から順に最初に該当する規則を適用します。

1. `holidays` に指定した日付は休業日。
2. `workingDates` に指定した日付は営業日。
3. `weekendDays` に指定した曜日は休業日。
4. それ以外の日は営業日。

```ts
const options = { timeZone: "Asia/Tokyo", workingDates: ["2026-11-21"] }

isBusinessDay("2026-11-21", options) // true （土曜の臨時営業）
nextBusinessDay("2026-11-20", options).toISOString() // "2026-11-20T15:00:00.000Z"
isBusinessDay("2026-11-21", { ...options, holidays: ["2026-11-21"] }) // false
```

<a id="time-zones"></a>

## タイムゾーン

すべての公開関数で `"Asia/Tokyo"` などの `timeZone` を指定できます。選択したタイムゾーンは入力日、基準日、期間の両端、休業日、臨時営業日に適用されます。省略時は実行環境のローカルタイムゾーンを使います。認識できない IANA の名前は `RangeError` になります。

```ts
const tokyo = { timeZone: "Asia/Tokyo" }

formatJaDate("2026-11-23T15:30:00Z", tokyo)
// "2026年11月24日（火）"

formatRelativeJaDate("2026-11-24", undefined, tokyo)
// 東京の今日を基準とした相対日付

nextBusinessDay("2026-11-20", { ...tokyo, holidays: ["2026-11-23"] }).toISOString()
// "2026-11-23T15:00:00.000Z" （東京の 2026-11-24 午前0時）
```

<a id="date-inputs"></a>

## 日付の入力形式

| 入力 | 解釈 |
| --- | --- |
| `"2026-11-24"` | 選択したタイムゾーンで、文字列どおりの暦日として扱います。 |
| `Date`、ミリ秒単位の Unix タイムスタンプ、`"2026-11-23T15:30:00Z"` など | 特定の時刻として扱い、選択したタイムゾーンでの暦日を使います。 |
| `"2026-11-24T00:30:00"` など、その他の文字列形式 | `timeZone` を省略した場合は JavaScript の `Date` の解釈に従います。明示した場合は `TypeError` になります。 |

`2026-02-30` のように存在しない暦日を指定すると `TypeError` になります。時刻まで指定する場合は、`Z` または `+09:00` などの数値オフセットを含む ISO 8601 形式を使います。

<a id="upgrading-from-01"></a>

### 0.1 からの移行

0.1 では、時刻を含まない `YYYY-MM-DD` 形式の文字列を JavaScript が UTC の午前0時として解釈していました。0.2 からは文字列どおりのローカル日付として扱います。0.1 の解釈を使う場合は、`2026-05-12T00:00:00Z` のように UTC の時刻を指定します。

<a id="design-policy"></a>

## 設計方針

`tiny-ja-date` は日本語の日付表示と営業日計算に特化しています。組織ごとの休業日は `holidays` で指定できます。

<a id="live-demo"></a>

## ライブデモ

デモでは、日付と基準日、定休日・休業日・臨時営業日、タイムゾーンを切り替えて、暦日数と営業日数の違いを確認できます。

ライブラリのソースを変更したら `npm run build:demo` を実行し、デモで使う `docs/index.js` を再生成します。

[ライブデモ](https://fusaihanabi.github.io/tiny-ja-date/) · [npm パッケージ](https://www.npmjs.com/package/tiny-ja-date)

## 関連ライブラリ

請求画面で支払期日と金額を扱う場合は、`tiny-ja-money` と組み合わせられます。日本向けフォームや外部連携には、用途に応じて Fusai Hanabi OSS の各ライブラリを利用できます。

| ライブラリ | 用途 | デモ |
| --- | --- | --- |
| [tiny-ja-money](https://github.com/fusaihanabi/tiny-ja-money) | 円単位の金額の読み取り・整形、消費税や按分の計算。 | [ライブデモ](https://fusaihanabi.github.io/tiny-ja-money/) |
| [normalize-ja-input](https://github.com/fusaihanabi/normalize-ja-input) | フォーム入力の全角数字、空白、ハイフンなどの表記ゆれを整えます。 | [ライブデモ](https://fusaihanabi.github.io/normalize-ja-input/) |
| [ja-form-validators](https://github.com/fusaihanabi/ja-form-validators) | 日本の郵便番号、電話番号、フリガナなどの入力形式を検証します。 | [ライブデモ](https://fusaihanabi.github.io/ja-form-validators/) |
| [ja-input-mask](https://github.com/fusaihanabi/ja-input-mask) | 電話番号や郵便番号などを入力中に整形し、貼り付けやカーソル操作にも対応します。 | [ライブデモ](https://fusaihanabi.github.io/ja-input-mask/) |
| [ja-ime-utils](https://github.com/fusaihanabi/ja-ime-utils) | 日本語 IME の変換状態を追跡し、確定時の Enter とフォーム送信を区別します。 | [ライブデモ](https://fusaihanabi.github.io/ja-ime-utils/) |
| [ja-char-check](https://github.com/fusaihanabi/ja-char-check) | 保存や外部連携の前に、文字集合・文字コードの互換性やバイト数を検査します。 | [ライブデモ](https://fusaihanabi.github.io/ja-char-check/) |
| [ja-zengin-utils](https://github.com/fusaihanabi/ja-zengin-utils) | 全銀カナや総合振込の120バイト固定長ファイルを扱います。 | [ライブデモ](https://fusaihanabi.github.io/ja-zengin-utils/) |

[Fusai Hanabi OSS 公式サイト](https://dl.fusai-hanabi.com/)

<a id="release-checks"></a>

## リリース確認

開発依存関係のインストール後にテストを実行します。下の PowerShell 例では、実行環境のタイムゾーンを切り替え、既定値と明示したタイムゾーンの両方の動作を確認します。

```powershell
foreach ($zone in @('Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Apia')) {
  $env:TZ = $zone
  npm test -- --run
  if ($LASTEXITCODE -ne 0) { throw "Tests failed in $zone" }
}
```

続いてデモを再ビルドし、配布パッケージを確認します。

```bash
npm run build:demo
npm run check:package
```

`check:package` はライブラリをビルドし、`npm pack` で作ったアーカイブを一時プロジェクトにオフラインでインストールします。Node.js の ESM 解決で型を確認し、生成した JavaScript を実行して、インポート、公開型、暦日・営業日の代表的な使用例を検証します。`npm publish --dry-run --offline` では公開前処理とパッケージの内容も確認できます。

<a id="license"></a>

## ライセンス

[MIT](LICENSE)
