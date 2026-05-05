import { fetchHistory, fetchSummary, fetchWeek } from "./api.js";
import { ROUTINES, ROUTINE_MAP } from "./routines.js";

const sortSelect = document.getElementById("sortSelect");
const summaryContainer = document.getElementById("summaryContainer");
const historyWeekSelect = document.getElementById("historyWeekSelect");
const weekDetailContainer = document.getElementById("weekDetailContainer");

const STORAGE_PREFIX = "surprise-routine:";
let summaryRows = [];
let historyWeeks = [];

init();

async function init() {
  bindEvents();
  await Promise.all([loadSummary(), loadHistory()]);
  registerServiceWorker();
}

function bindEvents() {
  sortSelect.addEventListener("change", () => renderSummary());
  historyWeekSelect.addEventListener("change", async () => {
    const start = historyWeekSelect.value;
    if (!start) return;
    await loadWeekDetail(start);
  });
}

async function loadSummary() {
  try {
    const res = await fetchSummary();
    if (Array.isArray(res?.items) && res.items.length) {
      summaryRows = normalizeSummary(res.items);
      renderSummary();
      return;
    }
  } catch {
    // local fallbackへ
  }
  summaryRows = buildSummaryFromLocal();
  renderSummary();
}

async function loadHistory() {
  try {
    const res = await fetchHistory();
    if (Array.isArray(res?.weeks) && res.weeks.length) {
      historyWeeks = res.weeks;
      renderHistoryOptions();
      await loadWeekDetail(historyWeeks[0].weekStart || historyWeeks[0].start);
      return;
    }
  } catch {
    // local fallbackへ
  }
  historyWeeks = buildHistoryFromLocal();
  renderHistoryOptions();
  if (historyWeeks.length) {
    await loadWeekDetail(historyWeeks[0].start);
  }
}

function normalizeSummary(items) {
  return items.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    achievedWeeks: Number(item.achievedWeeks ?? item.d ?? 0),
    totalWeeks: Number(item.totalWeeks ?? item.t ?? 0),
    rate: Number(item.rate ?? item.f ?? 0)
  }));
}

function buildSummaryFromLocal() {
  const counts = new Map(
    ROUTINES.map((routine) => [
      routine.id,
      { achievedWeeks: 0, totalWeeks: 0, ...routine }
    ])
  );

  const weeks = buildHistoryFromLocal();
  weeks.forEach((week) => {
    const data = readLocalWeek(week.start);
    if (!data?.results) return;
    Object.entries(data.results).forEach(([id, done]) => {
      if (!counts.has(id)) return;
      const row = counts.get(id);
      row.totalWeeks += 1;
      if (done) row.achievedWeeks += 1;
    });
  });

  return Array.from(counts.values()).map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    achievedWeeks: row.achievedWeeks,
    totalWeeks: row.totalWeeks,
    rate: row.totalWeeks === 0 ? 0 : Math.round((row.achievedWeeks / row.totalWeeks) * 100)
  }));
}

function buildHistoryFromLocal() {
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .map((key) => {
      const start = key.slice(STORAGE_PREFIX.length);
      const data = readLocalWeek(start);
      return {
        start,
        end: data?.weekEnd || "",
        period: data?.weekEnd ? `${start}〜${data.weekEnd}` : start
      };
    })
    .sort((a, b) => (a.start < b.start ? 1 : -1));
}

function readLocalWeek(start) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${start}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function renderSummary() {
  if (!summaryRows.length) {
    summaryContainer.innerHTML = `<p class="hint">まだ集計データがありません。</p>`;
    return;
  }

  const mode = sortSelect.value;
  const rows = [...summaryRows];

  if (mode === "rate-desc") {
    rows.sort((a, b) => b.rate - a.rate || a.id.localeCompare(b.id));
  } else {
    rows.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  }

  summaryContainer.innerHTML = rows
    .map(
      (row) => `
      <div class="summary-item">
        <div class="summary-header">
          <span>${escapeHtml(row.category)} / ${escapeHtml(row.name)}</span>
          <span class="summary-rate">${row.rate}%</span>
        </div>
        <div class="meta">${row.achievedWeeks} / ${row.totalWeeks} 週で達成</div>
      </div>
    `
    )
    .join("");
}

function renderHistoryOptions() {
  if (!historyWeeks.length) {
    historyWeekSelect.innerHTML = `<option value="">週データがありません</option>`;
    weekDetailContainer.innerHTML = `<p class="hint">まだ記録がありません。</p>`;
    return;
  }
  historyWeekSelect.innerHTML = historyWeeks
    .map((week) => {
      const start = week.weekStart || week.start;
      const end = week.weekEnd || week.end || "";
      const label = end ? `${start}〜${end}` : start;
      return `<option value="${start}">${escapeHtml(label)}</option>`;
    })
    .join("");
}

async function loadWeekDetail(start) {
  let rows = [];
  try {
    const res = await fetchWeek(start);
    if (Array.isArray(res?.results)) {
      rows = res.results.map((item) => ({
        id: item.id,
        category: item.category || ROUTINE_MAP.get(item.id)?.category || "",
        name: item.name || ROUTINE_MAP.get(item.id)?.name || item.id,
        done: Boolean(item.done)
      }));
    }
  } catch {
    // local fallbackへ
  }

  if (!rows.length) {
    const local = readLocalWeek(start);
    if (local?.results) {
      rows = Object.entries(local.results).map(([id, done]) => {
        const meta = ROUTINE_MAP.get(id) || { category: "", name: id };
        return { id, category: meta.category, name: meta.name, done: Boolean(done) };
      });
    }
  }

  if (!rows.length) {
    weekDetailContainer.innerHTML = `<p class="hint">この週の記録が見つかりません。</p>`;
    return;
  }

  rows.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  weekDetailContainer.innerHTML = rows
    .map(
      (row) => `
      <div class="summary-item">
        <div class="summary-header">
          <span>${escapeHtml(row.category)} / ${escapeHtml(row.name)}</span>
          <span class="${row.done ? "success" : "error"}">${row.done ? "できた" : "できなかった"}</span>
        </div>
      </div>
    `
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // 任意機能なので失敗を無視
      });
    });
  }
}
