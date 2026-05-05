/** 書き込み先スプレッドシート（本番ID） */
var SPREADSHEET_ID = "1hGSgv1kfu-eWoGTgg7zEhyj4ZJfmuXNC7IVdi0Ux1ho";
/** 既存シート（URLの gid と同じ） */
var SHEET_GID = 1098239501;

/**
 * js/routines.js の ROUTINES と同一順序・内容（項目列の順番はここに固定）
 */
var ROUTINES = [
  { id: "r01", category: "健康", name: "早寝早起きする" },
  { id: "r02", category: "健康", name: "睡眠6時間以上とる" },
  { id: "r03", category: "健康", name: "毎日20分以上の軽い運動をする" },
  { id: "r04", category: "健康", name: "毎日湯船に入る（39〜40℃・10〜15分）" },
  { id: "r05", category: "健康", name: "GI値の高い炭水化物・揚げ物を控える" },
  { id: "r06", category: "健康", name: "夕食・飲酒は寝る2時間前に終える" },
  { id: "r07", category: "健康", name: "仕事中は背筋を伸ばして良い姿勢を保つ" },
  { id: "r08", category: "健康", name: "毎晩デンタルフロスをする" },
  { id: "r09", category: "健康", name: "体重を測って記録する" },
  { id: "r10", category: "健康", name: "保湿して日焼け止めを塗る" },
  { id: "r11", category: "健康", name: "仕事や自己研鑽から離れてリラックスできる時間を30分以上つくる" },
  { id: "r12", category: "自己研鑽", name: "筋トレする（軽い運動でもOK）" },
  { id: "r13", category: "自己研鑽", name: "隙間時間にゴシップとショート動画を見ない" },
  { id: "r14", category: "自己研鑽", name: "毎日良かったことや新しい発見を人に話すか書き出す" },
  { id: "r15", category: "自己研鑽", name: "朝活の時間を30分以上つくる" },
  { id: "r16", category: "自己研鑽", name: "誰が見ても完璧なほど身だしなみを整える" },
  { id: "r17", category: "効率化", name: "部屋を常に整理整頓・清潔にする" },
  { id: "r18", category: "効率化", name: "中毒性があるものへの課金をやめる" },
  { id: "r19", category: "効率化", name: "承認欲求を満たすためだけのSNS投稿をしない" },
  { id: "r20", category: "効率化", name: "2分以内に終わることはすぐにやる" },
  { id: "r21", category: "人間関係", name: "身近な人の話を集中して聞く" },
  { id: "r22", category: "人間関係", name: "人の良いところを見つけて伝える" },
  { id: "r23", category: "人間関係", name: "人にあったら笑顔で元気にあいさつする" },
  { id: "r24", category: "人間関係", name: "いかなる場面でも余白のある伝え方をする" },
  { id: "r25", category: "人間関係", name: "相手の話を聞く時に「目を見る」「うなずく」を徹底し、人の話を遮らない" },
  { id: "r26", category: "仕事", name: "人の話を聞く時はメモを取る" },
  { id: "r27", category: "仕事", name: "人からプッシュされないように自分から進捗を共有する" },
  { id: "r28", category: "仕事", name: "締め切りを過ぎる場合は事前に連絡する" },
  { id: "r29", category: "仕事", name: "仕事に取り掛かる前にゴールとアウトラインを確認する" },
  { id: "r30", category: "仕事", name: "質問には結論から簡潔に答える" },
  { id: "r31", category: "仕事", name: "わかったふりをせず、その場で質問して解決する" },
  { id: "r32", category: "仕事", name: "朝活の時間を30分以上つくる（仕事準備）" }
];

var COL_PERIOD = 1;
var COL_AVG_RATE = 2;
var COL_FIRST_ROUTINE = 3;
var NUM_COLS = COL_FIRST_ROUTINE - 1 + ROUTINES.length;

var LABEL_DONE = "○";
var LABEL_NOT_DONE = "×";

function doPost(e) {
  try {
    var data = JSON.parse((e.postData && e.postData.contents) || "{}");
    if (data.action !== "save") {
      return jsonResponse({ status: "error", message: "invalid action" });
    }

    var sheet = getSheet_();
    ensureHeader_(sheet);

    var weekStart = normalizeDateToken_(data.weekStart);
    var weekEnd = normalizeDateToken_(data.weekEnd);
    if (!weekStart || !weekEnd) {
      return jsonResponse({ status: "error", message: "weekStart and weekEnd are required" });
    }

    var period = weekStart + "〜" + weekEnd;
    var results = Array.isArray(data.results) ? data.results : [];
    var idToDone = {};
    results.forEach(function (r) {
      if (r && r.id) idToDone[r.id] = Boolean(r.done);
    });

    var routineCells = ROUTINES.map(function (routine) {
      return idToDone[routine.id] ? LABEL_DONE : LABEL_NOT_DONE;
    });

    var doneCount = ROUTINES.reduce(function (n, routine) {
      return n + (idToDone[routine.id] ? 1 : 0);
    }, 0);
    var avgRate =
      ROUTINES.length === 0
        ? 0
        : Math.round((doneCount / ROUTINES.length) * 100);
    var avgRateStr = avgRate + "%";

    var row = [period, avgRateStr].concat(routineCells);

    var existing = findAllDataRowsByWeekStart_(sheet, weekStart);
    if (existing.length) {
      var keep = existing[0];
      for (var k = existing.length - 1; k >= 1; k--) {
        sheet.deleteRow(existing[k]);
      }
      sheet.getRange(keep, 1, 1, NUM_COLS).setValues([row]);
    } else {
      var newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, NUM_COLS).setValues([row]);
    }

    return jsonResponse({ status: "ok" });
  } catch (err) {
    return jsonResponse({ status: "error", message: String(err) });
  }
}

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "";
  switch (action) {
    case "summary":
      return jsonResponse({ status: "ok", items: getSummary_() });
    case "history":
      return jsonResponse({ status: "ok", weeks: getHistory_() });
    case "week":
      return jsonResponse({
        status: "ok",
        results: getWeek_(e.parameter.start || "")
      });
    default:
      return jsonResponse({
        status: "error",
        message: "action must be summary | history | week"
      });
  }
}

