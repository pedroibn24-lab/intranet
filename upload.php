<?php
/* =========================================================
   upload.php
   Recebe um arquivo do admin, verifica o login (token do
   Firebase) e salva na pasta de uploads com nome seguro.
   Responde com a URL pública do arquivo.
   ========================================================= */

require __DIR__ . '/firebase-auth.php';
habilitarCors();

// Só admin logado com domínio corporativo passa daqui
exigirAdmin();

// Valida o arquivo recebido
if (empty($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
  erro('Nenhum arquivo enviado.');
}

$arquivo = $_FILES['arquivo'];
if ($arquivo['size'] > TAMANHO_MAX) {
  erro('Arquivo muito grande (máximo 10 MB).');
}

// Confere o tipo real do conteúdo (não confia na extensão enviada)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($arquivo['tmp_name']);
if (!isset(TIPOS_PERMITIDOS[$mime])) {
  erro('Tipo não permitido. Envie imagem (JPG, PNG, WEBP) ou PDF.');
}
$extensao = TIPOS_PERMITIDOS[$mime];

// Garante a pasta e gera um nome seguro (aleatório, ignora o nome enviado)
if (!is_dir(PASTA_UPLOAD)) {
  mkdir(PASTA_UPLOAD, 0755, true);
}
$nome = bin2hex(random_bytes(8)) . '_' . time() . '.' . $extensao;
$destino = PASTA_UPLOAD . '/' . $nome;

if (!move_uploaded_file($arquivo['tmp_name'], $destino)) {
  erro('Não foi possível salvar o arquivo.', 500);
}

responderJson([
  'url'  => urlBaseUploads() . '/' . $nome,
  'nome' => $nome,
  'tipo' => $mime,
]);
