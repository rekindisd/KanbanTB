// --- CONFIG ---
const SUPABASE_URL = "https://lbylprmxmwxnwmjahbno.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxieWxwcm14bXd4bndtamFoYm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDA3NTcsImV4cCI6MjA3NjQ3Njc1N30.oDLGNe3c3A5-IYJEBmVxrg4Bxk-F6vtqLgieWWJ8eps";
// --------------

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ACTIVITIES = ["act1", "act2", "act3", "act4", "act5", "act6"];
const ACT_LABELS = [
  "Aktivitas 1",
  "Aktivitas 2",
  "Aktivitas 3",
  "Aktivitas 4",
  "Aktivitas 5",
  "Aktivitas 6",
];

let requisitions = [];

// ---------- UI ----------
const tabList = document.getElementById("tab-list");
const tabKanban = document.getElementById("tab-kanban");
const viewList = document.getElementById("view-list");
const viewKanban = document.getElementById("view-kanban");

tabList.onclick = () => {
  tabList.classList.add("active");
  tabKanban.classList.remove("active");
  viewList.classList.remove("hidden");
  viewKanban.classList.add("hidden");
};
tabKanban.onclick = () => {
  tabKanban.classList.add("active");
  tabList.classList.remove("active");
  viewKanban.classList.remove("hidden");
  viewList.classList.add("hidden");
};

// ---------- Fetch Data ----------
async function fetchRequisitions() {
  const { data, error } = await supabase
    .from("requisitions")
    .select("id, requisition_no, activities, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  requisitions = data;
  renderList();
  renderKanban();
}

// ---------- Render List ----------
function renderList() {
  const tbody = document.getElementById("tbody-list");
  tbody.innerHTML = "";
  requisitions.forEach((r) => {
    const tr = document.createElement("tr");
    const activities = r.activities || {};
    tr.innerHTML = `
      <td>${r.requisition_no}</td>
      ${ACTIVITIES.map(
        (a) => `
        <td>
          <input type="text" placeholder="YYYY-MM-DD or done" data-id="${r.id}" data-act="${a}" value="${
          activities[a] ?? ""
        }">
          <button class="save" data-id="${r.id}" data-act="${a}">💾</button>
        </td>`
      ).join("")}
      <td>${r.updated_at ? new Date(r.updated_at).toLocaleString() : ""}</td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".save").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      const input = document.querySelector(`input[data-id='${id}'][data-act='${act}']`);
      const val = input.value.trim() || null;
      await updateActivity(id, act, val);
    };
  });
}

// ---------- Update ----------
async function updateActivity(id, act, val) {
  const row = requisitions.find((r) => r.id === id);
  if (!row) return;
  const newActs = { ...row.activities, [act]: val };
  const { error } = await supabase
    .from("requisitions")
    .update({ activities: newActs })
    .eq("id", id);
  if (error) alert("Update gagal: " + error.message);
}

// ---------- Render Kanban ----------
function renderKanban() {
  const kanban = document.getElementById("kanban-columns");
  kanban.innerHTML = "";

  ACT_LABELS.forEach((label, i) => {
    const col = document.createElement("div");
    col.className = "column";
    col.innerHTML = `<h3>${label}</h3><div id="col-${i}"></div>`;
    kanban.appendChild(col);
  });

  requisitions.forEach((r) => {
    const last = getLastActivityIndex(r.activities || {});
    const targetCol = document.getElementById(`col-${last}`);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<div class="title">${r.requisition_no}</div>
      <div class="info">${formatActivities(r.activities)}</div>`;
    targetCol.appendChild(card);
  });
}

function getLastActivityIndex(acts) {
  for (let i = ACTIVITIES.length - 1; i >= 0; i--) {
    const a = ACTIVITIES[i];
    if (acts[a]) return i;
  }
  return 0;
}

function formatActivities(acts) {
  return ACTIVITIES.map((a, i) => `${ACT_LABELS[i]}: ${acts[a] ?? "-"}`).join(" | ");
}

// ---------- Realtime ----------
function subscribeRealtime() {
  supabase
    .channel("requisitions_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "requisitions" },
      (payload) => handleRealtime(payload)
    )
    .subscribe();
}

function handleRealtime(payload) {
  const { eventType, new: newRow, old: oldRow } = payload;
  if (eventType === "INSERT") requisitions.unshift(newRow);
  else if (eventType === "UPDATE") {
    const idx = requisitions.findIndex((r) => r.id === newRow.id);
    if (idx >= 0) requisitions[idx] = newRow;
  } else if (eventType === "DELETE") {
    requisitions = requisitions.filter((r) => r.id !== oldRow.id);
  }
  renderList();
  renderKanban();
}

// ---------- Init ----------
async function init() {
  if (SUPABASE_URL.includes("YOUR") || SUPABASE_ANON_KEY.includes("YOUR")) {
    alert("⚠️ Ganti SUPABASE_URL dan ANON_KEY di app.js dengan kredensial kamu!");
  }
  await fetchRequisitions();
  subscribeRealtime();
}

init();
