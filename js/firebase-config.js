/* =========================================================
   firebase-config.js
   Inicializa o Firebase (CDN v10, módulos ES) e exporta os
   serviços usados no projeto: Auth e Firestore.
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUXFDqPZaurztxa4mLpYXu1YusXIymU84",
  authDomain: "intranet-ibn.firebaseapp.com",
  projectId: "intranet-ibn",
  storageBucket: "intranet-ibn.firebasestorage.app",
  messagingSenderId: "426578636138",
  appId: "1:426578636138:web:e9f04705b170e5a1f20913",
};

const app = initializeApp(firebaseConfig);

/* App Check (reCAPTCHA v3) — garante que as requisições vêm do seu app real.
   Em localhost, liga o token de debug: abra a página uma vez, copie o token
   que aparece no console (F12) e registre em
   Firebase > App Check > Apps > (seu app) > Gerenciar tokens de depuração. */
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("6LcEzFEtAAAAAHZUy_I-8wxpDj3lHXkg1gcCaWZo"),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

