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
    const res = await fetch(API_URL);
    const data = await res.json();

    console.log("[OPM] dados carregados:", data);

    renderData(data);

  } catch (err) {
    console.error("Erro ao carregar dados", err);
  }
}

// ==========================
// DEBUG SIMPLES
// ==========================
function renderData(data) {
  const main = document.querySelector("main");

  main.innerHTML = "<h1>Dados do OPM</h1>";

  data.forEach(item => {
    const div = document.createElement("div");
    div.innerText = `${item.id} - ${item.title} (${item.status})`;
    main.appendChild(div);
  });
}