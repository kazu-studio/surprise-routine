import { ROUTINES } from "./routines.js";
import { fetchWeek, getApiEndpoint, saveWeek } from "./api.js";

const routineContainer = document.getElementById("routineContainer");
const periodLabel = document.getElementById("periodLabel");
const statsLabel = document.getElementById("statsLabel");
const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");

const STORAGE_PREFIX = "surprise-routine";

const { weekStart, weekEnd, period } = getCurrentWeekPeriod();
const state = {
  weekStart,
  weekEnd,
  results: new Map(ROUTINES.map((routine) => [routine.id, false])),
  saved: false
};

init();

async function init() {
  periodLabel.textContent = period;
  renderRoutines();
  hydrateFromLocal();
  updateStats();
  bindEvents();
  registerServiceWorker();
  maybeShowEndpointHint();
  await hydrateFromApi();
}

function getCurrentWeekPeriod() {
  const now = new Date();
  const day = now.getDay();

  const start = new Date(now);
  if (day === 0) {
    // 今日が日曜日なら、先週（日曜〜土曜）を対象にする
    start.setDate(now.getDate() - 7);
  } else {
    // 日曜以外は、直近の日曜日から始まる今週を対象にする
    start.setDate(now.getDate() - day);
  }
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const weekStart = formatDate(start);
  const weekEnd = formatDate(end);
  return {
    weekStart,
    weekEnd,
    period: `${weekStart}〜${weekEnd}`
  };
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function renderRoutines() {
  const categoryMap = new Map();
  ROUTINES.forEach((routine) => {
    if (!categoryMap.has(routine.category)) {
      categoryMap.set(routine.category, []);
    }
    categoryMap.get(routine.category).push(routine);
  });

  routineContainer.innerHTML = "";
  categoryMap.forEach((routines, category) => {
    const section = document.createElement("section");
    section.className = "category";
    const heading = document.createElement("h2");
    heading.textContent = category;
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "routine-list";
    routines.forEach((routine) => {
      const row = document.createElement("div");
      row.className = "routine-row";
      row.innerHTML = `
        <input type="checkbox" id="${routine.id}" data-id="${routine.id}" />
        <label for="${routine.id}">${routine.name}</label>
      `;
      list.appendChild(row);
    });
    section.appendChild(list);
    routineContainer.appendChild(section);
  });
}

function bindEvents() {
  routineContainer.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
      return;
    }
    const id = input.dataset.id;
    if (!id) return;
    state.results.set(id, input.checked);
    persistLocal();
    updateStats();
  });

  saveBtn.addEventListener("click", async () => {
    if (state.saved) return;
    saveBtn.disabled = true;
    saveStatus.textContent = "保存中です...";
    saveStatus.className = "hint";
    try {
      const payload = {
        weekStart: state.weekStart,
        weekEnd: state.weekEnd,
        results: ROUTINES.map((routine) => ({
          id: routine.id,
          category: routine.category,
          name: routine.name,
          done: Boolean(state.results.get(routine.id))
        }))
      };

      await saveWeek(payload);
      state.saved = true;
      persistLocal();
      updateSaveUi();
      saveStatus.textContent = "保存しました。";
      saveStatus.className = "hint success";
    } catch (error) {
      saveBtn.disabled = false;
      saveStatus.textContent = "保存に失敗しました。GAS URLや公開設定を確認してください。";
      saveStatus.className = "hint error";
    }
  });
}

function updateStats() {
  const doneCount = Array.from(state.results.values()).filter(Boolean).length;
  const total = ROUTINES.length;
  const percent = Math.round((doneCount / total) * 100);
  statsLabel.textContent = `達成: ${doneCount}/${total}（${percent}%）`;
}

function getStorageKey() {
  return `${STORAGE_PREFIX}:${state.weekStart}`;
}

function persistLocal() {
  const data = {
    weekStart: state.weekStart,
    weekEnd: state.weekEnd,
    saved: state.saved,
    results: Object.fromEntries(state.results.entries())
  };
  window.localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

function hydrateFromLocal() {
  const raw = window.localStorage.getItem(getStorageKey());
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.results && typeof parsed.results === "object") {
      Object.entries(parsed.results).forEach(([id, done]) => {
        if (state.results.has(id)) {
          state.results.set(id, Boolean(done));
        }
      });
    }
    state.saved = Boolean(parsed.saved);
    reflectCheckboxes();
    updateSaveUi();
  } catch {
    saveStatus.textContent = "ローカル保存データの読み込みに失敗しました。";
    saveStatus.className = "hint error";
  }
}

async function hydrateFromApi() {
  try {
    const data = await fetchWeek(state.weekStart);
    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      return;
    }
    data.results.forEach((row) => {
      if (row.id && state.results.has(row.id)) {
        state.results.set(row.id, Boolean(row.done));
      }
    });
    state.saved = true;
    reflectCheckboxes();
    updateStats();
    updateSaveUi();
    persistLocal();
  } catch {
    // 未保存週ではエラーになるケースがあるため握りつぶす
  }
}

function reflectCheckboxes() {
  const checkboxes = routineContainer.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    if (!(checkbox instanceof HTMLInputElement)) return;
    const id = checkbox.dataset.id;
    checkbox.checked = id ? Boolean(state.results.get(id)) : false;
  });
}

function updateSaveUi() {
  if (state.saved) {
    saveBtn.disabled = true;
    saveBtn.textContent = "保存済み";
  } else {
    saveBtn.disabled = false;
    saveBtn.textContent = "今週の記録を保存";
  }
}

function maybeShowEndpointHint() {
  if (getApiEndpoint().includes("YOUR_SCRIPT_ID")) {
    saveStatus.textContent =
      "js/api.js の GAS URL を本番URLに変更すると保存・集計が使えます。";
    saveStatus.className = "hint";
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // オフライン対応は任意のため失敗時は無視
      });
    });
  }
}
