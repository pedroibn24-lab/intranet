/* =========================================================
   auth.js
   Lógica da tela de acesso (login.html):
   - Alterna entre as abas Entrar / Criar conta
   - Faz login e cadastro via Firebase Auth
   - Exige e-mail de domínio corporativo no cadastro E no login
     (bloqueia gmail, outlook e outros pessoais)
   - O cadastro envia um link de confirmação; o login só passa depois
     que esse link for clicado.
     Digitar um endereço do domínio é fácil; abrir a caixa de entrada
     dele não é — o clique no link é o que prova que a pessoa é dona
     daquele e-mail de verdade.
   ========================================================= */

import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Domínios corporativos aceitos no cadastro.
   Adicione outros domínios a esta lista se necessário. */
const DOMINIOS_PERMITIDOS = ["ibnegocios.com.br"];

/* Para onde o usuário vai após entrar. O cadastro não leva mais para cá:
   a conta recém-criada ainda precisa da confirmação por e-mail. */
const PAGINA_APOS_LOGIN = "index.html";

/* Espera entre dois envios do link de confirmação.
   O Firebase tem um freio próprio (bem mais rígido e do lado do servidor) que
   dispara "auth/too-many-requests". Esta espera existe só para a pessoa não
   bater lá sem entender o porquê: em vez de um erro seco, ela vê a contagem.
   Fica no localStorage para não sumir a cada F5. */
const SEGUNDOS_ESPERA = 60;
const CHAVE_ULTIMO_ENVIO = "ibn:ultimoEnvioConfirmacao";
const TEXTO_REENVIAR = "Reenviar e-mail de confirmação";

/* -----------------------------------------------------------
   Elementos
   ----------------------------------------------------------- */
const abas = document.querySelectorAll("[data-aba-auth]");
const formLogin = document.getElementById("formLogin");
const formCadastro = document.getElementById("formCadastro");
const elMensagem = document.getElementById("authMensagem");
const btnReenviar = document.getElementById("btnReenviar");
const reenviarTexto = document.getElementById("reenviarTexto");

/* -----------------------------------------------------------
   Abas Entrar / Criar conta
   ----------------------------------------------------------- */
function trocarAba(aba) {
  abas.forEach((botao) => {
    botao.classList.toggle("auth__aba--ativa", botao.dataset.abaAuth === aba);
  });
  formLogin.classList.toggle("oculto", aba !== "login");
  formCadastro.classList.toggle("oculto", aba !== "cadastro");
  limparMensagem();
}

abas.forEach((botao) => {
  botao.addEventListener("click", () => trocarAba(botao.dataset.abaAuth));
});

/* -----------------------------------------------------------
   Mensagens de feedback
   ----------------------------------------------------------- */
function mostrarMensagem(texto, tipo) {
  elMensagem.textContent = texto;
  elMensagem.className = `auth__mensagem auth__mensagem--${tipo}`;
}

function limparMensagem() {
  elMensagem.textContent = "";
  elMensagem.className = "auth__mensagem oculto";
  btnReenviar.classList.add("oculto");
}

/* -----------------------------------------------------------
   Espera entre um envio do link de confirmação e o próximo
   ----------------------------------------------------------- */
let temporizador = null;

function registrarEnvio() {
  localStorage.setItem(CHAVE_ULTIMO_ENVIO, String(Date.now()));
}

/* Segundos que ainda faltam para liberar um novo envio (0 = liberado) */
function segundosRestantes() {
  const ultimo = Number(localStorage.getItem(CHAVE_ULTIMO_ENVIO)) || 0;
  const passados = Math.floor((Date.now() - ultimo) / 1000);
  return Math.min(SEGUNDOS_ESPERA, Math.max(0, SEGUNDOS_ESPERA - passados));
}

/* Deixa o botão coerente com a espera: liberado ou em contagem regressiva */
function atualizarBotaoReenviar() {
  const restantes = segundosRestantes();

  if (restantes === 0) {
    clearInterval(temporizador);
    temporizador = null;
    btnReenviar.disabled = false;
    reenviarTexto.textContent = TEXTO_REENVIAR;
    return;
  }

  btnReenviar.disabled = true;
  reenviarTexto.textContent = `Aguarde ${restantes}s para enviar outro link`;
  if (!temporizador) temporizador = setInterval(atualizarBotaoReenviar, 1000);
}

