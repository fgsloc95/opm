// ==========================
// CONSTANTES
// ==========================
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("loginBtn");
const userSelect = document.getElementById("userSelect");
const activeUserText = document.getElementById("activeUser");
const API_URL = "https://script.google.com/macros/s/AKfycbz_MyrRj9wiv-mXlZW4UN6OyKJPEeFy-BlEqR22xTKHkGRVPipu_wSqTj-DSHAYVpVX/exec"

// ==========================
// VARIAVEIS INICIAIS DE CONTROLE
// ==========================
let polling = null;
let focusMode = false;
let currentView = "tree";
let currentEditingItem = null;
let kanbanFilterTag = null;

// ==========================
// INIT
// ==========================
window.onload = () => {
  const savedUser = localStorage.getItem("opm_user");

  if (savedUser) {
    startApp(savedUser);
  }
};

// ==========================
// LOGIN
// ==========================
loginBtn.addEventListener("click", () => {
  const user = userSelect.value;

  if (!user) {
    alert("Selecione um usuário");
    return;
  }

  localStorage.setItem("opm_user", user);
  startApp(user);
});

// ==========================
// START APP
// ==========================
function startApp(user) {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");

  activeUserText.innerText = "Usuário: " + user;

  console.log("[OPM] iniciado com usuário:", user);

  loadData();
  loadLog();

  if (!polling) {
    polling = setInterval(loadData, 3000);
  }
}

// ==========================
// CARREGAR DADOS
// ==========================
async function loadData() {
  try {

    // CACHE PRIMEIRO
    const cached = localStorage.getItem("opm_cache");
    if (cached) {
      renderTree(JSON.parse(cached));
    }

    const res = await fetch(API_URL);
    const data = await res.json();

    // SALVA CACHE (AGORA CORRETO)
    localStorage.setItem("opm_cache", JSON.stringify(data));

    window.OPM_DATA = data;

    renderCurrentView();

  } catch (err) {
    console.error(err);
  }
}

// ==========================
// EDITOR MAIN
// ==========================

function openEditor(node) {
  currentEditingItem = node;

  document.getElementById("editorPanel").classList.remove("hidden");

  document.getElementById("editTitle").value = node.title || "";
  document.getElementById("editDescription").value = node.description || "";
  document.getElementById("editStatus").value = node.status || "idea";
  document.getElementById("editType").value = node.type || "feature";
  document.getElementById("editTags").value = node.tags || "";

  document.getElementById("editServerSource").value = node.manifest_server_source || "";
  document.getElementById("editServerLua").value = node.manifest_server_lua || "";
  document.getElementById("editClientSource").value = node.manifest_client_source || "";
  document.getElementById("editClientLua").value = node.manifest_client_lua || "";
}

// SAVE

function saveEditor() {
  if (!currentEditingItem) return;

  currentEditingItem.title = document.getElementById("editTitle").value;
  currentEditingItem.description = document.getElementById("editDescription").value;
  currentEditingItem.status = document.getElementById("editStatus").value;
  currentEditingItem.type = document.getElementById("editType").value;
  currentEditingItem.tags = document.getElementById("editTags").value;

  currentEditingItem.manifest_server_source = document.getElementById("editServerSource").value;
  currentEditingItem.manifest_server_lua = document.getElementById("editServerLua").value;
  currentEditingItem.manifest_client_source = document.getElementById("editClientSource").value;
  currentEditingItem.manifest_client_lua = document.getElementById("editClientLua").value;

  saveItem(currentEditingItem);

  closeEditor();
}

// CLOSE

function closeEditor() {
  document.getElementById("editorPanel").classList.add("hidden");
  currentEditingItem = null;
}

// ==========================
// CRIAR TASK
// ==========================

function createRootTask() {
  const data = window.OPM_DATA;

  const item = {
    id: generateHierarchicalId(null, data),
    parentId: "",
    level: 1,
    title: "Nova Chave",
    description: "",
    status: "idea",
    type: "feature",
    tags: "",
  };

  saveItem(item);
}

// ==========================
// EDITOR DE MANIFESTO
// ==========================

