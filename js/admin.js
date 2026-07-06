/* =========================================================
   admin.js
   Área administrativa (admin.html):
   - Libera o conteúdo apenas para usuários autenticados com
     e-mail do domínio corporativo (senão, mostra "Área restrita")
   - Cadastra Comunicados e Datas no Firestore
   - Cadastra Documentos: faz upload do arquivo no Storage e
     salva a URL no Firestore
   ========================================================= */

import { auth, db, storage } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* Mesmos domínios aceitos no cadastro (ver auth.js) */
const DOMINIOS_PERMITIDOS = ["ibnegocios.com.br"];

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
  if (usuario && dominioPermitido(usuario.email)) {
    bloqueio.classList.add("oculto");
    conteudo.classList.remove("oculto");
    usuarioNome.textContent = usuario.displayName || usuario.email;
  } else {
    conteudo.classList.add("oculto");
    bloqueio.classList.remove("oculto");
    bloqueioTexto.textContent = usuario
      ? "Sua conta não tem permissão para acessar esta área."
      : "Você precisa estar autenticado com um e-mail corporativo para acessar a administração.";
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
   Formulário: Novo documento (upload no Storage + Firestore)
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
    const caminho = `documentos/${Date.now()}_${arquivo.name}`;
    const referencia = ref(storage, caminho);
    await uploadBytes(referencia, arquivo);
    const url = await getDownloadURL(referencia);

    await addDoc(collection(db, "documentos"), {
      titulo: document.getElementById("docTitulo").value.trim(),
      data: dataParaTimestamp(document.getElementById("docData").value),
      arquivoUrl: url,
      arquivoNome: arquivo.name,
      arquivoTipo: arquivo.type,
      criadoEm: serverTimestamp(),
    });

    mostrarMensagem(msgDocumento, "Documento enviado com sucesso!", "sucesso");
    formDocumento.reset();
  } catch (erro) {
    mostrarMensagem(msgDocumento, "Erro ao enviar o documento. Tente novamente.", "erro");
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
      dia: document.getElementById("dataDia").value.trim(),
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
