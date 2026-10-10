// Verificação de cookie de sessão do Firebase, sem depender do Next.js: usada
// pela sessão do painel, pela sessão de cliente da loja e pelos testes no
// emulador (testes/sessao). Recebe a instância do Admin Auth.
import type { Auth } from "firebase-admin/auth";

export type SessaoVerificada = {
  uid: string;
  email: string;
  nome: string;
  // Custom claim "papel", como veio no token (pode não existir).
  papel: unknown;
};

// Confere assinatura, validade e revogação (ex.: depois de "Sair" ou de uma
// troca de senha). Sem cookie ou com qualquer falha, devolve null.
export async function verificarCookieDeSessao(auth: Auth, cookie: string | undefined): Promise<SessaoVerificada | null> {
  if (!cookie) return null;
  try {
    const token = await auth.verifySessionCookie(cookie, true);
    return { uid: token.uid, email: token.email ?? "", nome: typeof token.name === "string" ? token.name : "", papel: token.papel };
  } catch {
    return null;
  }
}
