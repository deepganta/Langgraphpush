const STORAGE_GOALS = "nutrition_tracker_goals_v1";
const STORAGE_API_URL = "nutrition_tracker_api_url_v1";
const STORAGE_LOCAL_ENTRIES = "nutrition_tracker_local_entries_v1";

const DEFAULT_GOALS = {
  calories: 2200,
  protein: 140,
  fiber: 35
};

const IS_HOSTED_FRONTEND = window.location.hostname.endsWith("github.io");
const DEFAULT_API_URL = IS_HOSTED_FRONTEND ? "" : "http://localhost:8787/api";

const mealForm = document.querySelector("#meal-form");
const goalForm = document.querySelector("#goal-form");
const statusNode = document.querySelector("#status");
const mealLogBody = document.querySelector("#meal-log-body");

const activeDateInput = document.querySelector("#active-date");
const foodNameInput = document.querySelector("#food-name");
const gramsInput = document.querySelector("#grams");
const mealTypeInput = document.querySelector("#meal-type");
const mealTimeInput = document.querySelector("#meal-time");
const mealImageInput = document.querySelector("#meal-image");
const apiUrlInput = document.querySelector("#api-url");
const allowAiInput = document.querySelector("#allow-ai");
const preferAiInput = document.querySelector("#prefer-ai");
const manualCaloriesInput = document.querySelector("#manual-calories");
const manualProteinInput = document.querySelector("#manual-protein");
const manualFiberInput = document.querySelector("#manual-fiber");

const clearImageButton = document.querySelector("#clear-image");
const clearDayButton = document.querySelector("#clear-day");
const saveMealButton = document.querySelector("#save-meal");

const totalCaloriesNode = document.querySelector("#total-calories");
const totalProteinNode = document.querySelector("#total-protein");
const totalFiberNode = document.querySelector("#total-fiber");

const meterCaloriesNode = document.querySelector("#meter-calories");
const meterProteinNode = document.querySelector("#meter-protein");
const meterFiberNode = document.querySelector("#meter-fiber");

const goalCaloriesState = document.querySelector("#goal-calories-state");
const goalProteinState = document.querySelector("#goal-protein-state");
const goalFiberState = document.querySelector("#goal-fiber-state");

const goalCaloriesInput = document.querySelector("#goal-calories");
const goalProteinInput = document.querySelector("#goal-protein");
const goalFiberInput = document.querySelector("#goal-fiber");

const emptyRowTemplate = document.querySelector("#empty-row-template");

let entries = [];
let goals = { ...DEFAULT_GOALS };
let loadSequence = 0;

function nowDateISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeHM() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function normalizeApiUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function getConfiguredApiUrl() {
  const saved = normalizeApiUrl(localStorage.getItem(STORAGE_API_URL));
  if (saved) return saved;
  return normalizeApiUrl(DEFAULT_API_URL);
}

function saveApiUrl(url) {
  const clean = normalizeApiUrl(url);
  if (clean) {
    localStorage.setItem(STORAGE_API_URL, clean);
  } else {
    localStorage.removeItem(STORAGE_API_URL);
  }
  return clean;
}

function roundValue(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatValue(value) {
  return roundValue(value).toFixed(1).replace(/\.0$/, "");
}

function newLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function setStatus(message, type = "") {
  statusNode.textContent = message || "";
  statusNode.classList.remove("is-error", "is-ok");
  if (type === "error") statusNode.classList.add("is-error");
  if (type === "ok") statusNode.classList.add("is-ok");
}

function loadGoals() {
  try {
    const raw = localStorage.getItem(STORAGE_GOALS);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      goals = {
        calories: safeNumber(parsed.calories) || DEFAULT_GOALS.calories,
        protein: safeNumber(parsed.protein) || DEFAULT_GOALS.protein,
        fiber: safeNumber(parsed.fiber) || DEFAULT_GOALS.fiber
      };
      return;
    }
  } catch (error) {
    console.error("Failed to load goals", error);
  }
  goals = { ...DEFAULT_GOALS };
}

function saveGoals() {
  localStorage.setItem(STORAGE_GOALS, JSON.stringify(goals));
}

function loadLocalEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_ENTRIES);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load local entries", error);
    return [];
  }
}

function saveLocalEntries(localEntries) {
  localStorage.setItem(STORAGE_LOCAL_ENTRIES, JSON.stringify(localEntries));
}

function getActiveDate() {
  return activeDateInput.value || nowDateISO();
}