function openManifestEditor(node) {
  const serverSource = prompt("Server Source:", node.manifest_server_source || "");
  const serverLua = prompt("Server Lua:", node.manifest_server_lua || "");
  const clientSource = prompt("Client Source:", node.manifest_client_source || "");
  const clientLua = prompt("Client Lua:", node.manifest_client_lua || "");

  node.manifest_server_source = serverSource;
  node.manifest_server_lua = serverLua;
  node.manifest_client_source = clientSource;
  node.manifest_client_lua = clientLua;

  saveItem(node);
}


// ==========================
// SALVAR DADOS
// ==========================
async function saveItem(item) {
  try {
    item.lastUpdate = Date.now();
    item.lastEditor = localStorage.getItem("opm_user");

    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ data: item }),
    });

    const result = await res.json();

    console.log("[OPM] salvo:", result);

    loadData(); // recarrega

  } catch (err) {
    console.error("Erro ao salvar", err);
  }
}
// ==========================
// CRIAR ITEM TESTE
// ==========================
function createTestItem() {
  const item = {
    id: generateHierarchicalId(null, window.OPM_DATA),
    parentId: "",
    level: 1,
    title: "Nova Task",
    description: "Criada via UI",
    status: "idea",
    type: "feature",
    tags: "test",
  };

  saveItem(item);
}
// ==========================
// GERADOR DE ID DE HIERARQUIA
// ==========================
function generateHierarchicalId(parentId, data) {
  if (!parentId) {
    // nível 1
    const level1 = data.filter(i => i.level == 1);
    return (level1.length + 1).toString();
  }

  const children = data.filter(i => i.parentId == parentId);

  if (children.length === 0) {
    return parentId + ".1";
  }

  const lastChild = children[children.length - 1];
  const parts = lastChild.id.split(".");
  const lastNumber = parseInt(parts[parts.length - 1]);

  parts[parts.length - 1] = lastNumber + 1;

  return parts.join(".");
}
// ==========================
// GERAR ARVORE
// ==========================
function buildTree(data) {
  const map = {};
  const roots = [];

  data.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });

  data.forEach(item => {
    const node = map[item.id];

    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });

  // salva global pra usar nas tags
  window.OPM_MAP = map;

  return roots;
}


// ==========================
// PARSE TAGS
// ==========================

function parseTags(tags) {
  if (!tags) return [];
  return tags.split(",").map(t => t.trim().toLowerCase());
}

// ==========================
// HERANÇA DE TAGS
// ==========================

function getInheritedTags(node, map) {
  let tags = parseTags(node.tags);

  let current = node;

  while (current.parentId) {
    const parent = map[current.parentId];
    if (!parent) break;

    tags = tags.concat(parseTags(parent.tags));
    current = parent;
  }

  // remove duplicadas
  return [...new Set(tags)];
}

// ==========================
// RENDER CENTRAL 
// ==========================

function renderCurrentView() {
  if (currentView === "tree") {
    renderTree(window.OPM_DATA);
  }

  if (currentView === "impact") {
    renderImpactView();
  }

  if (currentView === "clean") {
    renderCleanView(window.OPM_DATA);
  }

  if (currentView === "log") {
    renderLogView();
  }

  if (currentView === "kanban") {
    renderKanban();
  }
}


// ==========================
// FILTRO POR TAG (BASE DO IMPACT VIEW)
// ==========================

function filterByTag(tag) {
  const data = window.OPM_DATA;

  const filtered = data.filter(item => {
    const tags = getInheritedTags(item, window.OPM_MAP);
    return tags.includes(tag.toLowerCase());
  });

  renderTree(filtered);
}

// ==========================
// RENDER IMPACT VIEW
// ==========================

function renderImpactView() {
  const main = document.querySelector("main");
  main.innerHTML = "<h1>Impact View</h1>";

  const tagMap = {};

  window.OPM_DATA.forEach(item => {
    const tags = getInheritedTags(item, window.OPM_MAP);

    tags.forEach(tag => {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(item);
    });
  });

  Object.keys(tagMap).forEach(tag => {
    const section = document.createElement("div");
    section.innerHTML = `<h2>${tag.toUpperCase()}</h2>`;

    tagMap[tag].forEach(item => {
      const div = document.createElement("div");
      div.innerText = `${item.id} - ${item.title}`;
      div.style.marginLeft = "10px";

      section.appendChild(div);
    });

    main.appendChild(section);
  });
}

