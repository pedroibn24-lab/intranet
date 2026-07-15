/* =========================================================
   guarda.js
   Manda para o login quem abrir uma página interna sem estar
   autenticado com e-mail corporativo confirmado.

   Incluir no <head> das páginas internas, junto do components.js:
     <script type="module" src="js/guarda.js"></script>
   E marcar o <body> com a classe "verificando-acesso", que esconde
   a página até a checagem terminar (senão o conteúdo pisca na tela
   antes do redirecionamento).

   ATENÇÃO — isto NÃO é uma tranca. O arquivo .html continua sendo
   servido pelo Apache para quem pedir; qualquer um que ignore o
   navegador lê o HTML. O que protege o conteúdo de verdade são as
   regras do Firestore, que rodam no servidor do Google. Esta guarda
   existe para o visitante certo ir parar no lugar certo.
   ========================================================= */

import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Mesmos domínios aceitos no login (ver auth.js) */
const DOMINIOS_PERMITIDOS = ["ibnegocios.com.br"];

function dominioPermitido(email) {
  const dominio = email?.split("@")[1]?.toLowerCase().trim();
  return DOMINIOS_PERMITIDOS.includes(dominio);
}

onAuthStateChanged(auth, (usuario) => {
  const liberado =
    usuario && usuario.emailVerified && dominioPermitido(usuario.email);

  if (liberado) {
    document.body.classList.remove("verificando-acesso");
    return;
  }

  // replace() em vez de href: evita que o botão "voltar" caia de novo aqui
  window.location.replace("login.html");
});
