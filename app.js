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
let lastDataHash = "";

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
  loginScreen.classList.add("hidden"); // Isso agora vai esconder o login
  app.classList.remove("hidden");
  activeUserText.innerText = "Usuário: " + user;
  
  loadData();
  loadLog();
  if (!polling) polling = setInterval(loadData, 3000);
}

// ==========================
// RENDERIZAÇÃO INTELIGENTE
// ==========================
async function loadData() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    
    // Verifica se houve mudança real
    const currentHash = JSON.stringify(data);
    if (currentHash === lastDataHash) return; 
    
    lastDataHash = currentHash;
    localStorage.setItem("opm_cache", currentHash);
    window.OPM_DATA = data;
    
    renderCurrentView();
  } catch (err) {
    console.error("Fetch Error:", err);
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
    const level1 = data.filter(i => i.level == 1 || i.level == "1");
    return (level1.length + 1).toString();
  }

  const children = data.filter(i => i.parentId == parentId);
  if (children.length === 0) return parentId + ".1";

  // Pega o último número do último filho e soma 1
  const lastChild = children[children.length - 1];
  const parts = lastChild.id.split(".");
  const lastNum = parseInt(parts[parts.length - 1]);
  parts[parts.length - 1] = lastNum + 1;
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
  const container = document.getElementById("viewContainer");
  container.innerHTML = "<h1>Impact View (By Tags)</h1>";

  const tagMap = {};

  window.OPM_DATA.forEach(item => {
    const tags = getInheritedTags(item, window.OPM_MAP);
    tags.forEach(tag => {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(item);
    });
  });

  const wrapper = document.createElement("div");
  wrapper.className = "impact-container"; // Estilize no CSS se quiser colunas

  Object.keys(tagMap).sort().forEach(tag => {
    const section = document.createElement("div");
    section.style.marginBottom = "20px";
    section.innerHTML = `<h2 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:5px;">${tag.toUpperCase()}</h2>`;

    tagMap[tag].forEach(item => {
      const div = document.createElement("div");
      div.className = "node-row"; // Reutiliza o estilo de hover e card
      div.style.marginLeft = "10px";
      div.innerHTML = `<strong>${item.id}</strong> - ${item.title} <small>(${item.status})</small>`;
      div.onclick = () => openEditor(item);
      section.appendChild(div);
    });

    wrapper.appendChild(section);
  });

  container.appendChild(wrapper);
}

// ==========================
// RENDER CLEAN VIEW
// ==========================
function renderCleanView(data) {
  const container = document.getElementById("viewContainer");
  container.innerHTML = "<h1>Clean View</h1>";

  const tree = buildTree(data);
  const wrapper = document.createElement("div");
  wrapper.style.padding = "20px";

  function render(node, level) {
    const div = document.createElement("div");
    div.style.marginLeft = level * 25 + "px";
    div.style.marginBottom = "8px";
    div.style.fontSize = "14px";
    div.style.color = level === 0 ? "var(--accent)" : "var(--text-main)";
    
    div.innerHTML = `<code>${node.id}</code> — ${node.title}`;
    wrapper.appendChild(div);

    node.children.forEach(child => render(child, level + 1));
  }

  tree.forEach(root => render(root, 0));
  container.appendChild(wrapper);
}

// ==========================
// RENDER TREE
// ==========================
function renderTree(data) {
  const container = document.getElementById("viewContainer"); // Mudamos de main para viewContainer
  container.innerHTML = `<h1 class="view-title">Tree View</h1>`;

  const tree = buildTree(data);
  const treeWrapper = document.createElement("div");
  treeWrapper.className = "tree-container";

  tree.forEach(node => {
    renderNode(node, treeWrapper, 0);
  });

  container.appendChild(treeWrapper);
}

