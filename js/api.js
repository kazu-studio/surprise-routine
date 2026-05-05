const DEFAULT_ENDPOINT = "https://script.google.com/macros/s/AKfycbwsJh1ChRYGRG33ivb65Q_IVED48LldMJfuHVI5rdhU3Vf_jDWle9igYakWV_28BB7L/exec";
const GAS_ENDPOINT = window.localStorage.getItem("gasEndpoint") || DEFAULT_ENDPOINT;

function buildUrl(params) {
  const url = new URL(GAS_ENDPOINT);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function request(pathParams, options = {}) {
  const response = await fetch(buildUrl(pathParams), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    throw new Error(`APIエラー: ${response.status}`);
  }
  return response.json();
}

export async function saveWeek(payload) {
  return request({}, {
    method: "POST",
    body: {
      action: "save",
      ...payload
    }
  });
}

export async function fetchSummary() {
  return request({ action: "summary" });
}

export async function fetchHistory() {
  return request({ action: "history" });
}

export async function fetchWeek(weekStart) {
  return request({ action: "week", start: weekStart });
}

export function getApiEndpoint() {
  return GAS_ENDPOINT;
}