// ==========================
// RENDER CLEAN VIEW
// ==========================
function renderCleanView(data) {
  const main = document.querySelector("main");
  main.innerHTML = "<h1>Clean View</h1>";

  const tree = buildTree(data);

  function render(node, level) {
    const div = document.createElement("div");
    div.style.marginLeft = level * 20 + "px";

    div.innerText = `${node.id} - ${node.title}`;
    main.appendChild(div);

    node.children.forEach(child => render(child, level + 1));
  }

  tree.forEach(root => render(root, 0));
}

// ==========================
// RENDER TREE
// ==========================
function renderTree(data) {
  const main = document.querySelector("main");
  main.innerHTML = "<h1>OPM Tree</h1>";

  const tree = buildTree(data);

  tree.forEach(node => {
    renderNode(node, main, 0);
  });
}
// RENDER NÓ
function renderNode(node, container, level) {
  if (focusMode && node.status === "done") {
    return;
  }    
  const div = document.createElement("div");

  if (node.level == 1) {
  const progress = calculateProgress(node);

  const bar = document.createElement("div");
  bar.style.height = "6px";
  bar.style.background = "#333";
  bar.style.marginTop = "4px";

  const fill = document.createElement("div");
  fill.style.width = progress + "%";
  fill.style.height = "100%";
  fill.style.background = "#4CAF50";

  bar.appendChild(fill);
  div.appendChild(bar);
}


  div.style.marginLeft = level * 20 + "px";
  div.style.padding = "4px";

  const tags = getInheritedTags(node, window.OPM_MAP);

  div.innerText = `${node.id} - ${node.title} (${node.status}) [${tags.join(", ")}]`;

  // CLICK → EDIT (TITLE + TAGS)
  div.onclick = (e) => {
    e.stopPropagation();

    div.onclick = (e) => {
      e.stopPropagation();
      openEditor(node);
    };

    node.title = newTitle || node.title;
    node.tags = newTags || node.tags;

    saveItem(node);
  };

  // DOUBLE CLICK → ADD CHILD
  div.ondblclick = (e) => {
    e.stopPropagation();
    createChild(node);
  };

  // abrir manisfest e item history
  div.oncontextmenu = (e) => {
   e.preventDefault();

   const option = prompt("1: Manifest | 2: History");

   if (option == "1") openManifestEditor(node);
   if (option == "2") showItemHistory(node.id);
  };

  container.appendChild(div);

  node.children.forEach(child => {
    renderNode(child, container, level + 1);
  });
}

// CRIAR FILHO
function createChild(parent) {
  const data = window.OPM_DATA;

  const newItem = {
    id: generateHierarchicalId(parent.id, data),
    parentId: parent.id,
    level: parent.level + 1,
    title: "Nova Subtask",
    description: "",
    status: "idea",
    type: "feature",
    tags: parent.tags || "",
  };

  saveItem(newItem);
}

// ==========================
// RENDER LOG VIEW
// ==========================

function renderLogView() {
  const main = document.querySelector("main");
  main.innerHTML = "<h1>Log</h1>";

  const logs = window.OPM_LOG || [];

  logs.reverse().forEach(log => {
    const div = document.createElement("div");

    const date = new Date(parseInt(log.timestamp)).toLocaleString();

    div.innerText =
      `[${date}] ${log.user} -> ${log.action} (${log.itemId}) | ${log.field}: ${log.oldValue} → ${log.newValue}`;

    div.style.fontSize = "12px";
    div.style.marginBottom = "4px";

    main.appendChild(div);
  });
}


// ==========================
// RENDER DEEP SEARCH
// ==========================

