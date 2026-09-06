# Acceptance Tests v0.4

## Data/schema
- Every optimizer offer has unique `id`.
- Every optimizer offer has integer `price > 0`, `taxIncluded=true`, `priceType=exact`.
- Every `source` id resolves.
- No facility evidence is imported into default offer list.

## Campaign eligibility
- No displayed basket below ¥2,000.
- Every displayed basket has at least one `containsOmurice=true` offer.
- A `bundle` with `containsOmurice=true` qualifies.
- A pasta-only basket never qualifies.

## Time/context
- `official-future` excluded at 2026-09-09T23:59:59+09:00.
- autumn items included at/after 2026-09-10T00:00:00+09:00.
- `menuContext=lunch` excluded when lunch mode OFF.
- lunch items become eligible when lunch mode ON (subject to all other rules).
- item with `reviewAfter=2026-09-10` and no revalidation is excluded on/after that date.
- historical SS→S +165 never generates synthetic price.

## Optimizer/ranking
- Exact ¥2,000 outranks ¥2,001.
- ¥2,001 outranks ¥2,010.
- Same offer may appear quantity 2 when preset permits.
- Equivalent baskets from different generation order dedupe.
- tie => fewer units first.
- tie => fewer duplicates next.
- final tie is deterministic by IDs.
- repeated runs produce identical top 20.

## Presets
- 1人向け: exactly one omurice-containing main offer.
- 2人向け: exactly two main-dish units and at least one containsOmurice.
- 金額最優先: only campaign + bounded quantity rules.

## Current regression fixture — 2026-09-05
With default non-lunch current data before autumn activation, a best verified exact-price basket is ¥2,013 (+¥13), including:
- 海鮮あんかけオムライス SS ¥1,353 + うじゃうじゃウインナー ¥660
or
- トマトと鰹節の和風スープオムライス（梅肉添え）SS ¥1,408 + バスクチーズケーキ ミニパフェ ¥605
Do not hard-code the result.

## Future regression fixture — from 2026-09-10
If autumn data is active and current, `さつまいものポルチーニソースオムライス S ¥1,540 + りんごとさつまいものミニサラダ ¥462 = ¥2,002` must outrank ¥2,013.

## UI/accessibility
- 360px viewport: no horizontal overflow.
- All primary interactive targets >=44px.
- Visible `非公式・参考ツール` label in first viewport.
- Visible store-price warning without opening modal/drawer.
- Every result says or contextually carries `参考価格`.
- Source accessible from result or source drawer.
- Lunch mode state is obvious when enabled.
- Stale/future items never silently appear.
- Do not render `公式ツール`, `全国共通価格`, `全メニュー網羅`.
