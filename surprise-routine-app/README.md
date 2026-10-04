# サプライズルーティン 週次振り返りアプリ

仕様書に沿って、以下を実装しています。

- `index.html`: 週次チェック画面（32項目）
- `history.html`: 振り返り画面（累計達成率・過去週）
- `js/api.js`: GAS API通信
- `manifest.json` + `service-worker.js`: PWA対応
- `gas/Code.gs`: GAS側のAPI実装例

## 1. GASの準備

1. Googleスプレッドシートを作成
2. Apps Script を開いて `gas/Code.gs` の内容を貼り付け
3. Webアプリとしてデプロイ（アクセス権: 全員）
4. 発行された URL を控える

## 2. フロントの接続設定

`js/api.js` の `DEFAULT_ENDPOINT` を、デプロイしたGAS URLに置き換えてください。

```js
const DEFAULT_ENDPOINT = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

## 3. 起動

静的ホスティング（GitHub Pages / Netlify / Vercel など）に配置して利用します。

## 4. iPhoneへの追加

iPhone SafariでURLを開き、共有メニューから「ホーム画面に追加」でアプリ風に利用できます。
