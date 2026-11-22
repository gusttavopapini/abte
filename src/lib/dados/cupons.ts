// Leitura dos cupons e do cookie do cupom aplicado (21/11/2026). SOMENTE no servidor.
import "server-only";

import { cookies } from "next/headers";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { CAMINHO_COOKIE_CUPOM, codigoValido, COLECAO_CUPONS, lerCupom, normalizarCodigo, NOME_COOKIE_CUPOM, VALIDADE_COOKIE_CUPOM_S, type Cupom } from "@/lib/loja/cupons";

// Cupom ativo pelo código, ou null (inexistente, inativo ou inválido).
export async function lerCupomAtivo(codigo: string): Promise<Cupom | null> {
  const normalizado = normalizarCodigo(codigo);
  if (!codigoValido(normalizado)) return null;
  const documento = await firestoreAdmin().collection(COLECAO_CUPONS).doc(normalizado).get();
  const cupom = lerCupom(normalizado, documento.data());
  return cupom && cupom.ativo ? cupom : null;
}

// Todos os cupons (painel), pelo código.
export async function listarCupons(): Promise<Cupom[]> {
  const consulta = await firestoreAdmin().collection(COLECAO_CUPONS).get();
  return consulta.docs
    .map((documento) => lerCupom(documento.id, documento.data()))
    .filter((cupom): cupom is Cupom => cupom !== null)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
}

// Código guardado no cookie (só o texto; a validade é conferida à parte).
export async function lerCodigoDoCupom(): Promise<string | null> {
  const codigo = normalizarCodigo((await cookies()).get(NOME_COOKIE_CUPOM)?.value);
  return codigoValido(codigo) ? codigo : null;
}

// Só em ação de servidor (páginas não gravam cookies).
export async function gravarCodigoDoCupom(codigo: string | null): Promise<void> {
  const loja = await cookies();
  if (!codigo) {
    loja.delete({ name: NOME_COOKIE_CUPOM, path: CAMINHO_COOKIE_CUPOM });
    return;
  }
  loja.set(NOME_COOKIE_CUPOM, codigo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: CAMINHO_COOKIE_CUPOM,
    maxAge: VALIDADE_COOKIE_CUPOM_S,
  });
}
