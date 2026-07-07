/* =========================================================
   firebase-config.js
   Inicializa o Firebase (CDN v10, módulos ES) e exporta os
   serviços usados no projeto: Auth e Firestore.

   >>> COLE AQUI as chaves do SEU projeto (Console do Firebase >
       Configurações do projeto > Seus apps > SDK do Firebase).
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUXFDqPZaurztxa4mLpYXu1YusXIymU84",
  authDomain: "intranet-ibn.firebaseapp.com",
  projectId: "intranet-ibn",
  storageBucket: "intranet-ibn.firebasestorage.app",
  messagingSenderId: "426578636138",
  appId: "1:426578636138:web:e9f04705b170e5a1f20913",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

