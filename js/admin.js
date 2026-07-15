/* =========================================================
   admin.js
   Área administrativa (admin.html):
   - Libera o conteúdo apenas para usuários autenticados com
     e-mail do domínio corporativo (senão, mostra "Área restrita")
   - Cadastra Comunicados, Documentos e Datas importantes
   - Documentos: envia o arquivo para o servidor (upload.php) e
     salva os dados + a URL no Firestore
   ========================================================= */

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* Mesmos domínios aceitos no cadastro (ver auth.js) */
const DOMINIOS_PERMITIDOS = ["ibnegocios.com.br"];

/* Endereço dos scripts PHP (upload/exclusão de arquivos).
   Para testar pelo Live Server local, coloque a
   URL do seu site */
const URL_SERVIDOR = "https://intranet.ibnegocios.com.br";
const URL_UPLOAD = `${URL_SERVIDOR}/upload.php`;
const URL_DELETE = `${URL_SERVIDOR}/delete.php`;

/* -----------------------------------------------------------
   Elementos
   ----------------------------------------------------------- */
const bloqueio = document.getElementById("adminBloqueio");
const bloqueioTexto = document.getElementById("adminBloqueioTexto");
const conteudo = document.getElementById("adminConteudo");
const usuarioNome = document.getElementById("adminUsuarioNome");
const btnSair = document.getElementById("btnSair");

/* -----------------------------------------------------------
   Verificação de domínio
   ----------------------------------------------------------- */
function dominioPermitido(email) {
  const dominio = email?.split("@")[1]?.toLowerCase().trim();
  return DOMINIOS_PERMITIDOS.includes(dominio);
}

/* -----------------------------------------------------------
   Controle de acesso: só libera para admin autenticado
   ----------------------------------------------------------- */
onAuthStateChanged(auth, (usuario) => {
  if (usuario && usuario.emailVerified && dominioPermitido(usuario.email)) {
    bloqueio.classList.add("oculto");
    conteudo.classList.remove("oculto");
    usuarioNome.textContent = usuario.displayName || usuario.email;
    return;
  }

  conteudo.classList.add("oculto");
  bloqueio.classList.remove("oculto");

  if (!usuario) {
    bloqueioTexto.textContent =
      "Você precisa estar autenticado com um e-mail corporativo para acessar a administração.";
  } else if (!usuario.emailVerified) {
    bloqueioTexto.textContent =
      "Confirme seu e-mail antes de acessar esta área. O link foi enviado para o seu e-mail corporativo.";
  } else {
    bloqueioTexto.textContent = "Sua conta não tem permissão para acessar esta área.";
  }
});

/* -----------------------------------------------------------
   Logout
   ----------------------------------------------------------- */
btnSair.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

/* -----------------------------------------------------------
   Mensagens de feedback
   ----------------------------------------------------------- */
function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `admin__msg admin__msg--${tipo}`;
}

/* Converte o valor do input date (YYYY-MM-DD) em Timestamp do Firestore */
function dataParaTimestamp(valor) {
  return Timestamp.fromDate(new Date(`${valor}T00:00:00`));
}

/* Converte o valor do input date (YYYY-MM-DD) no texto "dd/mm" */
function diaMesDeInput(valor) {
  const [, mes, dia] = valor.split("-");
  return `${dia}/${mes}`;
}

/* Desabilita/reabilita o botão de envio de um formulário */
function bloquearEnvio(form, bloquear, textoEnviando) {
  const botao = form.querySelector("button[type='submit']");
  botao.disabled = bloquear;
  if (bloquear) {
    botao.dataset.textoOriginal = botao.textContent;
    botao.textContent = textoEnviando;
  } else if (botao.dataset.textoOriginal) {
    botao.textContent = botao.dataset.textoOriginal;
  }
}

/* -----------------------------------------------------------
   Formulário: Novo comunicado
   ----------------------------------------------------------- */
const formComunicado = document.getElementById("formComunicado");
const msgComunicado = document.getElementById("msgComunicado");