function mealsForActiveDate() {
  const date = getActiveDate();
  return entries
    .filter((entry) => entry.date === date)
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

function totalsForDate(date) {
  return entries
    .filter((entry) => entry.date === date)
    .reduce(
      (acc, entry) => {
        acc.calories += safeNumber(entry.calories);
        acc.protein += safeNumber(entry.protein);
        acc.fiber += safeNumber(entry.fiber);
        return acc;
      },
      { calories: 0, protein: 0, fiber: 0 }
    );
}

function percentOfGoal(total, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((total / goal) * 100)));
}

function updateGoalProgress(total, goal, meterNode, labelNode) {
  const pct = percentOfGoal(total, goal);
  meterNode.style.width = `${pct}%`;
  labelNode.textContent = `${pct}% of goal`;
}

function renderTotals() {
  const activeDate = getActiveDate();
  const totals = totalsForDate(activeDate);

  totalCaloriesNode.textContent = formatValue(totals.calories);
  totalProteinNode.textContent = formatValue(totals.protein);
  totalFiberNode.textContent = formatValue(totals.fiber);

  updateGoalProgress(totals.calories, goals.calories, meterCaloriesNode, goalCaloriesState);
  updateGoalProgress(totals.protein, goals.protein, meterProteinNode, goalProteinState);
  updateGoalProgress(totals.fiber, goals.fiber, meterFiberNode, goalFiberState);
}

function sourcePill(source) {
  const clean = String(source || "unknown").toLowerCase();
  const labelMap = {
    "local-db": "Local DB",
    cache: "Cache",
    openai: "GPT-4",
    manual: "Manual",
    local-browser: "Browser"
  };
  const label = labelMap[clean] || clean;
  return `<span class="source-pill source-${clean}">${label}</span>`;
}

