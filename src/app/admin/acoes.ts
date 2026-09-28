"use server";

// Ações de servidor do login do painel.
// O Next.js só aceita essas chamadas vindas do próprio site (compara Origin e
// Host), o que protege contra requisições forjadas de outros sites.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authAdmin } from "@/lib/firebase/admin-auth";
import { NOME_COOKIE_SESSAO, ROTA_LOGIN, VALIDADE_SESSAO_MS } from "@/lib/auth/constantes";
import { ehPapelDoPainel } from "@/lib/auth/papeis";

const CAMINHO_COOKIE = "/admin";

export type ResultadoLogin = { ok: true } | { ok: false; motivo: "nao-autorizado" | "erro" };

// Troca o token do login (gerado no navegador) por um cookie de sessão
// httpOnly. Só cria a sessão para quem tem papel no painel.
export async function criarSessao(idToken: string): Promise<ResultadoLogin> {
  if (typeof idToken !== "string" || idToken.length === 0) return { ok: false, motivo: "erro" };

  try {
    const auth = authAdmin();
    const token = await auth.verifyIdToken(idToken, true);

    // Só aceita um login feito agora (nos últimos 5 minutos).
    const segundosDesdeLogin = Date.now() / 1000 - token.auth_time;
    if (segundosDesdeLogin > 5 * 60) return { ok: false, motivo: "erro" };

    if (!ehPapelDoPainel(token.papel)) return { ok: false, motivo: "nao-autorizado" };

    const cookieSessao = await auth.createSessionCookie(idToken, { expiresIn: VALIDADE_SESSAO_MS });
    (await cookies()).set(NOME_COOKIE_SESSAO, cookieSessao, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: CAMINHO_COOKIE,
      maxAge: VALIDADE_SESSAO_MS / 1000,
    });
    return { ok: true };
  } catch {
    // Nunca repassa a mensagem técnica do Firebase para a tela.
    return { ok: false, motivo: "erro" };
  }
}

// "Sair": revoga a sessão no Firebase e apaga o cookie.
export async function encerrarSessao(): Promise<void> {
  const loja = await cookies();
  const cookieSessao = loja.get(NOME_COOKIE_SESSAO)?.value;

  if (cookieSessao) {
    try {
      const token = await authAdmin().verifySessionCookie(cookieSessao);
      // Invalida todas as sessões desse usuário; o cookie deixa de valer
      // mesmo que alguém tenha guardado uma cópia.
      await authAdmin().revokeRefreshTokens(token.sub);
    } catch {
      // Sessão já inválida: basta apagar o cookie.
    }
  }

  loja.delete({ name: NOME_COOKIE_SESSAO, path: CAMINHO_COOKIE });
  redirect(ROTA_LOGIN);
}
