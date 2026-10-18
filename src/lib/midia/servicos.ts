// Liga a biblioteca de mídia ao Firebase do site. SOMENTE no servidor.
import "server-only";

import { getStorage } from "firebase-admin/storage";
import { firestoreAdmin, obterApp } from "@/lib/firebase/servidor";
import type { ServicosDeMidia } from "./biblioteca";
import { urlPublica } from "./regras";

// Nome do bucket da configuração do projeto (o mesmo do .env.example). Ele
// não é segredo: também monta o endereço público das imagens.
export function nomeDoBucket(): string {
  const nome = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!nome) throw new Error("Bucket do Storage ausente. Preencha NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no .env.local.");
  return nome;
}

export function servicosDeMidia(): ServicosDeMidia {
  return { db: firestoreAdmin(), bucket: getStorage(obterApp()).bucket(nomeDoBucket()) };
}

// Endereço público de um arquivo em publico/. Nos testes com o emulador do
// Storage (FIREBASE_STORAGE_EMULATOR_HOST definida), aponta para o emulador;
// em produção a variável fica vazia e o endereço é o do Firebase Storage.
export function urlPublicaDoArquivo(caminho: string): string {
  const emulador = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  return emulador ? urlPublica(nomeDoBucket(), caminho, `http://${emulador}`) : urlPublica(nomeDoBucket(), caminho);
}
