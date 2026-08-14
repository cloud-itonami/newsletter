# newsletter

**公開ニュースレター issue アーカイブの kotoba 参照実装。** issue（号）と
section（節）の 2 コレクションを AT PDS レコードとして読み書きする TypeScript
パッケージ 1 本と、そこから切り出された edge appview の scaffold を持つ。

購読者リストもメール配信も、この repo には**無い**（下の「境界」を読むこと）。

- 名前は bare な subject 面（`manifest/repository-rules.edn` の `:plane-order` 4 番）。
  org セグメント `cloud-itonami` が所有者を、`newsletter` が主題を言う。
- 由来: `etzhayyim/root` の `60-apps/etzhayyim-project-newsletter` から抽出
  （`migration.edn` に source revision `d1ff44f4` / tree `c4d9a78b` を記録）。

## 境界 —— 何がここに在り、何が在らないか

この app は **(c) mixed split**（`kotoba/src/types.ts` 冒頭に判定根拠）。
「公開されたもの」だけがここへ移り、規制のかかる面は etzhayyim 側に残った。

| 面 | 実体 | 置き場 |
|---|---|---|
| **公開 issue アーカイブ** | issue + section レコード、その検証規則 | **この repo（`kotoba/`）** |
| 購読者リスト | email + 氏名 + cohort（Tier 3 PII） | etzhayyim（consent-capability 越し） |
| 配信 | Resend batch send / 配信停止の遵法 | etzhayyim |
| 号の生成 | LangGraph 曲線（ingest→rank→draft→personalize） | etzhayyim |
| スポンサー枠 | ads の createCampaign（Settlement） | etzhayyim |

**したがって、この repo を読んで「ニュースレターを送る方法」は分からない。**
ここに在るのは「送られた号を公開アーカイブとしてどう表現し、どう検証するか」だけ。

## 中身

```
kotoba/                     ← 正本。TS 参照実装（テストが在るのはここだけ）
  src/types.ts              ← レコード型・DID 体系・検証述語（isSlug / isUint）
  src/registry.ts           ← createIssue / setIssueStatus / getIssue / listIssues
                               addSection / listSections / coverage
  test/newsletter.test.ts   ← 3 test。検証規則と FK と順序付けを固定する
appview/newsletter-nwsl0001/ ← CF Worker + SvelteKit の scaffold（下記の注意）
actor-manifest.jsonld        ← actor DID・capability・governance（PII Tier 3）
README.edn / migration.edn   ← 機械可読メタデータ（`:canonical-metadata :edn`）
CLAUDE.md                    ← ⚠ 抽出**前**の系の説明。下記「既知のずれ」参照
```

### `kotoba/` が固定している不変条件

テストが実際に赤くする性質は 3 つ:

1. **slug と number の検証** —— slug は `^[a-z0-9]+(-[a-z0-9]+)*$`、`number` と
   section の `order` は非負整数。AT-Lexicon に float が無いので、順序は整数。
2. **section → issue の FK** —— 存在しない issue に section を足すと
   `issueNotFound` を返す（`addSection` が書き込み前に `exists` を引く）。
3. **section の順序付け** —— `listSections` は `order` 昇順で返す。

`status` は `draft → published → archived`。`published` に遷移した時だけ
`publishedAt` が入る（既に在ればそれを保つ）。

## 状態 —— 正直なところ

- **`kotoba/` は動く。** テストは通る。ただし `npm install` はこの repo では
  **失敗する**（上流の pin が pin になっていない）。原因と回避は
  [`docs/operator-quickstart.md`](docs/operator-quickstart.md) に実測付きで書いた。
- **`appview/` は deploy できる状態ではない。** `wrangler.jsonc` の `main` が
  `svelte/.svelte-kit/cloudflare/_worker.js` を指すが、これはビルド生成物で
  repo には無い。`routes` は `nwsl0001.etzhayyim.com`（etzhayyim zone）を指しており、
  この repo が居る `cloud-itonami` からは出せない。
- **`MIGRATION-TODO.md` の substrate 検査は未了。** ad-pixel の codemod だけが
  2026-05-23 に閉じており、DID-bind auth 他は open のまま。

### 既知のずれ

- **`CLAUDE.md` は抽出前の系を書いている** —— RisingWave のテーブル、LangGraph の
  Python worker、`etzhayyim deploy`、`newsletter.etzhayyim.com` への curl。
  いずれも**この repo には無い**（parent monorepo 側の話）。歴史として残すが、
  ここの操作手順として読まないこと。
- **identity が org と一致しない** —— DID も lexicon NSID も `etzhayyim` を名乗る
  （`did:web:newsletter.etzhayyim.com` / `com.etzhayyim.apps.newsletter.*`）が、
  repo は `cloud-itonami` に在る。`migration.edn` の `:destination` は
  `etzhayyim/com-etzhayyim-app-newsletter` と書いてあり、着地先と食い違っている。
  改名はしていない —— 名前は discovery alias であって identity ではない
  （ADR-2607289500）。

## 使う

まず [`docs/operator-quickstart.md`](docs/operator-quickstart.md)。
テストの回し方（と、なぜ素の `npm install` が通らないか）はそこが正本。

## ライセンス

Apache-2.0 + etzhayyim Charter Compliance Rider v3.1（`NOTICE` 参照）。