formComunicado.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  bloquearEnvio(formComunicado, true, "Publicando…");

  try {
    await addDoc(collection(db, "comunicados"), {
      titulo: document.getElementById("comTitulo").value.trim(),
      conteudo: document.getElementById("comConteudo").value.trim(),
      data: dataParaTimestamp(document.getElementById("comData").value),
      criadoEm: serverTimestamp(),
    });
    mostrarMensagem(msgComunicado, "Comunicado publicado com sucesso!", "sucesso");
    formComunicado.reset();
  } catch (erro) {
    mostrarMensagem(msgComunicado, "Erro ao publicar. Tente novamente.", "erro");
    console.error(erro);
  } finally {
    bloquearEnvio(formComunicado, false);
  }
});

/* -----------------------------------------------------------
   Formulário: Novo documento (upload no servidor + Firestore)
   ----------------------------------------------------------- */
const formDocumento = document.getElementById("formDocumento");
const msgDocumento = document.getElementById("msgDocumento");

formDocumento.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const arquivo = document.getElementById("docArquivo").files[0];
  if (!arquivo) {
    mostrarMensagem(msgDocumento, "Selecione um arquivo.", "erro");
    return;
  }

  bloquearEnvio(formDocumento, true, "Enviando…");
  try {
    // Token do admin logado — o upload.php valida antes de salvar
    const token = await auth.currentUser.getIdToken();

    const dadosForm = new FormData();
    dadosForm.append("arquivo", arquivo);
    dadosForm.append("token", token);

    const resposta = await fetch(URL_UPLOAD, { method: "POST", body: dadosForm });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro || "Falha no upload.");

    await addDoc(collection(db, "documentos"), {
      titulo: document.getElementById("docTitulo").value.trim(),
      data: dataParaTimestamp(document.getElementById("docData").value),
      arquivoUrl: resultado.url,
      arquivoNome: resultado.nome,
      arquivoTipo: resultado.tipo,
      criadoEm: serverTimestamp(),
    });

    mostrarMensagem(msgDocumento, "Documento enviado com sucesso!", "sucesso");
    formDocumento.reset();
  } catch (erro) {
    mostrarMensagem(msgDocumento, erro.message || "Erro ao enviar o documento.", "erro");
    console.error(erro);
  } finally {
    bloquearEnvio(formDocumento, false);
  }
});

/* -----------------------------------------------------------
   Formulário: Nova data importante
   ----------------------------------------------------------- */
const formData = document.getElementById("formData");
const msgData = document.getElementById("msgData");

formData.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  bloquearEnvio(formData, true, "Adicionando…");

  try {
    await addDoc(collection(db, "datas"), {
      rotulo: document.getElementById("dataRotulo").value.trim(),
      dia: diaMesDeInput(document.getElementById("dataDia").value),
      criadoEm: serverTimestamp(),
    });
    mostrarMensagem(msgData, "Data adicionada com sucesso!", "sucesso");
    formData.reset();
  } catch (erro) {
    mostrarMensagem(msgData, "Erro ao adicionar a data. Tente novamente.", "erro");
    console.error(erro);
  } finally {
    bloquearEnvio(formData, false);
  }
});

/* -----------------------------------------------------------
   Listas com opção de excluir (comunicados e datas)
   ----------------------------------------------------------- */
const listaComunicadosAdmin = document.getElementById("listaComunicadosAdmin");
const listaDatasAdmin = document.getElementById("listaDatasAdmin");
const listaDocumentosAdmin = document.getElementById("listaDocumentosAdmin");