function renderMealTable() {
  const dayMeals = mealsForActiveDate();
  mealLogBody.innerHTML = "";

  if (!dayMeals.length) {
    const row = emptyRowTemplate.content.cloneNode(true);
    mealLogBody.appendChild(row);
    return;
  }

  const fragment = document.createDocumentFragment();

  dayMeals.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.time || "--:--"}</td>
      <td>${entry.mealType || "Other"}</td>
      <td>${entry.foodName}</td>
      <td>${formatValue(entry.grams)} g</td>
      <td>${formatValue(entry.calories)}</td>
      <td>${formatValue(entry.protein)} g</td>
      <td>${formatValue(entry.fiber)} g</td>
      <td>${sourcePill(entry.source)}</td>
      <td>${entry.imageName ? entry.imageName : "-"}</td>
      <td><button class="row-delete" type="button" data-id="${entry.id}">Delete</button></td>
    `;
    fragment.appendChild(row);
  });

  mealLogBody.appendChild(fragment);
}

function render() {
  renderTotals();
  renderMealTable();
}

function validateMealInput(foodName, grams) {
  const trimmedFood = String(foodName || "").trim();
  const gramsNumber = safeNumber(grams);

  if (!trimmedFood) throw new Error("Enter a food name.");
  if (!gramsNumber || gramsNumber <= 0) throw new Error("Enter grams greater than zero.");
  if (gramsNumber > 3000) throw new Error("Grams value is too high. Use a value up to 3000g.");

  return {
    foodName: trimmedFood,
    grams: gramsNumber
  };
}

function parseOptionalValue(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) return null;

  const num = Number(text);
  if (!Number.isFinite(num)) throw new Error("Manual nutrition values must be numeric.");
  if (num < 0) throw new Error("Manual nutrition values cannot be negative.");
  return num;
}

function parseManualNutrition() {
  const manualCalories = parseOptionalValue(manualCaloriesInput.value);
  const manualProtein = parseOptionalValue(manualProteinInput.value);
  const manualFiber = parseOptionalValue(manualFiberInput.value);

  const hasCalories = manualCalories !== null;
  const hasProtein = manualProtein !== null;

  if (!hasCalories && !hasProtein && manualFiber === null) return null;
  if (hasCalories !== hasProtein) {
    throw new Error("Enter both manual calories and manual protein, or leave both empty.");
  }
  if (!hasCalories || !hasProtein) {
    throw new Error("Manual fiber alone is not allowed. Add calories and protein too.");
  }

  if (manualCalories > 5000 || manualProtein > 500 || (manualFiber !== null && manualFiber > 250)) {
    throw new Error("Manual nutrition values are too high. Please verify and try again.");
  }

  return {
    calories: manualCalories,
    protein: manualProtein,
    fiber: manualFiber ?? 0
  };
}

function makeNoBackendError() {
  const error = new Error("No backend API configured.");
  error.code = "NO_BACKEND";
  return error;
}

function isBackendUnavailable(error) {
  return error && (error.code === "NO_BACKEND" || error.code === "BACKEND_UNREACHABLE");
}

async function apiRequest(path, options = {}) {
  const base = saveApiUrl(apiUrlInput.value);
  if (!base) {
    throw makeNoBackendError();
  }

  const endpoint = `${base}${path}`;

  const response = await fetch(endpoint, options).catch(() => {
    const error = new Error("Could not connect to backend API.");
    error.code = "BACKEND_UNREACHABLE";
    throw error;
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload && payload.error ? payload.error : "Backend request failed.";
    throw new Error(message);
  }

  return payload;
}

async function requestNutrition({ foodName, grams, allowAi, preferAi }) {
  return apiRequest("/nutrition/estimate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      foodName,
      grams,
      allowAI: Boolean(allowAi),
      preferAI: Boolean(preferAi)
    })
  });
}

async function fetchEntriesForDate(date) {
  const payload = await apiRequest(`/entries?date=${encodeURIComponent(date)}`);
  return Array.isArray(payload.entries) ? payload.entries : [];
}

async function createEntry(payload) {
  return apiRequest("/entries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function deleteEntry(entryId) {
  return apiRequest(`/entries/${encodeURIComponent(entryId)}`, {
    method: "DELETE"
  });
}

async function clearDateEntries(date) {
  return apiRequest(`/entries?date=${encodeURIComponent(date)}`, {
    method: "DELETE"
  });
}

function createLocalEntry(payload) {
  const localEntries = loadLocalEntries();
  const entry = {
    id: newLocalId(),
    ...payload,
    source: payload.source === "manual" ? "manual" : payload.source || "local-browser"
  };
  localEntries.push(entry);
  saveLocalEntries(localEntries);
  return entry;
}

function fetchLocalEntriesForDate(date) {
  return loadLocalEntries().filter((entry) => entry.date === date);
}

function deleteLocalEntry(entryId) {
  const localEntries = loadLocalEntries();
  const filtered = localEntries.filter((entry) => String(entry.id) !== String(entryId));
  saveLocalEntries(filtered);
}

function clearLocalDateEntries(date) {
  const localEntries = loadLocalEntries();
  const filtered = localEntries.filter((entry) => entry.date !== date);
  saveLocalEntries(filtered);
}

async function loadEntriesForActiveDate({ silent = false } = {}) {
  const seq = ++loadSequence;
  const date = getActiveDate();

  try {
    const fetched = await fetchEntriesForDate(date);
    if (seq !== loadSequence) return;
    entries = fetched;
    render();

    if (!silent) {
      setStatus(`Loaded ${fetched.length} meal(s) from backend database for ${date}.`, "ok");
    }
  } catch (error) {
    if (seq !== loadSequence) return;

    if (isBackendUnavailable(error)) {
      entries = fetchLocalEntriesForDate(date);
      render();
      if (!silent) {
        setStatus("Backend not connected. Using browser-only storage for this device.");
      }
      return;
    }

    entries = [];
    render();
    setStatus(error.message || "Could not load meals.", "error");
  }
}

function resetMealFormKeepDefaults() {
  const preservedDate = getActiveDate();
  const preservedApiUrl = normalizeApiUrl(apiUrlInput.value);
  const preservedAllowAi = allowAiInput.checked;
  const preservedPreferAi = preferAiInput.checked;

  mealForm.reset();
  activeDateInput.value = preservedDate;
  apiUrlInput.value = preservedApiUrl;
  allowAiInput.checked = preservedAllowAi;
  preferAiInput.checked = preservedPreferAi;
  mealTypeInput.value = "Breakfast";
  mealTimeInput.value = nowTimeHM();
}

async function handleMealSubmit(event) {
  event.preventDefault();
  setStatus("");

  try {
    const { foodName, grams } = validateMealInput(foodNameInput.value, gramsInput.value);
    const manualNutrition = parseManualNutrition();

    const allowAi = allowAiInput.checked;
    const preferAi = preferAiInput.checked;

    saveMealButton.disabled = true;

    let nutrition = null;
    let source = "unknown";
    let matchedFood = foodName;

    if (manualNutrition) {
      nutrition = manualNutrition;
      source = "manual";
      setStatus("Using manual calories/protein values...");
    } else {
      setStatus(preferAi ? "Estimating with GPT-4..." : "Estimating nutrition values...");
      const estimate = await requestNutrition({ foodName, grams, allowAi, preferAi });
      nutrition = {
        calories: safeNumber(estimate.calories),
        protein: safeNumber(estimate.protein),
        fiber: safeNumber(estimate.fiber)
      };
      source = String(estimate.source || "unknown");
      matchedFood = String(estimate.matchedFood || foodName);
    }

    const payload = {
      date: getActiveDate(),
      time: mealTimeInput.value || nowTimeHM(),
      mealType: mealTypeInput.value || "Other",
      foodName,
      grams,
      calories: nutrition.calories,
      protein: nutrition.protein,
      fiber: nutrition.fiber,
      source,
      matchedFood,
      imageName: mealImageInput.files && mealImageInput.files[0] ? mealImageInput.files[0].name : ""
    };

    try {
      await createEntry(payload);
      await loadEntriesForActiveDate({ silent: true });
      setStatus(`Added ${foodName} (${grams}g). Saved to backend database.`, "ok");
    } catch (error) {
      if (!isBackendUnavailable(error)) {
        throw error;
      }

      if (!manualNutrition) {
        throw new Error("Backend is unavailable. Use manual calories/protein or provide a working API URL.");
      }

      createLocalEntry({ ...payload, source: "manual" });
      await loadEntriesForActiveDate({ silent: true });
      setStatus(`Added ${foodName} (${grams}g). Saved only in this browser because backend is unavailable.`, "ok");
    }

    resetMealFormKeepDefaults();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not add meal.", "error");
  } finally {
    saveMealButton.disabled = false;
  }
}

function handleGoalSubmit(event) {
  event.preventDefault();

  goals = {
    calories: Math.max(0, safeNumber(goalCaloriesInput.value)),
    protein: Math.max(0, safeNumber(goalProteinInput.value)),
    fiber: Math.max(0, safeNumber(goalFiberInput.value))
  };

  saveGoals();
  renderTotals();
  setStatus("Daily goals updated.", "ok");
}

async function handleRowDelete(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest("button.row-delete");
  if (!button) return;

  const id = button.getAttribute("data-id");
  if (!id) return;

  try {
    await deleteEntry(id);
    await loadEntriesForActiveDate({ silent: true });
    setStatus("Meal deleted from backend database.", "ok");
  } catch (error) {
    if (isBackendUnavailable(error)) {
      deleteLocalEntry(id);
      await loadEntriesForActiveDate({ silent: true });
      setStatus("Meal deleted from browser-only storage.", "ok");
      return;
    }
    setStatus(error.message || "Could not delete meal.", "error");
  }
}

async function handleClearSelectedDay() {
  const date = getActiveDate();
  const dayMeals = mealsForActiveDate();

  if (!dayMeals.length) {
    setStatus("No meals to clear for selected day.");
    return;
  }

  const confirmClear = window.confirm(`Delete all ${dayMeals.length} meal(s) for ${date}?`);
  if (!confirmClear) return;

  try {
    await clearDateEntries(date);
    await loadEntriesForActiveDate({ silent: true });
    setStatus(`Cleared all meals for ${date} from backend database.`, "ok");
  } catch (error) {
    if (isBackendUnavailable(error)) {
      clearLocalDateEntries(date);
      await loadEntriesForActiveDate({ silent: true });
      setStatus(`Cleared all meals for ${date} from browser-only storage.`, "ok");
      return;
    }
    setStatus(error.message || "Could not clear selected day.", "error");
  }
}

function syncAiToggles() {
  preferAiInput.disabled = !allowAiInput.checked;
  if (!allowAiInput.checked) {
    preferAiInput.checked = false;
  }
}

function setInitialFormValues() {
  activeDateInput.value = nowDateISO();
  mealTimeInput.value = nowTimeHM();
  mealTypeInput.value = "Breakfast";

  apiUrlInput.value = getConfiguredApiUrl();

  goalCaloriesInput.value = goals.calories;
  goalProteinInput.value = goals.protein;
  goalFiberInput.value = goals.fiber;

  allowAiInput.checked = true;
  preferAiInput.checked = true;
  syncAiToggles();
}

function wireEvents() {
  mealForm.addEventListener("submit", handleMealSubmit);
  goalForm.addEventListener("submit", handleGoalSubmit);
  mealLogBody.addEventListener("click", handleRowDelete);

  activeDateInput.addEventListener("change", () => {
    loadEntriesForActiveDate({ silent: true });
  });

  clearImageButton.addEventListener("click", () => {
    mealImageInput.value = "";
    setStatus("Image removed from current form.");
  });

  clearDayButton.addEventListener("click", handleClearSelectedDay);

  apiUrlInput.addEventListener("change", () => {
    apiUrlInput.value = saveApiUrl(apiUrlInput.value);
  });

  allowAiInput.addEventListener("change", syncAiToggles);
}

async function init() {
  loadGoals();
  setInitialFormValues();
  wireEvents();
  render();
  await loadEntriesForActiveDate({ silent: false });
}

init();
