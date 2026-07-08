/* =========================================================
   app.js
   Página Recursos Humanos:
   - Documentos, comunicados e datas do Firestore (tempo real)
   - Arquivos dos documentos ficam no servidor (upload.php);
     o Firestore guarda os dados + a URL do arquivo
   - Janelas "Ver todos" (com busca) e preview do documento
   ========================================================= */

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

function formatarData(ts) {
  if (!ts?.toDate) return "";
  const data = ts.toDate();
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
function atualizarScrollLock() {
  const algumAberto = document.querySelector(".modal:not(.oculto)");
  document.body.classList.toggle("sem-scroll", Boolean(algumAberto));
}

function abrirModal(id) {
  document.getElementById(id)?.classList.remove("oculto");
  atualizarScrollLock();
}

function fecharModal(elemento) {
  elemento.classList.add("oculto");
  if (elemento.id === "modalDocumento") {
    document.getElementById("modalCorpo").innerHTML = "";
  }
  atualizarScrollLock();
}

document.addEventListener("click", (evento) => {
  const gatilhoFechar = evento.target.closest("[data-fechar-modal]");
  if (!gatilhoFechar) return;
  const modal = gatilhoFechar.closest(".modal");
  if (modal) fecharModal(modal);
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
   Documentos
   ----------------------------------------------------------- */
function itemDocumentoHTML(doc) {
  return `
    <li class="documento">
      <span class="documento__icone"><i class="fa-regular fa-file-lines"></i></span>
      <div class="documento__info">
        <div class="documento__titulo">${esc(doc.titulo)}</div>
        <div class="documento__meta">Atualizado em ${esc(formatarData(doc.data))}</div>
      </div>
      <div class="documento__acoes">
        <button class="btn-ver-documento" data-id="${esc(doc.id)}">Ver documento</button>
        <a class="icone-botao icone-botao--sm" href="${esc(doc.arquivoUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Baixar">
          <i class="fa-solid fa-download"></i>
        </a>
      </div>
    </li>`;
}

function renderDocumentos() {
  const resumo = document.getElementById("listaDocumentos");
  if (resumo) {
    resumo.innerHTML = documentos.length
      ? documentos.slice(0, LIMITE_RESUMO_DOCS).map(itemDocumentoHTML).join("")
      : `<li class="lista-estado">Nenhum documento cadastrado.</li>`;
  }
  filtrarDocumentos();
}

function filtrarDocumentos() {
  const alvo = document.getElementById("listaTodosDocumentos");
  if (!alvo) return;
  const termo = (document.getElementById("buscaTodosDocumentos")?.value || "").toLowerCase().trim();
  const lista = termo
    ? documentos.filter((d) => (d.titulo || "").toLowerCase().includes(termo))
    : documentos;
  alvo.innerHTML = lista.length
    ? lista.map(itemDocumentoHTML).join("")
    : `<li class="lista-estado">Nenhum documento encontrado.</li>`;
}

document.getElementById("buscaTodosDocumentos")
  ?.addEventListener("input", filtrarDocumentos);

/* -----------------------------------------------------------
   Preview do documento (Ver documento) — arquivo direto do servidor
   ----------------------------------------------------------- */
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".btn-ver-documento");
  if (!botao) return;
  const doc = documentos.find((d) => d.id === botao.dataset.id);
  if (doc) abrirPreview(doc);
});

function abrirPreview(doc) {
  document.getElementById("modalTitulo").textContent = doc.titulo || "Documento";
  const corpo = document.getElementById("modalCorpo");
  const carregando = `
    <div class="modal__carregando" id="modalCarregando">
      <i class="fa-solid fa-spinner fa-spin"></i> Carregando…
    </div>`;

  if ((doc.arquivoTipo || "").startsWith("image/")) {
    // Imagem: visor com zoom (botões, scroll e arrastar)
    corpo.innerHTML = carregando + `
      <div class="visor" id="visor">
        <img id="modalMidia" class="oculto visor__img" src="${esc(doc.arquivoUrl)}" alt="${esc(doc.titulo)}" draggable="false" />
        <div class="visor__zoom">
          <button type="button" id="zoomMais" aria-label="Aumentar zoom"><i class="fa-solid fa-plus"></i></button>
          <button type="button" id="zoomMenos" aria-label="Diminuir zoom"><i class="fa-solid fa-minus"></i></button>
        </div>
      </div>`;

    const img = document.getElementById("modalMidia");
    img.addEventListener("load", () => {
      document.getElementById("modalCarregando")?.remove();
      img.classList.remove("oculto");
    });
    configurarZoom(img);
  } else {
    // PDF e outros: iframe (o próprio visualizador já tem zoom)
    corpo.innerHTML = carregando + `
      <iframe id="modalMidia" class="oculto" src="${esc(doc.arquivoUrl)}" title="${esc(doc.titulo)}"></iframe>`;
    const midia = document.getElementById("modalMidia");
    midia.addEventListener("load", () => {
      document.getElementById("modalCarregando")?.remove();
      midia.classList.remove("oculto");
    });
  }

  document.getElementById("modalDownload").setAttribute("href", doc.arquivoUrl || "#");
  abrirModal("modalDocumento");
}

/* Zoom da imagem no preview: botões, roda do mouse e arrastar para mover.
   Usa pointer events na própria imagem (sem listeners globais que vazariam). */
function configurarZoom(img) {
  let escala = 1;
  let x = 0;
  let y = 0;
  let arrastando = false;
  let iniX = 0;
  let iniY = 0;

  const visor = document.getElementById("visor");

  function aplicar() {
    img.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
    img.style.cursor = escala > 1 ? "grab" : "default";
  }

  function definirEscala(nova) {
    escala = Math.min(5, Math.max(1, nova));
    if (escala === 1) {
      x = 0;
      y = 0;
    }
    aplicar();
  }

  document.getElementById("zoomMais").addEventListener("click", () => definirEscala(escala + 0.3));
  document.getElementById("zoomMenos").addEventListener("click", () => definirEscala(escala - 0.3));
  img.addEventListener("dblclick", () => definirEscala(escala > 1 ? 1 : 2));

  visor.addEventListener("wheel", (evento) => {
    evento.preventDefault();
    definirEscala(escala + (evento.deltaY < 0 ? 0.2 : -0.2));
  }, { passive: false });

  img.addEventListener("pointerdown", (evento) => {
    if (escala === 1) return;
    arrastando = true;
    iniX = evento.clientX - x;
    iniY = evento.clientY - y;
    img.setPointerCapture(evento.pointerId);
    img.style.cursor = "grabbing";
  });

  img.addEventListener("pointermove", (evento) => {
    if (!arrastando) return;
    x = evento.clientX - iniX;
    y = evento.clientY - iniY;
    img.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
  });

  img.addEventListener("pointerup", (evento) => {
    arrastando = false;
    img.releasePointerCapture(evento.pointerId);
    img.style.cursor = "grab";
  });
}

/* -----------------------------------------------------------
   Comunicados
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
   Datas importantes
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
   Escuta do Firestore em tempo real
   ----------------------------------------------------------- */
onSnapshot(
  query(collection(db, "documentos"), orderBy("data", "desc")),
  (snap) => {
    documentos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderDocumentos();
  },
  (erro) => {
    console.error("Erro ao carregar documentos:", erro);
    const resumo = document.getElementById("listaDocumentos");
    if (resumo) resumo.innerHTML = `<li class="lista-estado">Erro ao carregar documentos.</li>`;
  }
);

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
