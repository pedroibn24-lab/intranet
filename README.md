# Intranet IBN

(Site ainda está incompleto)

Intranet corporativa do **Instituto Brasileiro de Negócios (IBN)** — feita em **HTML5, CSS3 e JavaScript puro** (sem frameworks), com **Firebase** (via CDN) para autenticação e banco de dados, e **PHP** no cPanel para upload seguro de arquivos.

> Site interno: **não** aparece em buscadores (meta `noindex`). O acesso ao conteúdo é público (leitura); a administração é restrita a e-mails do domínio corporativo.

---

## Tecnologias

- **HTML5 / CSS3 / JavaScript (ES Modules)** — sem frameworks
- **Firebase 10.12 (CDN)** — Authentication (e-mail/senha) e Firestore (banco)
- **PHP 8.3 (cPanel)** — upload/exclusão de arquivos com verificação de token
- **GitHub Actions** — deploy automático via FTP para o cPanel

Não há `npm`/build: tudo roda direto no navegador. Basta servir os arquivos por HTTP.

---

## Estrutura de pastas

```
intranet-ibn/
├── index.html               # Página Início
├── recursos-humanos.html    # Página Recursos Humanos
├── login.html               # Login / Cadastro
├── admin.html               # Área administrativa (restrita)
│
├── css/
│   ├── style.css            # Estilos globais (header, footer, cards, RH…)
│   ├── modal.css            # Modais e visor de preview
│   ├── auth.css             # Tela de login
│   └── admin.css            # Área administrativa
│
├── js/
│   ├── components.js        # Injeta header/nav/footer + sessão + "voltar ao topo"
│   ├── firebase-config.js   # Inicializa o Firebase (Auth + Firestore)
│   ├── app.js               # Página RH: lista dados e abre os modais/preview
│   ├── auth.js              # Login/cadastro + validação de domínio
│   └── admin.js             # Formulários (criar/excluir) + upload
│
├── firebase-auth.php        # Verifica o token do Firebase (usado pelos uploads)
├── upload.php               # Recebe e salva o arquivo (só admin logado)
├── delete.php               # Apaga um arquivo (só admin logado)
│
├── documentos-rh/           # Pasta onde os arquivos enviados são guardados
│   └── .htaccess            # Bloqueia execução de scripts na pasta
│
├── assets/                  # Logos e imagens
├── firestore.rules          # Regras de segurança do Firestore
├── robots.txt               # Instruções para buscadores (não indexar)
└── .github/workflows/       # Deploy automático (FTP)
```

---

## Páginas

| Página | Arquivo | Descrição |
|---|---|---|
| **Início** | `index.html` | Hero do instituto, redes sociais, diretrizes e metodologia |
| **Recursos Humanos** | `recursos-humanos.html` | Documentos, comunicados e datas importantes |
| **Login / Cadastro** | `login.html` | Acesso restrito (validação de domínio) |
| **Administração** | `admin.html` | Cadastrar/excluir conteúdo (só admin) |

O **header, o menu e o rodapé** são injetados por `js/components.js` — editar em um lugar reflete em todas as páginas.

---

## Como funciona

### Conteúdo (comunicados, documentos, datas)
- Ficam no **Firestore** (banco em tempo real).
- A página RH escuta as mudanças e atualiza sozinha (`onSnapshot`).

### Arquivos dos documentos
Importante: **o arquivo não vai para o banco.** O fluxo é:

1. O admin escolhe o arquivo no formulário.
2. O arquivo é enviado para o **`upload.php`** (no cPanel), que valida e salva na pasta **`documentos-rh/`**.
3. O `upload.php` devolve a **URL** do arquivo.
4. O **Firestore** guarda só os dados de texto + essa URL.

Ou seja: **arquivo → cPanel**, **link e textos → Firestore**.

### Modelo de dados (Firestore)

```
comunicados: { titulo, conteudo, data (Timestamp), criadoEm }
documentos:  { titulo, data (Timestamp), arquivoUrl, arquivoNome, arquivoTipo, criadoEm }
datas:       { rotulo, dia ("dd/mm"), criadoEm }
```

---

## Segurança

- **Cadastro restrito ao domínio:** só e-mails `@ibnegocios.com.br` conseguem criar conta (validado no `auth.js`). E-mails pessoais (gmail, outlook…) são bloqueados.
- **Escrita protegida no banco:** as `firestore.rules` só permitem gravar/excluir para usuários autenticados do domínio; a leitura é pública.
- **Upload protegido de verdade:** o `upload.php`/`delete.php` **verificam o token do Firebase** a cada requisição (esconder o formulário não basta — o endpoint valida quem está enviando). Só admin do domínio consegue subir/excluir arquivos.
- **Pasta de uploads blindada:** o `.htaccess` em `documentos-rh/` impede que qualquer script seja executado ali (evita "web shell") e bloqueia listagem.
- **Fora dos buscadores:** todas as páginas têm `<meta name="robots" content="noindex, nofollow">`.

---

## Configuração

### 1. Firebase (Console)
No [console.firebase.google.com](https://console.firebase.google.com), projeto `intranet-ibn`:
- **Authentication** → habilitar **E-mail/senha**
- **Firestore Database** → criar e publicar o conteúdo de `firestore.rules` (aba Regras)
- **Authentication → Settings → Domínios autorizados** → adicionar o domínio do site

As chaves ficam em `js/firebase-config.js`.

### 2. Domínio permitido
Definido em `js/auth.js` e `js/admin.js`:
```js
const DOMINIOS_PERMITIDOS = ["ibnegocios.com.br"];
```

### 3. Endereço do servidor (upload)
Em `js/admin.js`:
```js
// "" = mesmo domínio (produção). Para testar no Live Server local,
// coloque a URL do site, ex: "https://seudominio.com.br"
const URL_SERVIDOR = "";
```

### 4. cPanel / PHP
- PHP **8.3** (ea-php83)
- Os arquivos `.php` e a pasta `documentos-rh/` sobem automaticamente no deploy.

---

## Rodar localmente

Módulos ES **não** funcionam abrindo o HTML com duplo clique (`file://`). Use um servidor local:

- **VS Code:** extensão **Live Server** → botão direito no `index.html` → *Open with Live Server*
- **ou** Python: `python -m http.server` na pasta do projeto

Para testar o **upload** localmente, aponte `URL_SERVIDOR` (em `admin.js`) para o domínio onde os `.php` já estão publicados.

---

## Deploy

O deploy é **automático**: todo `push` na branch `main` dispara o GitHub Actions (`.github/workflows/deploy.yml`), que envia os arquivos para o cPanel via **FTP**.

As credenciais de FTP ficam em **GitHub Secrets** (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`) — nunca no código.

---

## Licença / uso

Projeto interno do Instituto Brasileiro de Negócios. Uso restrito à organização.