/** 項目ごとの累計達成率（履歴行が対象。ヘッダー行・空行はスキップ） */
function getSummary_() {
  var sheet = getSheet_();
  var rows = getDataRows2D_(sheet);
  if (rows.length === 0) return [];

  var totals = ROUTINES.map(function () {
    return { achievedWeeks: 0, totalWeeks: 0 };
  });

  rows.forEach(function (row) {
    var start = parsePeriodStart_(row[COL_PERIOD - 1]);
    if (!start) return;

    var isValidRow = true;
    for (var i = 0; i < ROUTINES.length; i++) {
      var cell = row[COL_FIRST_ROUTINE - 1 + i];
      var s = cell != null ? String(cell).trim() : "";
      if (s !== LABEL_DONE && s !== LABEL_NOT_DONE) {
        isValidRow = false;
        break;
      }
    }
    if (!isValidRow) return;

    for (var j = 0; j < ROUTINES.length; j++) {
      var val = String(row[COL_FIRST_ROUTINE - 1 + j]).trim();
      totals[j].totalWeeks += 1;
      if (val === LABEL_DONE) totals[j].achievedWeeks += 1;
    }
  });

  return ROUTINES.map(function (routine, idx) {
    var t = totals[idx];
    var rate =
      t.totalWeeks === 0 ? 0 : Math.round((t.achievedWeeks / t.totalWeeks) * 100);
    return {
      id: routine.id,
      category: routine.category,
      name: routine.name,
      achievedWeeks: t.achievedWeeks,
      totalWeeks: t.totalWeeks,
      rate: rate
    };
  });
}

/** 過去の週一覧（期間の開始日降順） */
function getHistory_() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var numCols = Math.min(NUM_COLS, Math.max(sheet.getLastColumn(), NUM_COLS));
  var values = sheet.getRange(2, 1, lastRow, numCols).getValues();

  var seen = {};
  var list = [];

  values.forEach(function (row) {
    var periodCell = row[COL_PERIOD - 1];
    if (periodCell == null || String(periodCell).trim() === "") return;

    var start = parsePeriodStart_(periodCell);
    if (!start) return;

    var parts = String(periodCell).split("〜");
    var end = parts.length > 1 ? String(parts[1]).trim() : "";

    if (!seen[start]) {
      seen[start] = true;
      list.push({
        weekStart: start,
        weekEnd: end,
        period: String(periodCell).trim()
      });
    }
  });

  list.sort(function (a, b) {
    if (a.weekStart === b.weekStart) return 0;
    return a.weekStart < b.weekStart ? 1 : -1;
  });

  return list;
}

/** 特定週（開始日で一致）の results 配列 */
function getWeek_(start) {
  var token = normalizeDateToken_(start);
  if (!token) return [];

  var sheet = getSheet_();
  var rows = findAllDataRowsByWeekStart_(sheet, token);
  var dataRowIndex = rows.length ? rows[0] : null;
  if (!dataRowIndex) return [];

  var row = sheet
    .getRange(dataRowIndex, COL_FIRST_ROUTINE, dataRowIndex, COL_FIRST_ROUTINE - 1 + ROUTINES.length)
    .getValues()[0];

  return ROUTINES.map(function (routine, i) {
    var cell = row[i];
    var s = cell != null ? String(cell).trim() : "";
    var done = s === LABEL_DONE;
    return {
      id: routine.id,
      category: routine.category,
      name: routine.name,
      done: done
    };
  });
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetById(SHEET_GID);
  if (!sheet) throw new Error("シートが見つかりません (gid: " + SHEET_GID + ")");
  return sheet;
}

/** A1 が空ならヘッダー行を作成 */
function ensureHeader_(sheet) {
  var a1 = sheet.getRange(1, 1).getValue();
  if (a1 != null && String(a1).trim() !== "") return;

  var header = ["期間", "平均達成率"].concat(
    ROUTINES.map(function (r) {
      return r.name;
    })
  );
  sheet.getRange(1, 1, 1, NUM_COLS).setValues([header]);
}

/**
 * 同一週の行番号（1始まり）を上から順に配列で返す。なければ []。
 */
function findAllDataRowsByWeekStart_(sheet, weekStart) {
  var target = normalizeDateToken_(weekStart);
  if (!target) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var out = [];
  for (var r = 2; r <= lastRow; r++) {
    var cell = sheet.getRange(r, COL_PERIOD).getValue();
    var start = parsePeriodStart_(cell);
    if (start === target) out.push(r);
  }
  return out;
}

function parsePeriodStart_(periodCell) {
  if (periodCell == null) return "";
  var s = String(periodCell).trim();
  if (!s) return "";
  var parts = s.split("〜");
  return normalizeDateToken_(parts[0]);
}

/** YYYY/MM/DD 形式に正規化（前後空白除去） */
function normalizeDateToken_(value) {
  if (value == null) return "";
  return String(value).trim();
}

/** データ行を2次元配列で取得（ヘッダー除く）。列数は NUM_COLS に揃える */
function getDataRows2D_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var width = Math.max(NUM_COLS, sheet.getLastColumn());
  var raw = sheet.getRange(2, 1, lastRow, width).getValues();
  return raw.filter(function (row) {
    return row[COL_PERIOD - 1] != null && String(row[COL_PERIOD - 1]).trim() !== "";
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
