# Codex実行指示 — pom2000 v0.4

添付の `pom2000-v0.4-codex-handoff` を正本として、ポムの樹の「2,000円参考チェッカー」を公開可能なスマホWebアプリへ実装してください。

最初に必ず以下4ファイルを全文読んでから作業してください。
1. `handoff/CODEX_HANDOFF.md`
2. `handoff/menu-data.json`
3. `handoff/ACCEPTANCE_TESTS.md`
4. `handoff/SOURCE_LEDGER.md`

`index.html` は pre-Codex prototype であり、正本仕様ではありません。既知の欠陥（数量探索なし、ランチ価格の通常時間への混入、フェア鮮度管理不足）を引き継がないでください。

## 実装方針
- React + Vite + TypeScript
- mobile first
- URLを開くだけで利用可能
- login / backend / external API 不要
- GitHub Pages等の静的ホスティング対応
- Data TrustをUIより優先
- 商品名・価格・サイズ差・終了日を推測しない
- 追加のネット価格を勝手に採用しない

## 最重要
- `containsOmurice=true` をキャンペーン適格判定に使うこと。`category=omurice` 固定判定にしない。
- `menuContext=lunch` はランチON時のみ。
- `official-future` はAsia/Tokyoの開始日以降のみ。
- `reviewAfter` 到達後に再確認情報が無いフェア商品は除外。
- `facilityOfficialEvidence` をデフォルト価格へ混ぜない。
- 「〜」価格はexact optimizerへ入れない。
- 2025年SS→S +165円を現行価格生成に使わない。
- 2,000円未満は結果に絶対出さない。

## UX
初期画面のデフォルトは「1人向け」。ページを開いた時点で最良候補を表示してください。
上位候補は「合計」「超過」「注文内容」「参考価格」「出典」を簡潔に見せること。
高度な条件は折りたたみで構いません。

ファーストビューに `非公式・参考ツール` を明示し、店舗差の警告を常時見える場所に置いてください。

## テスト
`handoff/ACCEPTANCE_TESTS.md` を自動テスト化し、全件PASSさせてください。
特に以下は必須です。
- lunch leakage
- autumn activation JST boundary
- stale summer fair exclusion
- bundle containsOmurice eligibility
- quantity 2 / dedupe
- 1999円以下ゼロ
- deterministic top 20

## QA
最低:
- 360x800
- 390x844
- 412x915
- 1280x800

横スクロールなし、44px以上の主要タップ領域、focus-visible、reduced-motionを確認してください。

## 作業完了条件
- production build PASS
- tests PASS
- responsive QA PASS
- Git-ready clean tree
- READMEに価格データ更新手順を記載
- 最終報告に変更ファイル、テスト件数、build結果、既知制約を記載

不明な価格やメニューを埋めるために質問や推測をせず、不明なものは未収録のまま進めてください。
