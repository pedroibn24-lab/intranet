<?php
/* =========================================================
   delete.php
   Exclui um arquivo da pasta de uploads. Exige admin logado
   (token do Firebase). Usa basename() para evitar que o
   nome enviado escape da pasta (path traversal).
   ========================================================= */

require __DIR__ . '/firebase-auth.php';
habilitarCors();

// Só admin logado com domínio corporativo passa daqui
exigirAdmin();

$nome = basename($_POST['nome'] ?? '');
if ($nome === '') {
  erro('Nome do arquivo ausente.');
}

$caminho = PASTA_UPLOAD . '/' . $nome;
if (is_file($caminho)) {
  unlink($caminho);
}

responderJson(['ok' => true]);