// ==========================
// RENDER NÓ (REFINADO v3.3)
// ==========================
function renderNode(node, container, level) {
  // 1. Filtro de Focus Mode
  if (focusMode && node.status === "done") return;

  // 2. Criação do Elemento Principal
  const row = document.createElement("div");
  row.className = `node-row level-${node.level}`;
  row.style.marginLeft = `${level * 25}px`; // Indentação maior para legibilidade

  // 3. Lógica de Barra de Progresso (Apenas Nível 1 - A COISA)
  let progressHtml = "";
  if (node.level == 1) {
    const progress = calculateProgress(node);
    progressHtml = `
      <div class="progress-wrapper">
        <div class="progress-bar" style="width: ${progress}%"></div>
      </div>`;
  }

  // 4. Tags Herdadas para Visualização
  const tags = getInheritedTags(node, window.OPM_MAP);
  const tagsHtml = tags.map(t => `<span class="tag-pill">${t}</span>`).join("");

  // 5. Montagem do Conteúdo Interno
  row.innerHTML = `
    ${progressHtml}
    <div class="node-content">
      <div class="node-info">
        <span class="node-id">${node.id}</span>
        <span class="node-title">${node.title}</span>
        <span class="status-badge status-${node.status.replace(/\s+/g, '-')}">${node.status}</span>
      </div>
      <div class="node-meta">
        ${tagsHtml}
        <span class="type-badge type-${node.type}">${node.type}</span>
      </div>
    </div>
  `;

  // 6. EVENTO: Click simples abre o Editor Lateral
  row.onclick = (e) => {
    e.stopPropagation();
    openEditor(node); 
  };

  // 7. EVENTO: Double Click cria Filho (se não for Nível 4)
  row.ondblclick = (e) => {
    e.stopPropagation();
    if (node.level < 4) {
      createChild(node);
    } else {
      console.warn("Limite de hierarquia atingido (Nível 4)");
    }
  };

  // 8. EVENTO: Botão Direito (Context Menu) para opções extras
  row.oncontextmenu = (e) => {
    e.preventDefault();
    // Exemplo: Histórico rápido ou deletar (cuidado ao deletar!)
    const action = confirm(`Deseja ver o histórico detalhado do item ${node.id}?`);
    if (action) showItemHistory(node.id);
  };

  container.appendChild(row);

  // 9. Recursividade para os Filhos
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      renderNode(child, container, level + 1);
    });
  }
}

// ==========================
// CRIAR FILHO (CORRIGIDO)
// ==========================
function createChild(parent) {
  const data = window.OPM_DATA;

  const newItem = {
    id: generateHierarchicalId(parent.id, data),
    parentId: parent.id,
    level: parseInt(parent.level) + 1,
    title: "Nova Subtask",
    description: "Descreva a tarefa aqui...",
    status: "idea",
    type: "feature",
    tags: "", // Deixamos vazio para herdar do pai ou definir novas
    manifest_server_source: "",
    manifest_server_lua: "",
    manifest_client_source: "",
    manifest_client_lua: ""
  };

  saveItem(newItem);
}

// ==========================
// RENDER LOG VIEW
// ==========================
function renderLogView() {
  const container = document.getElementById("viewContainer");
  container.innerHTML = "<h1>System Logs</h1>";

  const logs = window.OPM_LOG || [];
  const wrapper = document.createElement("div");
  wrapper.style.padding = "10px";

  // Criamos uma cópia para não mutar o array original com o reverse
  [...logs].reverse().forEach(log => {
    const div = document.createElement("div");
    div.className = "node-row"; // Aproveita o fundo escuro e bordas
    div.style.fontSize = "12px";
    div.style.cursor = "default";

    const date = new Date(parseInt(log.timestamp)).toLocaleString();
    
    div.innerHTML = `
      <span style="color:var(--text-dim)">[${date}]</span> 
      <strong style="color:var(--accent)">${log.user}</strong> 
      <span style="color:#3178c6">${log.action}</span> 
      on <small>${log.itemId}</small> 
      <div style="margin-top:5px; color:var(--text-dim)">
        ${log.field}: <span style="color:#f85149">${log.oldValue || 'empty'}</span> → <span style="color:#2ecc71">${log.newValue}</span>
      </div>
    `;

    wrapper.appendChild(div);
  });

  container.appendChild(wrapper);
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
  const container = document.getElementById("viewContainer");
  container.innerHTML = "<h1>Kanban</h1>";

  const board = document.createElement("div");
  board.className = "kanban-board"; // Use a classe que criamos no CSS

  const statuses = ["idea", "to do", "doing", "done"];
  statuses.forEach(status => {
    const column = createColumn(status);
    board.appendChild(column);
  });

  container.appendChild(board);
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

