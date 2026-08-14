# operator quickstart

**この repo で実際に回せるのは `kotoba/` のテストだけ。** appview は deploy
できる状態ではない（README の「状態」節）。だからこの文書は 1 つのことだけを
教える —— **参照実装の不変条件が生きていることを、自分の手で確かめる方法**。

以下の手順は 2026-08-15 に macOS / node v26.3.0 / npm 11.16.0 で実際に踏んだ。
出力はその時に得た実測値。

---

## 0. 素の `npm install` は通らない（先に知っておくこと）

```bash
cd kotoba && npm install
```

```
npm error code EALLOWSCRIPTS
npm error --allow-scripts is not allowed in project-scoped installs.
npm error git dep preparation failed
```

`pnpm install` は先へ進むが、別の場所で止まる:

```
ERR_PNPM_MISSING_PACKAGE_NAME  Can't install
git+https://github.com/kotoba-lang/ipfs.git#main: Missing package name
```

### 原因 —— pin が pin になっていない

依存の鎖はこう繋がっている:

```
@etzhayyim/newsletter-kotoba
  └─ @etzhayyim/sdk           #12314a0c  ← SHA で pin
       └─ @etzhayyim/checkpointer  #63586c4f  ← SHA で pin
            ├─ @etzhayyim/ipfs  #main   ← ⚠ 浮いている
            └─ @etzhayyim/pqh   #main   ← ⚠ 浮いている
```

`@etzhayyim/sdk` は 6 本の git 依存を**全部 SHA で pin している**。しかしその
1 つ `checkpointer` が、自分の依存 2 本を `#main` で参照している。そして
`kotoba-lang/ipfs` の `main` は現在 **Clojure repo**（`package.json` は
`{"private": true, "scripts": {"task": "nbb ..."}}` だけで `name` を持たない）。

pin された commit `671888e0` の時点では `name: "@etzhayyim/ipfs"` が在る。
**つまり壊れたのはこの repo ではなく、上流の 1 本の浮いた ref が、その先の
repo が別言語に作り替えられた時に一緒に流された。**

`@etzhayyim/sdk` は `prepare: tsc` を持つので npm は git 依存をビルドしようと
し、そこで上の鎖を辿って落ちる。**この repo 側を直しても解決しない。**

---

## 1. 回す

`registry.ts` が SDK から取っているのは**型だけ**（`import type { Etzhayyim }`）で、
テストが実行時に要るのは `@etzhayyim/sdk-mock` 1 本きり。その mock は
`src/index.ts` に import が 1 行も無い自己完結したファイルなので、**壊れた鎖を
迂回すれば普通に回る。**

```bash
# a) vitest だけを別の場所に入れる（この repo の package.json を読ませない）
mkdir -p /tmp/nl-tools && cd /tmp/nl-tools
npm init -y >/dev/null && npm install vitest@^4.1.0

# b) mock を取る
git clone --depth 1 https://github.com/etzhayyim/com-etzhayyim-sdk-mock /tmp/nl-mock

# c) repo 側に置く
cd <この repo>/kotoba
rm -rf node_modules
cp -R /tmp/nl-tools/node_modules node_modules
mkdir -p node_modules/@etzhayyim
cp -R /tmp/nl-mock node_modules/@etzhayyim/sdk-mock
rm -rf node_modules/@etzhayyim/sdk-mock/.git

# d) 回す
node_modules/.bin/vitest run
```

実測の出力:

```
 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  115ms
```

終了コード **0**。

> `cp -R` であって `npm install` ではないのは意図的。`kotoba/package.json` が
> 視界に入ると npm は git 依存の準備を始め、§0 に戻る。
> `node_modules/` は `.gitignore` に入れてあるので repo は dirty にならない。

---

## 2. 通ったことを信じる前に、落とす

**3 つ通ったことは、その 3 つが何かを検査している証拠ではない。** 検査している
ことを確かめるには、検査対象を壊して赤くなるのを見る。

`kotoba/src/registry.ts` の `addSection` にある FK ガード:

```ts
if (!(await exists(e, ISSUE_COLLECTION, issueRkey(input.issueId)))) {
  return { status: "issueNotFound", error: `issueNotFound:${input.issueId}` };
}
```

条件を `if (false)` に置き換えて回すと:

```
 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```

終了コード **1**。落ちたのは
`expect((await addSection(e, { ..., issueId: "ghost", ... })).status).toBe("issueNotFound")`
—— **壊した箇所そのものを名指しした**（他の 2 つは通ったまま）。

元に戻すと再び 3 passed / 終了コード 0。

**両方向を見て初めてこの手順は終わり。** 片方しか見ていないなら、緑は
「問題が無い」ではなく「測れていない」かもしれない。

---

## 3. 触ってはいけないもの

- **`appview/` を deploy しない。** `wrangler.jsonc` の `routes` は
  `nwsl0001.etzhayyim.com`（etzhayyim zone）を指す。この repo は
  `cloud-itonami` に在るので、ここから出すのは別 org の live surface。
  加えて `main` が指す `svelte/.svelte-kit/cloudflare/_worker.js` は
  ビルド生成物で repo に無いため、そもそもビルドを通さないと deploy に届かない。
- **`CLAUDE.md` の `Deploy` 節を実行しない。** `etzhayyim deploy` も
  `python -m kotodama.newsletter_worker_main` も、この repo の外（抽出元の
  monorepo）の話。ここには LangGraph worker も BPMN 契約も無い。
- **購読者データを扱わない。** email は Tier 3 PII で、`actor-manifest.jsonld`
  の `governance.dataSources.prohibited` が social 投稿への露出と
  個別の open/click を AT レコードに載せることを明示的に禁じている。
  そもそもその面はこの repo に無い（README の「境界」）。

---

## 4. 直すなら

上流の `kotoba-lang/checkpointer` が `@etzhayyim/ipfs` と `@etzhayyim/pqh` を
`#main` ではなく SHA で参照するようにするのが本筋。pin されている値は
`@etzhayyim/sdk` が既に知っている:

| package | 使うべき SHA |
|---|---|
| `@etzhayyim/ipfs` | `671888e08cc42b297c668b6124cf7c5b9d1676f0` |
| `@etzhayyim/pqh` | `ab728717804ec18dafee7262fa83352ffbc1aaf1` |

それが入るまでは §1 の迂回で回る。**この repo の `package.json` を書き換えて
迂回を焼き込まない** —— 上流が直った時に、直ったことが分からなくなる。