function mostrarReenviar() {
  btnReenviar.classList.remove("oculto");
  atualizarBotaoReenviar();
}

/* -----------------------------------------------------------
   Validação do domínio corporativo
   ----------------------------------------------------------- */
function dominioPermitido(email) {
  const dominio = email.split("@")[1]?.toLowerCase().trim();
  return DOMINIOS_PERMITIDOS.includes(dominio);
}

/* -----------------------------------------------------------
   Login
   ----------------------------------------------------------- */
formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;
  limparMensagem();

  if (!dominioPermitido(email)) {
    mostrarMensagem(
      `Acesso permitido apenas com e-mail corporativo (@${DOMINIOS_PERMITIDOS[0]}).`,
      "erro"
    );
    return;
  }

  try {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);

    // A senha confere, mas o e-mail nunca foi confirmado: não é acesso válido.
    // Desfaz o login e oferece o reenvio do link.
    if (!credencial.user.emailVerified) {
      await signOut(auth);
      mostrarMensagem(
        "Confirme seu e-mail antes de entrar. Procure o link que enviamos " +
          "(veja também o lixo eletrônico).",
        "erro"
      );
      mostrarReenviar();
      return;
    }

    window.location.href = PAGINA_APOS_LOGIN;
  } catch (erro) {
    mostrarMensagem(traduzirErro(erro.code), "erro");
  }
});

/* -----------------------------------------------------------
   Reenviar o link de confirmação
   ----------------------------------------------------------- */
btnReenviar.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;

  if (!email || !senha) {
    mostrarMensagem("Digite seu e-mail e senha para reenviar o link.", "erro");
    return;
  }

  // O Firebase só envia o link para uma conta logada, e o login acabou de ser
  // desfeito. Então entra de novo só para pedir o e-mail e sai na sequência.
  btnReenviar.disabled = true;
  reenviarTexto.textContent = "Enviando…";
  try {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    await sendEmailVerification(credencial.user);
    await signOut(auth);
    registrarEnvio();
    mostrarMensagem(
      `Link reenviado para ${email}. Abra o e-mail e clique no link para ativar o acesso.`,
      "sucesso"
    );
  } catch (erro) {
    mostrarMensagem(traduzirErro(erro.code), "erro");
  }
  // Vale para os dois casos: enviou (entra na espera) ou falhou (libera de novo)
  atualizarBotaoReenviar();
});

/* -----------------------------------------------------------
   Cadastro (com validação de domínio)
   ----------------------------------------------------------- */
formCadastro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const nome = document.getElementById("cadNome").value.trim();
  const email = document.getElementById("cadEmail").value.trim();
  const senha = document.getElementById("cadSenha").value;
  const senha2 = document.getElementById("cadSenha2").value;

  if (!dominioPermitido(email)) {
    mostrarMensagem(
      `Cadastro permitido apenas com e-mail corporativo (@${DOMINIOS_PERMITIDOS[0]}). E-mails pessoais não são aceitos.`,
      "erro"
    );
    return;
  }
  if (senha.length < 6) {
    mostrarMensagem("A senha deve ter pelo menos 6 caracteres.", "erro");
    return;
  }
  if (senha !== senha2) {
    mostrarMensagem("As senhas não coincidem.", "erro");
    return;
  }

  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(credencial.user, { displayName: nome });

    // O Firebase já deixa a conta logada assim que ela é criada. Mandamos o
    // link e deslogamos: a conta só passa a valer depois do clique no e-mail.
    await sendEmailVerification(credencial.user);
    await signOut(auth);
    registrarEnvio();

    formCadastro.reset();
    trocarAba("login");
    mostrarMensagem(
      `Conta criada! Enviamos um link de confirmação para ${email}. ` +
        `Abra o e-mail e clique no link para ativar o acesso ` +
        `(se não encontrar, procure no lixo eletrônico).`,
      "sucesso"
    );
  } catch (erro) {
    mostrarMensagem(traduzirErro(erro.code), "erro");
  }
});

/* -----------------------------------------------------------
   Traduz os códigos de erro do Firebase para mensagens amigáveis
   ----------------------------------------------------------- */
function traduzirErro(codigo) {
  const mapa = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres).",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
  };
  return mapa[codigo] || "Ocorreu um erro. Tente novamente.";
}
