/* =========================================================
   app.js
   Página Recursos Humanos:
   - Documentos: carregados de uma pasta do Google Drive
     (via Google Apps Script — ver google-apps-script.gs)
   - Comunicados e datas: do Firestore (tempo real)
   - Janelas "Ver todos" (com busca) e preview do documento
   ========================================================= */

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* >>> COLE AQUI a URL do App da Web do Google Apps Script <<< */
const URL_DOCUMENTOS_DRIVE = "https://script.google.com/macros/s/AKfycbzx9MEBGr1WnmNN0YuUXM2fCo07JK4_s0DKVRSOPx0oT1q_RqUT-dUVqUfkf1lyHWTi/exec";

const LIMITE_RESUMO_DOCS = 4;
const LIMITE_RESUMO_COMUNICADOS = 3;

let documentos = [];
let comunicados = [];

/* -----------------------------------------------------------
   Utilidades
   ----------------------------------------------------------- */
function esc(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarDataBR(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}

function formatarDiaMes(ts) {
  if (!ts?.toDate) return "";
  const data = ts.toDate();
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

/* -----------------------------------------------------------
   Modais (abrir / fechar)
   ----------------------------------------------------------- */
function abrirModal(id) {
  document.getElementById(id)?.classList.remove("oculto");
}

function fecharModal(elemento) {
  elemento.classList.add("oculto");
}

document.addEventListener("click", (evento) => {
  const gatilhoFechar = evento.target.closest("[data-fechar-modal]");
  if (gatilhoFechar) {
    gatilhoFechar.closest(".modal")?.classList.add("oculto");
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    document.querySelectorAll(".modal:not(.oculto)").forEach(fecharModal);
  }
});

document.getElementById("verTodosDocumentos")
  ?.addEventListener("click", () => abrirModal("modalTodosDocumentos"));
document.getElementById("verTodosComunicados")
  ?.addEventListener("click", () => abrirModal("modalTodosComunicados"));

/* -----------------------------------------------------------
   Documentos (Google Drive)
   ----------------------------------------------------------- */
function itemDocumentoHTML(doc) {
  return `
    <li class="documento">
      <span class="documento__icone"><i class="fa-regular fa-file-lines"></i></span>
      <div class="documento__info">
        <div class="documento__titulo">${esc(doc.titulo)}</div>
        <div class="documento__meta">Atualizado em ${esc(doc.atualizadoTexto)}</div>
      </div>
      <div class="documento__acoes">
        <button class="btn-ver-documento" data-id="${esc(doc.id)}">Ver documento</button>
        <a class="icone-botao icone-botao--sm" href="${esc(doc.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir no Drive">
          <i class="fa-solid fa-up-right-from-square"></i>
        </a>
      </div>
    </li>`;
}

function renderDocumentos() {
  const resumo = document.getElementById("listaDocumentos");
  if (resumo) {
    resumo.innerHTML = documentos.length
      ? documentos.slice(0, LIMITE_RESUMO_DOCS).map(itemDocumentoHTML).join("")
      : `<li class="lista-estado">Nenhum documento na pasta.</li>`;
  }
  filtrarDocumentos();
}

function filtrarDocumentos() {
  const alvo = document.getElementById("listaTodosDocumentos");
  if (!alvo) return;
  const termo = (document.getElementById("buscaTodosDocumentos")?.value || "").toLowerCase().trim();
  const lista = termo
    ? documentos.filter((d) => d.titulo.toLowerCase().includes(termo))
    : documentos;
  alvo.innerHTML = lista.length
    ? lista.map(itemDocumentoHTML).join("")
    : `<li class="lista-estado">Nenhum documento encontrado.</li>`;
}

document.getElementById("buscaTodosDocumentos")
  ?.addEventListener("input", filtrarDocumentos);

async function carregarDocumentos() {
  const resumo = document.getElementById("listaDocumentos");
  try {
    const resposta = await fetch(URL_DOCUMENTOS_DRIVE);
    const arquivos = await resposta.json();
    documentos = arquivos.map((a) => ({
      id: a.id,
      titulo: a.nome.replace(/\.[^.]+$/, ""),
      tipo: a.tipo,
      url: a.url,
      atualizadoTexto: formatarDataBR(new Date(a.atualizado)),
    }));
    renderDocumentos();
  } catch (erro) {
    console.error("Erro ao carregar documentos do Drive:", erro);
    if (resumo) resumo.innerHTML = `<li class="lista-estado">Erro ao carregar documentos.</li>`;
  }
}

/* -----------------------------------------------------------
   Preview do documento (Ver documento) — visualizador do Drive
   ----------------------------------------------------------- */
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".btn-ver-documento");
  if (!botao) return;
  const doc = documentos.find((d) => d.id === botao.dataset.id);
  if (doc) abrirPreview(doc);
});

