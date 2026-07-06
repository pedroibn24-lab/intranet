/* =========================================================
   auth.js
   Lógica da tela de acesso (login.html):
   - Alterna entre as abas Entrar / Criar conta
   - Faz login e cadastro via Firebase Auth
   - No cadastro, valida que o e-mail é de um domínio corporativo
     (bloqueia gmail, outlook e outros pessoais)
   ========================================================= */

import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Domínios corporativos aceitos no cadastro.
   Adicione outros domínios a esta lista se necessário. */
const DOMINIOS_PERMITIDOS = ["ibnegocios.com.br"];

/* Para onde o usuário vai após entrar/cadastrar */
const PAGINA_APOS_LOGIN = "index.html";

/* -----------------------------------------------------------
   Elementos
   ----------------------------------------------------------- */
const abas = document.querySelectorAll("[data-aba-auth]");
const formLogin = document.getElementById("formLogin");
const formCadastro = document.getElementById("formCadastro");
const elMensagem = document.getElementById("authMensagem");

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

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = PAGINA_APOS_LOGIN;
  } catch (erro) {
    mostrarMensagem(traduzirErro(erro.code), "erro");
  }
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
    mostrarMensagem("Conta criada com sucesso! Redirecionando…", "sucesso");
    setTimeout(() => (window.location.href = PAGINA_APOS_LOGIN), 1200);
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
