/* =========================================================
   components.js
   Injeta o HEADER (logo + nav + perfil), o FOOTER e o botão
   flutuante "Voltar ao Topo" em todas as páginas. Assim,
   edita-se a estrutura em UM único lugar.

   Como usar em cada página:
   1. Coloque no <body>:
        <div id="site-header"></div>   (onde entra o cabeçalho)
        <div id="site-footer"></div>   (onde entra o rodapé)
   2. Importe este arquivo:
        <script type="module" src="js/components.js"></script>

   Observações:
   - O item ativo do menu é detectado AUTOMATICAMENTE pela URL.
   - O cabeçalho NÃO fica fixo: ele rola junto com a página.
     Por isso existe o botão "Voltar ao Topo", que aparece quando
     o usuário rola para baixo e leva de volta ao header.
   ========================================================= */

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* -----------------------------------------------------------
   Itens do menu de navegação superior.
   'href' também é usado para detectar a página ativa.
   ----------------------------------------------------------- */
const ITENS_NAV = [
  { rotulo: "Início",              href: "index.html" },
  { rotulo: "Diretoria",           href: "diretoria.html" },
  { rotulo: "Acadêmico",           href: "#" },
  { rotulo: "Marketing",           href: "#" },
  { rotulo: "Comercial",           href: "#" },
  { rotulo: "Recursos Humanos",    href: "recursos-humanos.html" },
  { rotulo: "Financeiro | Compras", href: "#" },
];

/* -----------------------------------------------------------
   Descobre o nome do arquivo atual a partir da URL.
   Ex.: ".../recursos-humanos.html" -> "recursos-humanos.html"
   Se a URL terminar em "/" (URL limpa), assume "index.html".
   ----------------------------------------------------------- */
function arquivoAtual() {
  const partes = window.location.pathname.split("/");
  const ultimo = partes[partes.length - 1];
  return ultimo === "" ? "index.html" : ultimo;
}

/* -----------------------------------------------------------
   Monta o HTML do cabeçalho, marcando o item ativo.
   ----------------------------------------------------------- */
function montarCabecalho() {
  const atual = arquivoAtual();

  const links = ITENS_NAV.map((item) => {
    // Só destaca itens que apontam para uma página real (ignora "#")
    const ativo = item.href !== "#" && item.href === atual
      ? " nav-principal__item--ativo"
      : "";
    return `<a href="${item.href}" class="nav-principal__item${ativo}">${item.rotulo}</a>`;
  }).join("");

  return `
    <header class="cabecalho">
      <div class="cabecalho__conteudo">

        <!-- Marca: logo IBN + título -->
        <a href="index.html" class="marca">
          <img src="assets/IBN-LOGO.png" alt="Logo IBN" class="marca__logo" />
          <span class="marca__divisor"></span>
          <span class="marca__titulo">Intranet IBN</span>
        </a>

        <!-- Navegação principal -->
        <nav class="nav-principal" aria-label="Navegação principal">
          ${links}
        </nav>

        <!-- Ações: perfil do usuário -->
        <div class="cabecalho__acoes">
          <!-- O nome/destino são atualizados conforme o login (configurarSessao) -->
          <a href="login.html" class="perfil" id="perfilUsuario" title="Minha conta">
            <span class="perfil__avatar"><i class="fa-regular fa-user"></i></span>
            <span class="perfil__nome" id="perfilNome">Entrar</span>
          </a>
          <button class="perfil__sair oculto" id="perfilSair" title="Sair">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </header>
  `;
}

/* -----------------------------------------------------------
   Monta o HTML do rodapé (apenas copyright, conforme definido).
   ----------------------------------------------------------- */
function montarRodape() {
  return `
    <footer class="rodape">
      <p class="rodape__texto">
        Instituto Brasileiro de Negócios — 2026 — Todos os direitos reservados.
      </p>
    </footer>
  `;
}

/* -----------------------------------------------------------
   Botão flutuante "Voltar ao Topo".
   - É criado e adicionado ao final do <body>.
   - Fica escondido no topo; aparece após rolar ~300px.
   - Ao clicar, rola suavemente de volta ao início (o header).
   ----------------------------------------------------------- */
function montarVoltarAoTopo() {
  const botao = document.createElement("button");
  botao.className = "voltar-topo";
  botao.setAttribute("aria-label", "Voltar ao topo");
  botao.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';

  // Rola suavemente até o topo da página (onde está o header)
  botao.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Mostra/esconde conforme a rolagem
  const atualizarVisibilidade = () => {
    if (window.scrollY > 300) {
      botao.classList.add("voltar-topo--visivel");
    } else {
      botao.classList.remove("voltar-topo--visivel");
    }
  };
  window.addEventListener("scroll", atualizarVisibilidade);
  atualizarVisibilidade(); // estado inicial

  document.body.appendChild(botao);
}

/* -----------------------------------------------------------
   Estado de sessão no header: mostra o nome do usuário logado
   e o botão Sair; ou "Entrar" quando ninguém está logado.
   ----------------------------------------------------------- */
function configurarSessao() {
  const perfil = document.getElementById("perfilUsuario");
  const nome = document.getElementById("perfilNome");
  const sair = document.getElementById("perfilSair");
  if (!perfil || !nome || !sair) return;

  onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
      nome.textContent = usuario.displayName || usuario.email;
      perfil.setAttribute("href", "admin.html");
      sair.classList.remove("oculto");
    } else {
      nome.textContent = "Entrar";
      perfil.setAttribute("href", "login.html");
      sair.classList.add("oculto");
    }
  });

  sair.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

/* -----------------------------------------------------------
   Inicialização: injeta os componentes nos placeholders.
   ----------------------------------------------------------- */
function iniciarComponentes() {
  const alvoHeader = document.getElementById("site-header");
  const alvoFooter = document.getElementById("site-footer");

  if (alvoHeader) alvoHeader.innerHTML = montarCabecalho();
  if (alvoFooter) alvoFooter.innerHTML = montarRodape();

  montarVoltarAoTopo();
  configurarSessao();
}

// Executa assim que o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarComponentes);
} else {
  iniciarComponentes();
}