function abrirPreview(doc) {
  document.getElementById("modalTitulo").textContent = doc.titulo || "Documento";
  document.getElementById("modalCorpo").innerHTML =
    `<iframe src="https://drive.google.com/file/d/${esc(doc.id)}/preview" title="${esc(doc.titulo)}"></iframe>`;
  document.getElementById("modalDownload").setAttribute("href", doc.url || "#");
  abrirModal("modalDocumento");
}

/* -----------------------------------------------------------
   Comunicados (Firestore)
   ----------------------------------------------------------- */
function itemComunicadoHTML(com) {
  return `
    <article class="comunicado">
      <span class="comunicado__data">${esc(formatarDiaMes(com.data))}</span>
      <div>
        <div class="comunicado__titulo">${esc(com.titulo)}</div>
        <div class="comunicado__texto">${esc(com.conteudo)}</div>
      </div>
    </article>`;
}

function renderComunicados() {
  const resumo = document.getElementById("listaComunicados");
  if (resumo) {
    resumo.innerHTML = comunicados.length
      ? comunicados.slice(0, LIMITE_RESUMO_COMUNICADOS).map(itemComunicadoHTML).join("")
      : `<p class="lista-estado">Nenhum comunicado publicado.</p>`;
  }
  filtrarComunicados();
}

function filtrarComunicados() {
  const alvo = document.getElementById("listaTodosComunicados");
  if (!alvo) return;
  const termo = (document.getElementById("buscaTodosComunicados")?.value || "").toLowerCase().trim();
  const lista = termo
    ? comunicados.filter((c) =>
        (c.titulo || "").toLowerCase().includes(termo) ||
        (c.conteudo || "").toLowerCase().includes(termo)
      )
    : comunicados;
  alvo.innerHTML = lista.length
    ? lista.map(itemComunicadoHTML).join("")
    : `<p class="lista-estado">Nenhum comunicado encontrado.</p>`;
}

document.getElementById("buscaTodosComunicados")
  ?.addEventListener("input", filtrarComunicados);

/* -----------------------------------------------------------
   Datas importantes (Firestore)
   ----------------------------------------------------------- */
function renderDatas(datas) {
  const alvo = document.getElementById("listaDatas");
  if (!alvo) return;
  alvo.innerHTML = datas.length
    ? datas.map((d) => `
        <div class="data-item">
          <span class="data-item__dia">${esc(d.dia)}</span>
          <span class="data-item__label">${esc(d.rotulo)}</span>
        </div>`).join("")
    : `<span class="lista-estado">Nenhuma data cadastrada.</span>`;
}

/* -----------------------------------------------------------
   Inicialização
   ----------------------------------------------------------- */
carregarDocumentos();

onSnapshot(
  query(collection(db, "comunicados"), orderBy("data", "desc")),
  (snap) => {
    comunicados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderComunicados();
  },
  (erro) => {
    console.error("Erro ao carregar comunicados:", erro);
    const resumo = document.getElementById("listaComunicados");
    if (resumo) resumo.innerHTML = `<p class="lista-estado">Erro ao carregar comunicados.</p>`;
  }
);

onSnapshot(
  query(collection(db, "datas"), orderBy("criadoEm", "asc")),
  (snap) => {
    renderDatas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  },
  (erro) => {
    console.error("Erro ao carregar datas:", erro);
  }
);
