<?php
/* =========================================================
   firebase-auth.php
   Config + verificação do token do Firebase (JWT RS256).
   Incluído por upload.php e delete.php.

   A segurança NÃO depende de esconder este arquivo: mesmo
   público, ninguém consegue forjar um token válido do Google.
   ========================================================= */

const PROJECT_ID = 'intranet-ibn';
const DOMINIO_PERMITIDO = 'ibnegocios.com.br';

/* Pasta física onde os arquivos são salvos.
   __DIR__ = pasta onde este arquivo está (raiz do site, normalmente). */
const PASTA_UPLOAD = __DIR__ . '/documentos-rh';

/* Tipos aceitos (mime => extensão). Só imagem e PDF. */
const TIPOS_PERMITIDOS = [
  'image/jpeg'      => 'jpg',
  'image/png'       => 'png',
  'image/webp'      => 'webp',
  'application/pdf' => 'pdf',
];

const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB

/* URL pública da pasta de uploads (detectada pelo host da requisição) */
function urlBaseUploads() {
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  return $scheme . '://' . $_SERVER['HTTP_HOST'] . '/documentos-rh';
}

function responderJson($dados, $codigo = 200) {
  http_response_code($codigo);
  header('Content-Type: application/json');
  echo json_encode($dados);
  exit;
}

function erro($mensagem, $codigo = 400) {
  responderJson(['erro' => $mensagem], $codigo);
}

/* Libera chamadas de outro domínio (ex.: Live Server local durante testes) */
function habilitarCors() {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit;
  }
}

function base64urlDecode($dados) {
  return base64_decode(strtr($dados, '-_', '+/') . str_repeat('=', (4 - strlen($dados) % 4) % 4));
}

/* Verifica o token do Firebase. Retorna os dados (claims) ou false. */
function verificarTokenFirebase($jwt) {
  $partes = explode('.', $jwt);
  if (count($partes) !== 3) return false;
  [$cabecalho64, $corpo64, $assinatura64] = $partes;

  $cabecalho = json_decode(base64urlDecode($cabecalho64), true);
  $corpo = json_decode(base64urlDecode($corpo64), true);
  $assinatura = base64urlDecode($assinatura64);
  if (!$cabecalho || !$corpo) return false;
  if (($cabecalho['alg'] ?? '') !== 'RS256') return false;

  // Chaves públicas do Google (para conferir a assinatura)
  $certsJson = @file_get_contents(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!$certsJson) return false;
  $certs = json_decode($certsJson, true);
  $kid = $cabecalho['kid'] ?? '';
  if (!isset($certs[$kid])) return false;

  $chavePublica = openssl_pkey_get_public($certs[$kid]);
  if (!$chavePublica) return false;

  $valido = openssl_verify("$cabecalho64.$corpo64", $assinatura, $chavePublica, OPENSSL_ALGO_SHA256);
  if ($valido !== 1) return false;

  // Confere as informações (claims) do token
  $agora = time();
  if (($corpo['exp'] ?? 0) < $agora) return false;                 // expirado
  if (($corpo['iat'] ?? 0) > $agora + 300) return false;           // emitido no futuro
  if (($corpo['aud'] ?? '') !== PROJECT_ID) return false;          // outro projeto
  if (($corpo['iss'] ?? '') !== 'https://securetoken.google.com/' . PROJECT_ID) return false;
  if (empty($corpo['sub'])) return false;

  return $corpo;
}

/* Exige um admin válido (token + domínio corporativo).
   Encerra a requisição com erro se não passar. */
function exigirAdmin() {
  $token = $_POST['token'] ?? '';
  if (!$token) erro('Token ausente. Faça login.', 401);

  $claims = verificarTokenFirebase($token);
  if (!$claims) erro('Token inválido ou expirado.', 401);

  $email = strtolower($claims['email'] ?? '');
  if (!str_ends_with($email, '@' . DOMINIO_PERMITIDO)) {
    erro('Sem permissão para esta ação.', 403);
  }
  return $claims;
}
