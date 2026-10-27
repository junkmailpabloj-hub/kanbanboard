"use strict";
const COLUMNS = [
  { id: "todo",  name: "Por hacer",   color: "#64748b" },
  { id: "doing", name: "En progreso", color: "#6366f1" },
  { id: "review", name: "En revisión", color: "#f59e0b" },
  { id: "done",  name: "Hecho",       color: "#22c55e" }
];
const PRIO = { high: "Alta", medium: "Media", low: "Baja" };
const KEY = "kanban.tasks.v1";
const $ = id => document.getElementById(id);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const load = () => {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d)) return d; } catch (e) {}
  const today = new Date(), iso = n => new Date(today.getTime() + n * 864e5).toISOString().slice(0, 10);
  return [
    { id: uid(), col: "todo",   title: "Definir requisitos del proyecto", desc: "Reunión con el cliente y lista de funcionalidades.", prio: "high",   due: iso(2),  tag: "Planificación" },
    { id: uid(), col: "todo",   title: "Diseñar la identidad visual", desc: "Paleta de colores, tipografía y logotipo.",          prio: "medium", due: iso(5),  tag: "Diseño" },
    { id: uid(), col: "doing",  title: "Implementar la API de usuarios", desc: "Registro, login y gestión de perfiles.",           prio: "high",   due: iso(1),  tag: "Backend" },
    { id: uid(), col: "review", title: "Maquetar la página de inicio", desc: "Revisar responsive en móvil y tablet.",              prio: "low",    due: iso(3),  tag: "Frontend" },
    { id: uid(), col: "done",   title: "Configurar el repositorio", desc: "Ramas, CI y plantilla de issues.",                       prio: "low",    due: iso(-2), tag: "DevOps" }
  ];
};
let tasks = load();
let editing = null, newCol = "todo", dragId = null;
const save = () => localStorage.setItem(KEY, JSON.stringify(tasks));

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function visible(t) {
  const q = $("search").value.trim().toLowerCase(), p = $("filter").value;
  return (!p || t.prio === p) && (!q || (t.title + " " + t.desc + " " + t.tag).toLowerCase().includes(q));
}
function fmtDate(iso) { return new Date(iso + "T00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }); }

function render() {
  const board = $("board"); board.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);
  COLUMNS.forEach(c => {
    const list = tasks.filter(t => t.col === c.id && visible(t));
    const col = document.createElement("section");
    col.className = "column"; col.dataset.col = c.id;
    col.innerHTML = `<div class="col-head"><span class="dot" style="background:${c.color}"></span><h2>${c.name}</h2><span class="count">${list.length}</span></div>`;
    list.forEach(t => {
      const late = t.due && t.due < today && c.id !== "done";
      const card = document.createElement("article");
      card.className = "card"; card.draggable = true; card.tabIndex = 0;
      card.dataset.id = t.id; card.dataset.prio = t.prio;
      card.innerHTML = `<h3>${esc(t.title)}</h3>${t.desc ? `<p>${esc(t.desc)}</p>` : ""}
        <div class="meta"><span class="chip prio">${PRIO[t.prio]}</span>${t.tag ? `<span class="chip">${esc(t.tag)}</span>` : ""}
        ${t.due ? `<span class="chip due ${late ? "late" : ""}">📅 ${fmtDate(t.due)}${late ? " · vencida" : ""}</span>` : ""}</div>`;
      card.addEventListener("click", () => openDlg(t.id));
      card.addEventListener("keydown", e => { if (e.key === "Enter") openDlg(t.id); });
      card.addEventListener("dragstart", e => { dragId = t.id; card.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.id); });
      card.addEventListener("dragend", () => { card.classList.remove("dragging"); document.querySelectorAll(".over").forEach(x => x.classList.remove("over")); });
      col.appendChild(card);
    });
    if (!list.length) col.insertAdjacentHTML("beforeend", `<div class="empty">Sin tareas</div>`);
    const add = document.createElement("button"); add.className = "add-quick"; add.textContent = "+ Añadir tarea";
    add.onclick = () => openDlg(null, c.id); col.appendChild(add);

    col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", e => { if (!col.contains(e.relatedTarget)) col.classList.remove("over"); });
    col.addEventListener("drop", e => {
      e.preventDefault(); col.classList.remove("over");
      const t = tasks.find(x => x.id === dragId); if (!t) return;
      // Reordenar: insertar antes de la tarjeta sobre la que se suelta
      const target = e.target.closest(".card");
      tasks = tasks.filter(x => x.id !== t.id); t.col = c.id;
      const idx = target ? tasks.findIndex(x => x.id === target.dataset.id) : -1;
      idx >= 0 ? tasks.splice(idx, 0, t) : tasks.push(t);
      save(); render();
    });
    board.appendChild(col);
  });
  const done = tasks.filter(t => t.col === "done").length;
  $("summary").textContent = `${tasks.length} tareas · ${done} completadas (${tasks.length ? Math.round(done / tasks.length * 100) : 0}%)`;
}

function openDlg(id, col) {
  editing = id; const t = id ? tasks.find(x => x.id === id) : null;
  newCol = col || "todo";
  $("dlg-title").textContent = t ? "Editar tarea" : "Nueva tarea";
  $("f-title").value = t ? t.title : ""; $("f-desc").value = t ? t.desc : "";
  $("f-prio").value = t ? t.prio : "medium"; $("f-due").value = t ? t.due : ""; $("f-tag").value = t ? t.tag : "";
  $("delete").style.display = t ? "" : "none";
  $("dlg").showModal(); $("f-title").focus();
}
$("new").onclick = () => openDlg(null, "todo");
$("cancel").onclick = () => $("dlg").close();
$("form").addEventListener("submit", () => {
  const data = { title: $("f-title").value.trim(), desc: $("f-desc").value.trim(), prio: $("f-prio").value, due: $("f-due").value, tag: $("f-tag").value.trim() };
  if (!data.title) return;
  if (editing) Object.assign(tasks.find(x => x.id === editing), data);
  else tasks.push({ id: uid(), col: newCol, ...data });
  save(); render();
});
$("delete").onclick = () => {
  if (editing && confirm("¿Eliminar esta tarea?")) { tasks = tasks.filter(x => x.id !== editing); save(); render(); $("dlg").close(); }
};
$("dlg").addEventListener("click", e => { if (e.target === $("dlg")) $("dlg").close(); });
$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);

const savedTheme = localStorage.getItem("kanban.theme");
document.documentElement.dataset.theme = savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
$("theme").onclick = () => {
  const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = n; localStorage.setItem("kanban.theme", n);
};
render();
