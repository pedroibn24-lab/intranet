/* =========================================================
   Google Apps Script — Lista os arquivos de uma pasta do Drive
   e devolve como JSON para a intranet consumir.

   COMO CONFIGURAR (uma vez):
   1. Crie uma pasta no Google Drive e coloque os documentos nela.
   2. Compartilhe a pasta como "Qualquer pessoa com o link pode ver"
      (necessário para o preview funcionar no site).
   3. Copie o ID da pasta — está na URL:
      drive.google.com/drive/folders/ESTE_TRECHO_É_O_ID
   4. Acesse https://script.google.com > Novo projeto.
   5. Cole este código e substitua ID_DA_PASTA abaixo.
   6. Implantar > Nova implantação > tipo "App da Web":
        - Executar como: Eu
        - Quem tem acesso: Qualquer pessoa
      Implantar e autorizar.
   7. Copie a URL do App da Web e cole no js/app.js
      (constante URL_DOCUMENTOS_DRIVE).
   ========================================================= */

const ID_DA_PASTA = "COLE_O_ID_DA_PASTA_AQUI";

function doGet() {
  const pasta = DriveApp.getFolderById(ID_DA_PASTA);
  const iterador = pasta.getFiles();
  const arquivos = [];

  while (iterador.hasNext()) {
    const arquivo = iterador.next();
    arquivos.push({
      id: arquivo.getId(),
      nome: arquivo.getName(),
      tipo: arquivo.getMimeType(),
      atualizado: arquivo.getLastUpdated().toISOString(),
      url: arquivo.getUrl(),
    });
  }

  arquivos.sort((a, b) => new Date(b.atualizado) - new Date(a.atualizado));

  return ContentService
    .createTextOutput(JSON.stringify(arquivos))
    .setMimeType(ContentService.MimeType.JSON);
}
