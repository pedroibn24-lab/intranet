/* =========================================================
   polos.js
   Página de Polos: lista os polos (2 colunas) e, ao clicar
   em um polo, mostra a "página" dele na mesma tela, no padrão
   do site antigo (nome, endereço, telefone, contatos, Instagram).
   ========================================================= */

const MARCA_NOME = { anhanguera: "Anhanguera", unopar: "UNOPAR" };

/* -----------------------------------------------------------
   DADOS DOS POLOS — preencha os campos vazios com os dados reais.
   endereco: use \n para quebrar linha.
   comercial/secretaria/financeiro/instagram: links (deixe "" se não tiver).
   ----------------------------------------------------------- */
const POLOS = [
  {
    id: "anhanguera-americana",
    nome: "Anhanguera Americana",
    marca: "anhanguera",
    titulo: "Polo Americana",
    endereco: "",
    telefone: "",
    comercial: "",
    secretaria: "",
    financeiro: "",
    instagram: "",
  },
  {
    id: "anhanguera-sbo",
    nome: "Anhanguera SBO",
    marca: "anhanguera",
    titulo: "Polo Santa Bárbara D'Oeste",
    endereco: "R. do Algodão, 1550 - Jardim Perola\nSanta Bárbara d'Oeste - SP, 13454-170",
    telefone: "19 3450-1815",
    comercial: "",
    secretaria: "",
    financeiro: "",
    instagram: "",
  },
  {
    id: "anhanguera-manaus",
    nome: "Anhanguera Manaus I",
    marca: "anhanguera",
    titulo: "Polo Manaus I (Alvorada)",
    endereco: "",
    telefone: "",
    comercial: "",
    secretaria: "",
    financeiro: "",
    instagram: "",
  },
  {
    id: "anhanguera-aracatuba",
    nome: "Anhanguera Araçatuba",
    marca: "anhanguera",
    titulo: "Polo Araçatuba",
    endereco: "",
    telefone: "",
    comercial: "",
    secretaria: "",
    financeiro: "",
    instagram: "",
  },
  {
    id: "unopar-blumenau",
    nome: "UNOPAR Blumenau",
    marca: "unopar",
    titulo: "Polo Blumenau",
    endereco: "",
    telefone: "",
    comercial: "",
    secretaria: "",
    financeiro: "",
    instagram: "",
  },
  {
    id: "unopar-maravilha",
    nome: "UNOPAR Maravilha",
    marca: "unopar",
    titulo: "Polo Maravilha",
    endereco: "",
    telefone: "",
    comercial: "",
    secretaria: "",
    financeiro: "",
    instagram: "",
  },
  {
    id: "unopar-caibi",
    nome: "UNOPAR Caibi",
    marca: "unopar",
    titulo: "Polo Caibi",
    endereco: "",
    telefone: "",
    comercial: "",
    secretaria: "",
    financeiro: "",
    instagram: "",
  },
];

/* -----------------------------------------------------------
   Elementos
   ----------------------------------------------------------- */
const colAnhanguera = document.getElementById("colAnhanguera");
const colUnopar = document.getElementById("colUnopar");
const vistaLista = document.getElementById("vistaLista");
const vistaPolo = document.getElementById("vistaPolo");
const poloConteudo = document.getElementById("poloConteudo");

/* -----------------------------------------------------------
   Lista de polos (2 colunas)
   ----------------------------------------------------------- */
function barraHTML(polo) {
  return `<button class="polo-bar polo-bar--${polo.marca}" data-id="${polo.id}">
            <span>${polo.nome}</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>`;
}

function renderLista() {
  colAnhanguera.innerHTML = POLOS.filter((p) => p.marca === "anhanguera").map(barraHTML).join("");
  colUnopar.innerHTML = POLOS.filter((p) => p.marca === "unopar").map(barraHTML).join("");
}

/* -----------------------------------------------------------
   Página de um polo (padrão do site antigo)
   ----------------------------------------------------------- */
function abrirPolo(id) {
  const polo = POLOS.find((p) => p.id === id);
  if (!polo) return;

  const endereco = polo.endereco
    ? `<p class="polo-pagina__endereco">${polo.endereco.replace(/\n/g, "<br>")}</p>`
    : "";

  const telefone = polo.telefone
    ? `<p class="polo-pagina__tel"><i class="fa-solid fa-phone"></i> ${polo.telefone}</p>`
    : "";

  const instagram = `
    <div class="polo-pagina__social">
      <a href="${polo.instagram || "#"}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        <i class="fa-brands fa-instagram"></i>
      </a>
    </div>`;

  poloConteudo.innerHTML = `
    <div class="polo-pagina polo-pagina--${polo.marca}">
      <div class="polo-pagina__marca">${MARCA_NOME[polo.marca] || ""}</div>
      <h1 class="polo-pagina__nome">${polo.titulo || polo.nome}</h1>
      ${endereco}
      ${telefone}

      <p class="polo-pagina__cta">Clique no botão para entrar em contato:</p>
      <div class="polo-pagina__botoes">
        <a class="polo-contato-btn" href="${polo.comercial || "#"}" target="_blank" rel="noopener noreferrer">Comercial</a>
        <a class="polo-contato-btn" href="${polo.secretaria || "#"}" target="_blank" rel="noopener noreferrer">Secretaria</a>
        <a class="polo-contato-btn" href="${polo.financeiro || "#"}" target="_blank" rel="noopener noreferrer">Financeiro</a>
      </div>

      ${instagram}
    </div>`;

  vistaLista.classList.add("oculto");
  vistaPolo.classList.remove("oculto");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -----------------------------------------------------------
   Interações
   ----------------------------------------------------------- */
document.addEventListener("click", (evento) => {
  const barra = evento.target.closest(".polo-bar");
  if (barra) abrirPolo(barra.dataset.id);
});

document.getElementById("voltarLista").addEventListener("click", () => {
  vistaPolo.classList.add("oculto");
  vistaLista.classList.remove("oculto");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderLista();
