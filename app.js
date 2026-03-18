// ==========================
// ELEMENTOS
// ==========================
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("loginBtn");
const userSelect = document.getElementById("userSelect");
const activeUserText = document.getElementById("activeUser");
const API_URL = "https://script.google.com/macros/s/AKfycbz_MyrRj9wiv-mXlZW4UN6OyKJPEeFy-BlEqR22xTKHkGRVPipu_wSqTj-DSHAYVpVX/exec"

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
  setInterval(loadData, 3000);
}

// ==========================
// CARREGAR DADOS
// ==========================
async function loadData() {
  try {

    const cached = localStorage.getItem("opm_cache");
    if (cached) {renderTree(JSON.parse(cached));}
    const res = await fetch(API_URL);
    localStorage.setItem("opm_cache", JSON.stringify(data));
    const data = await res.json();

    window.OPM_DATA = data;

    renderTree(data);

  } catch (err) {
    console.error(err);
  }
}


// ==========================
// RENDER ARVORE
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
  const div = document.createElement("div");

  div.style.marginLeft = level * 20 + "px";
  div.style.padding = "4px";

  div.innerText = `${node.id} - ${node.title} (${node.status})`;

  // CLICK → EDIT
  div.onclick = (e) => {
    e.stopPropagation();

    node.title = prompt("Novo título:", node.title) || node.title;
    saveItem(node);
  };

  // DOUBLE CLICK → ADD CHILD
  div.ondblclick = (e) => {
    e.stopPropagation();

    createChild(node);
  };

  container.appendChild(div);

  if (node.children) {
    node.children.forEach(child => {
      renderNode(child, container, level + 1);
    });
  }
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
    id: generateId(),
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
    item.children = [];
    map[item.id] = item;
  });

  data.forEach(item => {
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
}
