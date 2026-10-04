var SPREADSHEET_ID = '1hGSgv1kfu-eWoGTgg7zEhyj4ZJfmuXNC7IVdi0Ux1ho';
var SHEET_GID = 1098239501;
var HEADER_ROWS = 2; // 1〜2行目がヘッダー、3行目からデータ

var CLAUDE_MODEL = 'claude-sonnet-5-5';
var FALLBACK_COMMENT = '今週もおつかれさまでした！記録を続けていること自体が前進です。来週は「来週改善したい項目」から1つだけ選んで、まず1日やってみましょう。';
var MAX_DISPLAY_ITEMS = 5;
var LAST_SENT_PERIOD_KEY = 'LAST_SENT_PERIOD';

// 未達成とみなす記号（NFKC正規化後に比較する）
var NOT_ACHIEVED_MARKS = ['✕', '×', '✖', '✗', '✘', '❌', 'x', 'X'];

var ROUTINES = [
  { id: "r01", category: "健康", name: "早寝早起きする" },
  { id: "r02", category: "健康", name: "睡眠時間を推奨8時間以上、最低6時間以上とる" },
  { id: "r03", category: "健康", name: "毎日20分以上の軽い運動をしている" },
  { id: "r04", category: "健康", name: "毎日湯船に入る(39〜40℃・10〜15分)" },
  { id: "r05", category: "健康", name: "GI値の高い炭水化物、精製された砂糖の摂取を控える（野菜と一緒に食べる）" },
  { id: "r06", category: "健康", name: "揚げ物の摂取を控える" },
  { id: "r07", category: "健康", name: "夕食・飲酒は寝る2時間以上前に終える" },
  { id: "r08", category: "健康", name: "仕事中は背筋を伸ばして良い姿勢を保つ" },
  { id: "r09", category: "健康", name: "毎晩デンタルフロスをする" },
  { id: "r10", category: "健康", name: "体重を測って記録する" },
  { id: "r11", category: "健康", name: "保湿して日焼け止めを塗る" },
  { id: "r12", category: "健康", name: "仕事や自己研鑽から離れてリラックスできる時間を30分以上つくる" },
  { id: "r13", category: "健康", name: "筋トレする（軽い運動でもOK）" },
  { id: "r14", category: "自己研鑽", name: "隙間時間にゴシップとショート動画を見ない" },
  { id: "r15", category: "自己研鑽", name: "毎日良かったことや新しい発見を人に話すか書き出す" },
  { id: "r16", category: "自己研鑽", name: "誰が見ても完璧なほど身だしなみを整える" },
  { id: "r17", category: "自己研鑽", name: "朝活の時間を30分以上つくる" },
  { id: "r18", category: "効率化", name: "部屋を常に整理整頓・清潔にする" },
  { id: "r19", category: "効率化", name: "中毒性があるものへの課金をやめる" },
  { id: "r20", category: "効率化", name: "承認欲を満たすためだけのSNS投稿をしない" },
  { id: "r21", category: "効率化", name: "2分以内に終わることはすぐにやる" },
  { id: "r22", category: "人間関係", name: "身近な人の話を集中して聞く" },
  { id: "r23", category: "人間関係", name: "人の良いところを見つけて伝える" },
  { id: "r24", category: "人間関係", name: "人にあったら笑顔で元気にあいさつする" },
  { id: "r25", category: "人間関係", name: "いかなる場面でも余白のある伝え方をする" },
  { id: "r26", category: "人間関係", name: "相手の話を聞く時に「目を見る」「うなずく」を徹底し、人の話を遮らない" },
  { id: "r27", category: "仕事", name: "人の話を聞く時はメモを取る" },
  { id: "r28", category: "仕事", name: "人からプッシュ（進捗確認）されないように自分から何をいつまでにやるかを伝える" },
  { id: "r29", category: "仕事", name: "締め切り(約束の時間)を過ぎる場合は、事前に連絡する" },
  { id: "r30", category: "仕事", name: "仕事に取り掛かる前に「ゴール」と「アウトライン」を上司や関係者に確認している" },
  { id: "r31", category: "仕事", name: "質問には結論から簡潔に答える" },
  { id: "r32", category: "仕事", name: "わかったふりをせず、その場で質問して解決する" }
];

var CATEGORIES = ['健康', '自己研鑽', '効率化', '人間関係', '仕事'];

function sendWeeklyReport() {
  var data = getSheetData();
  if (!data.thisWeek) {
    console.log('今週のデータがありません');
    return;
  }

  // 同じ週を二重に送らない（シート未記入のまま実行された場合など）
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(LAST_SENT_PERIOD_KEY) === data.thisWeek.period) {
    console.log('送信済みの週のためスキップします: ' + data.thisWeek.period);
    return;
  }

  var comment = generateClaudeComment(data);
  var flexMessage = buildFlexMessage(data, comment);
  sendLineMessage(flexMessage);
  props.setProperty(LAST_SENT_PERIOD_KEY, data.thisWeek.period);
}