function deepSearch(query) {
  query = query.toLowerCase();

  const results = window.OPM_DATA.filter(item => {
    return (
      (item.title || "").toLowerCase().includes(query) ||
      (item.description || "").toLowerCase().includes(query) ||
      (item.manifest_server_source || "").toLowerCase().includes(query) ||
      (item.manifest_server_lua || "").toLowerCase().includes(query) ||
      (item.manifest_client_source || "").toLowerCase().includes(query) ||
      (item.manifest_client_lua || "").toLowerCase().includes(query)
    );
  });

  renderTree(results);
}

function handleSearch(value) {
  if (!value) {
    renderTree(window.OPM_DATA);
    return;
  }

  deepSearch(value);
}

// ==========================
// TOGGLE FOCUS
// ==========================

function toggleFocus() {
  focusMode = !focusMode;
  renderTree(window.OPM_DATA);
}

// ==========================
// PROGRESS BAR BY KEY
// ==========================

function calculateProgress(node) {
  let total = 0;
  let done = 0;

  function walk(n) {
    total++;
    if (n.status === "done") done++;

    n.children.forEach(walk);
  }

  walk(node);

  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// ==========================
// RENDER KANBAN
// ==========================

function renderKanban() {
  const main = document.querySelector("main");
  main.innerHTML = "<h1>Kanban</h1>";

  const board = document.createElement("div");
  board.style.display = "flex";
  board.style.gap = "10px";

  const statuses = ["idea", "to do", "doing", "done"];

  statuses.forEach(status => {
    const column = createColumn(status);
    board.appendChild(column);
  });

  main.appendChild(board);
}

// CRIAR COLUNA
function createColumn(status) {
  const col = document.createElement("div");

  col.style.flex = "1";
  col.style.background = "#1e1e1e";
  col.style.padding = "10px";
  col.style.minHeight = "400px";

  col.innerHTML = `<h3>${status.toUpperCase()}</h3>`;

  // DROP
  col.ondragover = (e) => e.preventDefault();

  col.ondrop = (e) => {
    const id = e.dataTransfer.getData("id");

    const item = window.OPM_DATA.find(i => i.id == id);

    item.status = status;

    saveItem(item);
  };

  // adicionar cards
  window.OPM_DATA
    .filter(i => {
        if (i.status !== status) return false;

        if (!kanbanFilterTag) return true;

        const tags = getInheritedTags(i, window.OPM_MAP);
        return tags.includes(kanbanFilterTag);
        })
    .forEach(item => {
      const card = createCard(item);
      col.appendChild(card);
    });

  return col;
}

// CARD
function createCard(item) {
  const card = document.createElement("div");

  card.draggable = true;

  card.style.background = getTypeColor(item.type);
  card.style.marginBottom = "8px";
  card.style.padding = "8px";
  card.style.borderRadius = "6px";
  card.style.cursor = "grab";

  card.innerText = `${item.title}\n[${item.tags || ""}]`;

  // DRAG START
  card.ondragstart = (e) => {
    e.dataTransfer.setData("id", item.id);
  };

  // CLICK → EDITOR
  card.onclick = () => {
    openEditor(item);
  };

  return card;
}

// FILTRAR KANBAN

function setKanbanFilter(tag) {
  kanbanFilterTag = tag.toLowerCase();
  renderKanban();
}

// HELPER COLOR KANBAN

function getTypeColor(type) {
  switch (type) {
    case "bug": return "#ff4d4d";
    case "feature": return "#4da6ff";
    case "refactor": return "#ffaa00";
    case "research": return "#9b59b6";
    default: return "#2a2a2a";
  }
}

// ==========================
// TROCA DE ABA 
// ==========================

function setView(view) {
  currentView = view;
  renderCurrentView();
}


// ==========================
// LOAD LOG
// ==========================

async function loadLog() {
  try {
    const res = await fetch(API_URL + "?type=log");
    const data = await res.json();

    window.OPM_LOG = data;

  } catch (err) {
    console.error(err);
  }
}
// mostrar historico por item
function showItemHistory(itemId) {
  const logs = window.OPM_LOG || [];

  const filtered = logs.filter(l => l.itemId == itemId);

  alert(
    filtered.map(l =>
      `${l.field}: ${l.oldValue} → ${l.newValue}`
    ).join("\n")
  );
}