function esc(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarDiaMes(ts) {
  if (!ts?.toDate) return "";
  const data = ts.toDate();
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

function itemAdminHTML(colecao, id, titulo, detalhe) {
  return `
    <div class="admin__item">
      <div class="admin__item-info">
        <strong>${esc(titulo)}</strong>
        <span>${esc(detalhe)}</span>
      </div>
      <button class="admin__excluir" data-colecao="${colecao}" data-id="${id}" aria-label="Excluir">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>`;
}

onSnapshot(query(collection(db, "comunicados"), orderBy("data", "desc")), (snap) => {
  listaComunicadosAdmin.innerHTML = snap.empty
    ? `<p class="lista-estado">Nenhum comunicado.</p>`
    : snap.docs.map((d) => {
        const c = d.data();
        return itemAdminHTML("comunicados", d.id, c.titulo, formatarDiaMes(c.data));
      }).join("");
});

onSnapshot(query(collection(db, "datas"), orderBy("criadoEm", "asc")), (snap) => {
  listaDatasAdmin.innerHTML = snap.empty
    ? `<p class="lista-estado">Nenhuma data.</p>`
    : snap.docs.map((d) => {
        const dt = d.data();
        return itemAdminHTML("datas", d.id, dt.rotulo, dt.dia);
      }).join("");
});

onSnapshot(query(collection(db, "documentos"), orderBy("data", "desc")), (snap) => {
  listaDocumentosAdmin.innerHTML = snap.empty
    ? `<p class="lista-estado">Nenhum documento.</p>`
    : snap.docs.map((d) => {
        const doc = d.data();
        // data-nome guarda o arquivo, para o delete apagá-lo também do servidor
        return `
          <div class="admin__item">
            <div class="admin__item-info">
              <strong>${esc(doc.titulo)}</strong>
              <span>${esc(formatarDiaMes(doc.data))}</span>
            </div>
            <button class="admin__excluir" data-colecao="documentos" data-id="${d.id}" data-nome="${esc(doc.arquivoNome || "")}" aria-label="Excluir">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`;
      }).join("");
});

/* Modal de confirmação: retorna uma Promise que resolve true/false */
function confirmarExclusao(mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modalConfirmar");
    const btnOk = document.getElementById("confirmarOk");
    document.getElementById("confirmarMensagem").textContent = mensagem;
    modal.classList.remove("oculto");

    const cancelaveis = modal.querySelectorAll("[data-fechar-confirmar]");

    function encerrar(resultado) {
      modal.classList.add("oculto");
      btnOk.removeEventListener("click", aoConfirmar);
      cancelaveis.forEach((el) => el.removeEventListener("click", aoCancelar));
      document.removeEventListener("keydown", aoTeclar);
      resolve(resultado);
    }
    function aoConfirmar() { encerrar(true); }
    function aoCancelar() { encerrar(false); }
    function aoTeclar(evento) { if (evento.key === "Escape") encerrar(false); }

    btnOk.addEventListener("click", aoConfirmar);
    cancelaveis.forEach((el) => el.addEventListener("click", aoCancelar));
    document.addEventListener("keydown", aoTeclar);
  });
}

/* Toast (aviso flutuante) */
let toastTimer;
function mostrarToast(texto, tipo) {
  const toast = document.getElementById("toast");
  toast.textContent = texto;
  toast.className = `toast toast--${tipo} toast--visivel`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast--visivel"), 3000);
}

document.addEventListener("click", async (evento) => {
  const botao = evento.target.closest(".admin__excluir");
  if (!botao) return;

  const confirmado = await confirmarExclusao("Tem certeza que deseja excluir este item?");
  if (!confirmado) return;

  try {
    await deleteDoc(doc(db, botao.dataset.colecao, botao.dataset.id));

    // Se for documento, apaga também o arquivo no servidor
    if (botao.dataset.colecao === "documentos" && botao.dataset.nome) {
      const token = await auth.currentUser.getIdToken();
      const dadosForm = new FormData();
      dadosForm.append("token", token);
      dadosForm.append("nome", botao.dataset.nome);
      await fetch(URL_DELETE, { method: "POST", body: dadosForm });
    }

    mostrarToast("Item excluído com sucesso.", "sucesso");
  } catch (erro) {
    console.error("Erro ao excluir:", erro);
    mostrarToast("Erro ao excluir. Tente novamente.", "erro");
  }
});
