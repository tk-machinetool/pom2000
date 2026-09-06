# Source Ledger — audited 2026-09-05 JST

## Primary official sources
- Official brand/menu page: https://www.pomunoki.com/pomunoki/
  - States roughly 40 omurice varieties are offered.
  - Explicitly warns some stores have different prices, some listed menus are unavailable, and the website only shows part of the menu.
- Grand menu page: https://www.pomunoki.com/pomunoki/grandmenu/
- Grand menu revision, effective 2025-11-11: https://www.pomunoki.com/img/release/release-276.pdf
- Lunch / Omupasta revision, effective 2026-03-10: https://www.pomunoki.com/img/release/release-286.pdf
- Current fair menu page: https://www.pomunoki.com/pomunoki/fairmenu/
- Summer cheese / Basque cheesecake fair, starts 2026-06-01: https://www.pomunoki.com/img/release/release-293.pdf
- Autumn / sweet potato fair, starts 2026-09-10: https://www.pomunoki.com/img/release/release-296.pdf
- Campaign, published 2026-09-04: https://www.pomunoki.com/img/release/release-298.pdf
- Press release index: https://www.pomunoki.com/pressrelease.html
  - Warns published information may later change, including sale end/specification/price.

## Facility-official — store-specific only
### KITTE博多
- Lunch article: https://hakata.jp-kitte.jp/shop/item_news.jsp?id=4020&inc=0&shopid=90400
  - 2026-05-01; lunch new items single ¥1,089 / set ¥1,474; provided until 17:00.
- Summer fair article: https://hakata.jp-kitte.jp/shop/item_news.jsp?id=4065&inc=0&shopid=90400
  - 2026-06-30; confirms +¥770 summer set, contents and limited availability.

### ヨドバシAkiba
- https://www.yodobashi-akiba.com/restaurant/yy_pomu.html
  - Current facility page with multiple exact SS omurice/pasta/doria prices.
  - Says some items can size up, but does not publish size-up deltas.

## Historical-only
- 2025 lunch size-up +¥165: https://www.pomunoki.com/img/release/release-265.pdf
  - Historical evidence only. Do not apply to 2026 current pricing.
- 2019 size FAQ: https://pomunoki.com/news/2019/10/post-218.html
  - Background only; no current price inference.

## Reconciliation / corrections made in v0.4
1. v0.3 KITTE URL pointed to an unrelated old takeout article. Corrected to the exact 2026 lunch and summer-fair articles.
2. Lunch-only exact prices are now a separate context; they must not leak into default/all-day results.
3. Official summer and autumn PDFs include exact SS set prices; these are now modeled as exact `bundle` offers.
4. Summer fair official PDF has a start date but no explicit end date. Current fair page still lists summer on 2026-09-05. A revalidation gate is required at autumn start rather than inventing an end date.
5. Official press-release index warns prices/specs/sale status may change after publication; data freshness is a first-class rule.