function getSheetData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetById(SHEET_GID);
  if (!sheet) throw new Error('シートが見つかりません（gid: ' + SHEET_GID + '）');

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow <= HEADER_ROWS) return { thisWeek: null, lastWeek: null };

  var range = sheet.getRange(HEADER_ROWS + 1, 1, lastRow - HEADER_ROWS, lastColumn);
  var values = range.getValues();
  var displayValues = range.getDisplayValues();
  var columnMap = buildColumnMap(sheet, lastColumn);

  // 空行を除外する
  var validIndexes = [];
  displayValues.forEach(function(row, i) {
    if (row[0].trim() !== '') validIndexes.push(i);
  });

  if (validIndexes.length === 0) return { thisWeek: null, lastWeek: null };

  function parseRow(index) {
    if (index == null) return null;
    var display = displayValues[index];
    var notAchieved = ROUTINES.filter(function(r) {
      return isNotAchieved(display[columnMap[r.id]]);
    });
    return {
      period: display[0].trim(), // 日付型でもシート上の表示どおりの文字列になる
      rate: parseRate(values[index][1]),
      notAchieved: notAchieved
    };
  }

  var thisWeekIndex = validIndexes[validIndexes.length - 1];
  var lastWeekIndex = validIndexes.length >= 2 ? validIndexes[validIndexes.length - 2] : null;

  return {
    thisWeek: parseRow(thisWeekIndex),
    lastWeek: parseRow(lastWeekIndex)
  };
}

// ヘッダーの項目名からルーティンの列を特定する。
// 1つでも特定できなければ、従来どおりC列から定義順に並んでいるものとして扱う。
function buildColumnMap(sheet, lastColumn) {
  var headerRows = sheet.getRange(1, 1, HEADER_ROWS, lastColumn).getDisplayValues();
  var headers = [];
  for (var c = 0; c < lastColumn; c++) {
    headers.push(normalizeText(headerRows.map(function(row) { return row[c]; }).join('')));
  }

  var map = {};
  var usedColumns = {};
  var unresolved = [];
  ROUTINES.forEach(function(r) {
    var key = normalizeText(r.name);
    var col = headers.findIndex(function(h) { return h !== '' && h.indexOf(key) !== -1; });
    if (col === -1 || usedColumns[col]) {
      unresolved.push(r.id);
    } else {
      map[r.id] = col;
      usedColumns[col] = true;
    }
  });

  if (unresolved.length === 0) return map;

  console.warn('ヘッダーから列を特定できない項目があるため、列の並び順で判定します: ' + unresolved.join(', '));
  var positional = {};
  ROUTINES.forEach(function(r, i) { positional[r.id] = i + 2; });
  return positional;
}

function normalizeText(value) {
  return String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, '');
}

function isNotAchieved(cell) {
  return NOT_ACHIEVED_MARKS.indexOf(normalizeText(cell)) !== -1;
}

function parseRate(rateRaw) {
  var rate;
  if (typeof rateRaw === 'number') {
    // 0.56のような小数なら百分率に、56のような数値ならそのまま
    rate = rateRaw <= 1 ? rateRaw * 100 : rateRaw;
  } else {
    // "56%"のような文字列の場合
    rate = parseFloat(String(rateRaw).replace('%', ''));
  }
  rate = Math.round(rate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    throw new Error('達成率の値が不正です: "' + rateRaw + '"');
  }
  return rate;
}

function generateClaudeComment(data) {
  try {
    return requestClaudeComment(buildPrompt(data));
  } catch (e) {
    // コメント生成に失敗してもレポート自体は届ける
    console.error('Claudeコメントの生成に失敗したため定型文を使います: ' + e);
    return FALLBACK_COMMENT;
  }
}

function buildPrompt(data) {
  var thisWeek = data.thisWeek;
  var lastWeek = data.lastWeek;
  var diff = lastWeek ? thisWeek.rate - lastWeek.rate : null;

  // カテゴリー別に未達成項目を分類
  var categoryMap = {};
  CATEGORIES.forEach(function(cat) { categoryMap[cat] = []; });
  thisWeek.notAchieved.forEach(function(routine) {
    categoryMap[routine.category].push(routine.name);
  });

  // カテゴリー別未達成サマリーを作成
  var categorySummary = CATEGORIES
    .filter(function(cat) { return categoryMap[cat].length > 0; })
    .map(function(cat) {
      return cat + '（' + categoryMap[cat].length + '項目）：' + categoryMap[cat].join('、');
    })
    .join('\n');

  // 最も未達成が多いカテゴリー
  var worstCategory = CATEGORIES.reduce(function(a, b) {
    return categoryMap[a].length >= categoryMap[b].length ? a : b;
  });

  return 'あなたはサプライズスクールのルーティンコーチです。\n'
    + 'サプライズルーティンとは、サプライズスクール受講生に推奨する「人生にプラスの効果がある習慣」を具体化した32項目です。\n'
    + '健康・自己研鑽・効率化・人間関係・仕事の5カテゴリーに分かれており、毎週日曜日に振り返りをします。\n\n'
    + '【今週の結果】\n'
    + '達成率: ' + thisWeek.rate + '%'
    + (diff !== null ? '（先週比: ' + (diff >= 0 ? '+' : '') + diff + '%）' : '（初回）') + '\n'
    + '未達成項目数: ' + thisWeek.notAchieved.length + '項目\n\n'
    + '【カテゴリー別の未達成項目】\n'
    + (categorySummary || 'なし（全項目達成！）') + '\n\n'
    + '【最も課題のあるカテゴリー】\n'
    + (thisWeek.notAchieved.length > 0
      ? worstCategory + '（' + categoryMap[worstCategory].length + '項目未達成）'
      : 'なし') + '\n\n'
    + '以下の条件でワンポイントアドバイスを150字以内で書いてください。\n'
    + '・まず一言で今週を労う\n'
    + '・最も課題のあるカテゴリーに絞って来週の具体的なアクションを1つだけ提案する\n'
    + '・前向きで背中を押すトーンにする\n'
    + '・コメント本文のみ返す（前置き・説明不要）';
}

