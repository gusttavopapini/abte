// Sessão do painel, validada no servidor em toda rota do /admin.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authAdmin } from "@/lib/firebase/servidor";
import { NOME_COOKIE_SESSAO, ROTA_LOGIN } from "./constantes";
import { ehPapelDoPainel, type PapelDoPainel } from "./papeis";

export type UsuarioDaSessao = {
  uid: string;
  email: string;
  nome: string;
  papel: PapelDoPainel | null;
};

// Lê e valida o cookie de sessão. Confere também se a sessão foi revogada
// (ex.: depois de "Sair" ou de uma troca de senha). Retorna null se não houver
// sessão válida.
export async function lerSessao(): Promise<UsuarioDaSessao | null> {
  const cookie = (await cookies()).get(NOME_COOKIE_SESSAO)?.value;
  if (!cookie) return null;

  try {
    const token = await authAdmin().verifySessionCookie(cookie, true);
    const papel = ehPapelDoPainel(token.papel) ? token.papel : null;
    let nome = typeof token.name === "string" ? token.name : "";
    if (!nome) {
      // O nome de exibição não vem no token se foi definido depois do login.
      const usuario = await authAdmin().getUser(token.uid);
      nome = usuario.displayName ?? "";
    }
    return { uid: token.uid, email: token.email ?? "", nome, papel };
  } catch {
    return null;
  }
}

export type ResultadoPainel =
  | { situacao: "autorizado"; usuario: UsuarioDaSessao & { papel: PapelDoPainel } }
  | { situacao: "sem-papel"; usuario: UsuarioDaSessao };

// Use no início de toda página e ação do painel.
// Sem sessão: redireciona para o login. Sem papel: devolve "sem-papel", e a
// página deve mostrar "Acesso não autorizado" sem nenhum dado do painel.
export async function exigirSessaoDoPainel(): Promise<ResultadoPainel> {
  const usuario = await lerSessao();
  if (!usuario) redirect(ROTA_LOGIN);
  if (!usuario.papel) return { situacao: "sem-papel", usuario };
  return { situacao: "autorizado", usuario: { ...usuario, papel: usuario.papel } };
}
