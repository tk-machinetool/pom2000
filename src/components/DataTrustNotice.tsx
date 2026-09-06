import { ExternalIcon } from './Icons'
import type { MenuData } from '../domain/types'

export function DataTrustNotice({ data }: { data: MenuData }) {
  const campaign = data.sources[data.campaignRule.source]
  const officialMenu = data.sources.official_menu_page

  return (
    <section className="trust-panel" aria-labelledby="trust-heading">
      <h2 id="trust-heading">このツールについて</h2>
      <p>
        価格はポムフード公式・施設公式で確認できた情報を基にした参考値です。店舗により価格・取扱商品・セット内容が異なります。注文前に利用店舗のメニューと税込価格を必ずご確認ください。このツールは価格やキャンペーン応募資格を保証するものではありません。
      </p>
      <p className="nonofficial-source-note">
        2026年店頭メニュー参考価格は実店舗メニュー写真で確認した補助データです。公式掲載価格や全国一律価格ではなく、店舗差がある可能性があります。
      </p>
      <dl>
        <div><dt>データ確認日</dt><dd>{data.asOf}</dd></div>
        <div><dt>計算対象</dt><dd>税込価格を一点確認できた項目のみ</dd></div>
      </dl>
      <div className="official-links">
        <a href={campaign.url} target="_blank" rel="noreferrer"><span>公式キャンペーン情報</span><ExternalIcon /></a>
        <a href={officialMenu.url} target="_blank" rel="noreferrer"><span>公式メニューページ</span><ExternalIcon /></a>
      </div>
      <p className="campaign-proof">{data.campaignRule.proof}</p>
    </section>
  )
}