function requestClaudeComment(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません');

  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // 安全フィルタで誤って断られた場合に、別モデルで自動再試行させる
      'anthropic-beta': 'server-side-fallback-2026-07-01',
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      model: CLAUDE_MODEL,
      // 思考（thinking）にもトークンを使うため、本文150字より多めに確保する
      max_tokens: 2000,
      output_config: { effort: 'low' },
      fallbacks: 'default',
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('Claude API エラー（HTTP ' + code + '）: ' + response.getContentText());
  }

  var result = JSON.parse(response.getContentText());
  if (result.stop_reason !== 'end_turn') {
    throw new Error('応答が正常終了していません（stop_reason: ' + result.stop_reason + '）');
  }

  // 先頭が thinking ブロックの場合があるため、text ブロックだけを取り出す
  var text = (result.content || [])
    .filter(function(block) { return block.type === 'text'; })
    .map(function(block) { return block.text; })
    .join('')
    .trim();
  if (!text) throw new Error('コメントが空です');
  return text;
}

function buildFlexMessage(data, comment) {
  var thisWeek = data.thisWeek;
  var lastWeek = data.lastWeek;
  var rate = thisWeek.rate;
  var diff = lastWeek ? thisWeek.rate - lastWeek.rate : null;

  var rateColor = rate >= 80 ? '#1E90FF' : rate >= 50 ? '#FFA500' : '#FF4444';
  var diffText = diff === null ? '初回記録'
    : (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff) + '%　先週比';
  var diffColor = diff === null ? '#888888' : diff >= 0 ? '#1E90FF' : '#FF4444';

  var itemTexts;
  if (thisWeek.notAchieved.length === 0) {
    itemTexts = ['全項目達成！🎉'];
  } else {
    itemTexts = thisWeek.notAchieved.slice(0, MAX_DISPLAY_ITEMS).map(function(routine) {
      return '・' + routine.name;
    });
    var restCount = thisWeek.notAchieved.length - MAX_DISPLAY_ITEMS;
    if (restCount > 0) itemTexts.push('…ほか' + restCount + '項目');
  }

  return {
    type: 'flex',
    altText: '今週のSR振り返り｜達成率 ' + rate + '%',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#00B900',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'サプライズルーティン振り返り', color: '#ffffff', size: 'md', weight: 'bold', margin: 'xs' },
          { type: 'text', text: thisWeek.period, color: '#ffffff', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            alignItems: 'center',
            contents: [
              { type: 'text', text: '今週の達成率', size: 'xs', color: '#888888', align: 'center' },
              { type: 'text', text: rate + '%', size: 'xxl', weight: 'bold', color: rateColor, align: 'center' },
              { type: 'text', text: diffText, size: 'xs', color: diffColor, align: 'center', margin: 'xs' }
            ]
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '💡 ワンポイントアドバイス', size: 'md', color: '#333333', weight: 'bold' },
              { type: 'text', text: comment, size: 'sm', color: '#333333', wrap: true, margin: 'sm' }
            ]
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '✅ 来週改善したい項目', size: 'md', color: '#333333', weight: 'bold' }
            ].concat(itemTexts.map(function(text) {
              return {
                type: 'text',
                text: text,
                size: 'sm',
                color: '#333333',
                wrap: true,
                margin: 'xs'
              };
            }))
          }
        ]
      }
    }
  };
}

function sendLineMessage(flexMessage) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

  var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      to: userId,
      messages: [flexMessage]
    }),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code !== 200) {
    // 例外にしてトリガーのエラー通知メールで気づけるようにする
    throw new Error('LINE送信に失敗しました（HTTP ' + code + '）: ' + response.getContentText());
  }
  console.log('LINE送信成功');
}

// 毎週日曜 9〜10時に実行するトリガーを作り直す（既存の同じトリガーは削除して二重登録を防ぐ）
function setTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'sendWeeklyReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(9)
    .create();
}

function debugData() {
  var data = getSheetData();
  console.log('thisWeek: ' + JSON.stringify(data.thisWeek));
  console.log('lastWeek: ' + JSON.stringify(data.lastWeek));
}

// 手動で再送したいときに、送信済みの記録を消す
function resetLastSentPeriod() {
  PropertiesService.getScriptProperties().deleteProperty(LAST_SENT_PERIOD_KEY);
}
