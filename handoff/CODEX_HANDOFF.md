# ポムの樹 2,000円参考チェッカー — Codex Handoff v0.4

## 0. Mission
スマホでURLを開くだけで、2026年9月のキャンペーン店舗応募条件
「オムライスを含む税込2,000円以上のお食事」について、**2,000円からの超過が小さい参考注文例**を提示する。

これは非公式ツール。価格保証・取扱保証・応募資格保証をしない。

## 1. Source of truth
`handoff/menu-data.json` を唯一の初期データ正本として実装する。
商品名・価格・サイズ差・セット内容をコード側で補完／推測しない。

公式ブランドページは約40種類のオムライスを提供すると説明する一方、Web掲載は一部のみで全商品ではないと明記している。
したがってUIで「全メニュー」「完全網羅」「全国共通価格」と表示禁止。

## 2. Mandatory Data Trust
1. 既定計算対象は `official-current` + exact price のみ。
2. `official-future` は Asia/Tokyo で `start` 到達後のみ候補化。
3. `reviewAfter` がある項目は、その日以降 `revalidatedOn >= reviewAfter` が無ければ候補から除外。終了日を推測しない。
4. `menuContext=lunch` は「ランチ価格を使う」をユーザーが明示したときだけ候補化。通常モードへ混ぜない。
5. `facility-official-current` は店舗プロファイル専用。デフォルトへ混ぜない。
6. `priceFrom` / 「〜」価格は exact optimizer から除外。
7. 2025年の SS→S +165円は historical-only。2026年現行価格の生成に使用禁止。
8. 単品ドリンクは現行本体価格が公式Webで網羅できないため、+55円フロート化だけから価格を合成しない。
9. 公式PDFで税込のセット確定価格がある夏・秋フェアセットは `bundle` として使用可。セット内容を推測して分解しない。
10. 価格の上書きはしない。将来更新では履歴または supersedes を保持する。

## 3. Campaign rule
- startsAtJST: 2026-09-04T00:00:00+09:00
- endsAtJST: 2026-10-16T12:00:00+09:00
- 店舗応募: オムライスを含む、税込2,000円以上のお食事
- オンラインショップ条件は別。店舗最適化に混ぜない。
- 公式応募ではレシート等の画像添付が必要。詳細条件は公式情報へのリンクを必ず表示。

## 4. Tech
React + Vite + TypeScript。
静的ホスティング可能。ログイン不要。外部API不要。
GitHub Pagesでそのまま公開できること。

推奨構成:
- `src/data/menu.json`
- `src/domain/types.ts`
- `src/domain/availability.ts`
- `src/domain/eligibility.ts`
- `src/domain/optimizer.ts`
- `src/domain/ranking.ts`
- `src/domain/freshness.ts`
- `src/components/PresetSelector.tsx`
- `src/components/BestResult.tsx`
- `src/components/ResultList.tsx`
- `src/components/DataTrustNotice.tsx`
- `src/components/SourceDrawer.tsx`
- `src/components/AdvancedFilters.tsx`

## 5. Eligibility model
キャンペーン判定は `category === omurice` ではなく、各オファーの `containsOmurice === true` で行う。
これによりフェアのセット商品 (`bundle`) も正しく扱う。

候補条件:
- exact integer JPY price
- availability/freshness rules pass
- basket total >= 2000
- basket contains at least one offer with `containsOmurice=true`

## 6. Optimizer
数量付き bounded multiset search。
- max quantity per offer: 2
- max total units: 4
- ordering difference only の同一basketはdedupe
- 2000円未満は生成後表示ではなく eligibility stage で除外

Ranking:
1. `overage = total - 2000` ascending
2. fewer total units
3. fewer duplicate units
4. smaller known omurice size (`SS < S < M < L`; unknownは同順位扱い)
5. stable offer-id lexical order

価格以外の量・満腹度は推測しない。「量少なめ」という文言は禁止し、必要なら「品数少なめ」とする。

## 7. Presets / UX semantics
初期画面は説明なしでも10秒以内に使えること。

### 1人向け（default）
- exactly 1 omurice-containing main offer
- extras optional
- lunch items excluded unless lunch toggle ON

### 2人向け
- exactly 2 main-dish units (`omurice`, `pasta`, `doria`, eligible bundle main)
- at least 1 containsOmurice
- extras optional
- duplicate mains permitted

### 金額最優先
- campaign condition only
- bounded quantities as above

Advanced filtersは折りたたみ:
- ランチ価格を含める（default OFF）
- サイド
- デザート
- パスタ
- 期間限定
- Sサイズ

## 8. UI
Mobile first。360px幅を最重要QA対象にする。

ファーストビューに必ず:
- `ポムの樹 2,000円参考チェッカー`
- `非公式・参考ツール`
- 最良候補の `合計` と `超過`
- 「店舗により価格・取扱商品が異なる」短い警告

結果カード:
- 合計 / 超過
- 商品名・サイズ・数量・税込参考価格
- `公式Web参考価格` / `施設公式・店舗別` のscope表示
- sourceを開ける
- `データ確認日 2026-09-05` 等

禁止:
- 「公式ツール」
- 「全国共通価格」
- 「全メニュー網羅」
- ポムフード公式ロゴを利用して公式と誤認させる表現

Mandatory disclaimer:
「価格はポムフード公式・施設公式で確認できた情報を基にした参考値です。店舗により価格・取扱商品・セット内容が異なります。注文前に利用店舗のメニューと税込価格を必ずご確認ください。このツールは価格やキャンペーン応募資格を保証するものではありません。」

## 9. Freshness behavior
夏フェアは2026-09-05時点で公式フェアページに掲載されているが、公式PDFに終了日は無い。
`reviewAfter=2026-09-10` を設定済み。
9/10以降、再確認なしに夏フェアを自動継続表示しない。

秋フェアは公式PDFで 2026-09-10 販売開始予定。
9/9までは絶対に候補に入れず、9/10 JST以降のみ候補化。

## 10. Store profiles
v0.4ではUIとして店舗プロファイルを公開しなくてよい。
ただしdomain/data modelは対応可能にする。
`facilityOfficialEvidence` はサンプル証拠であり default dataset ではない。

## 11. Tests — mandatory
`handoff/ACCEPTANCE_TESTS.md` を全件実装。
特に:
- lunch leakage test
- future activation JST boundary
- stale fair exclusion
- bundle containsOmurice eligibility
- quantity/dedupe
- 1999以下ゼロ
を重要回帰テストにする。

## 12. Visual / responsive QA
- 360x800
- 390x844
- 412x915
- desktop 1280x800
- horizontal overflow zero
- tap target >=44px
- focus-visible
- prefers-reduced-motion
- warning is never modal-only

## 13. Deliverables
1. production React/Vite/TS app
2. unit tests
3. build PASS
4. responsive browser QA evidence
5. README: menu data update procedure / source status rules
6. Git-ready clean tree
7. final report: files changed, tests, build, known limitations, screenshot paths if generated

## 14. Do not do
- Random review/menu aggregator prices into default data
- Old menu price interpolation
- Current S/M/L price synthesis
- Facility price -> nationwide promotion
- Lunch-only price -> all-day promotion
- Unknown fair end-date inference
- Claim completeness

## Implementation order
A. Import/validate schema
B. availability + freshness + campaign eligibility pure functions
C. optimizer + ranking + tests
D. mobile UI
E. source/disclaimer UX
F. responsive QA
G. build and final audit

Do not start by redesigning data or adding new prices. First make the supplied v0.4 dataset and rules pass all tests.
