var SPREADSHEET_ID = '1hGSgv1kfu-eWoGTgg7zEhyj4ZJfmuXNC7IVdi0Ux1ho';
var SHEET_GID = 1098239501;

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
  { id: "r13", category: "自己研鑽", name: "筋トレする（軽い運動でもOK）" },
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

function sendWeeklyReport() {
  var data = getSheetData();
  if (!data.thisWeek) {
    console.log('今週のデータがありません');
    return;
  }
  var comment = generateClaudeComment(data);
  var flexMessage = buildFlexMessage(data, comment);
  sendLineMessage(flexMessage);
}

function getSheetData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetById(SHEET_GID);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return { thisWeek: null, lastWeek: null };

  var rows = sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn()).getValues();

  // 空行を除外する
  var validRows = rows.filter(function(row) {
    return row[0] != null && String(row[0]).trim() !== '';
  });

  if (validRows.length === 0) return { thisWeek: null, lastWeek: null };

  var thisWeekRow = validRows[validRows.length - 1];
  var lastWeekRow = validRows.length >= 2 ? validRows[validRows.length - 2] : null;

  function parseRow(row) {
    if (!row || !row[0]) return null;
    var period = row[0];
    var rateRaw = row[1];
    var rate;
    if (typeof rateRaw === 'number') {
      // 0.56のような小数の場合
      rate = Math.round(rateRaw * 100);
    } else {
      // "56%"のような文字列の場合
      rate = parseInt(String(rateRaw).replace('%', ''), 10);
    }
    var notAchieved = ROUTINES.filter(function(r, i) {
      return String(row[i + 2]).trim() === '✕';
    }).map(function(r) { return r.name; });
    return { period: period, rate: rate, notAchieved: notAchieved };
  }

  return {
    thisWeek: parseRow(thisWeekRow),
    lastWeek: parseRow(lastWeekRow)
  };
}

function generateClaudeComment(data) {
  var thisWeek = data.thisWeek;
  var lastWeek = data.lastWeek;
  var diff = lastWeek ? thisWeek.rate - lastWeek.rate : null;

  // カテゴリー別に未達成項目を分類
  var categoryMap = {
    '健康': [],
    '自己研鑽': [],
    '効率化': [],
    '人間関係': [],
    '仕事': []
  };

  thisWeek.notAchieved.forEach(function(name) {
    var routine = ROUTINES.find(function(r) { return r.name === name; });
    if (routine && categoryMap[routine.category]) {
      categoryMap[routine.category].push(name);
    }
  });

  // カテゴリー別未達成サマリーを作成
  var categorySummary = Object.keys(categoryMap)
    .filter(function(cat) { return categoryMap[cat].length > 0; })
    .map(function(cat) {
      return cat + '（' + categoryMap[cat].length + '項目）：' + categoryMap[cat].join('、');
    })
    .join('\n');

  // 最も未達成が多いカテゴリー
  var worstCategory = Object.keys(categoryMap).reduce(function(a, b) {
    return categoryMap[a].length >= categoryMap[b].length ? a : b;
  });

  var prompt = 'あなたはサプライズスクール（まこなり社長）公認のルーティンコーチです。\n'
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

  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  var result = JSON.parse(response.getContentText());
  return result.content[0].text;
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
            ].concat(thisWeek.notAchieved.slice(0, 5).map(function(item) {
              return {
                type: 'text',
                text: '・' + item,
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

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      to: userId,
      messages: [flexMessage]
    })
  });
}

function setTrigger() {
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(6)
    .create();
}

function debugData() {
  var data = getSheetData();
  console.log('thisWeek: ' + JSON.stringify(data.thisWeek));
  console.log('lastWeek: ' + JSON.stringify(data.lastWeek));
}