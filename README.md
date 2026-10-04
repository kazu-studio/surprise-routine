# surprise-routine-bot

サプライズルーティンの週次記録（Googleスプレッドシート）を読み、Claude のワンポイントアドバイス付きで LINE に振り返りレポートを送る Google Apps Script。

## 動作

毎週日曜 9〜10時（Asia/Tokyo）に `sendWeeklyReport` が実行され、シート最終行を「今週」、その1つ上を「先週」として送信する。

- 送信済みの週（`period` が同じ）は再送しない
- Claude API が失敗した場合は定型文のアドバイスで送信する
- データ不正・LINE送信失敗は例外になり、トリガーのエラー通知メールで気づける

## シートの形式

| 行 | 内容 |
|---|---|
| 1〜2行目 | ヘッダー（C列以降にルーティン名） |
| 3行目〜 | A列: 期間 / B列: 達成率（`56%` または `0.56`） / C列〜: 各項目の結果（`✕` `×` などで未達成） |

ヘッダーの項目名が `ROUTINES` の `name` と一致しない場合は、C列から定義順に並んでいるものとして判定する。

## セットアップ

1. スクリプトプロパティを設定する
   - `ANTHROPIC_API_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_USER_ID`
2. `setTrigger` を一度実行する（既存の `sendWeeklyReport` トリガーは作り直される）
3. `clasp push` でデプロイする

## デバッグ用の関数

- `debugData`: シートの読み取り結果をログに出す
- `resetLastSentPeriod`: 送信済みの記録を消し、同じ週を再送できるようにする
