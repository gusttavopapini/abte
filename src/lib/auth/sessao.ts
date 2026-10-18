// Sessão do painel, validada no servidor em toda rota do /admin.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authAdmin } from "@/lib/firebase/admin-auth";
import { NOME_COOKIE_SESSAO, ROTA_LOGIN } from "./constantes";
import { decidirAcessoAoPainel, ehPapelDoPainel, type AcaoDoPainel, type PapelDoPainel } from "./papeis";
import { verificarCookieDeSessao } from "./verificacao";

type UsuarioDaSessao = {
  uid: string;
  email: string;
  nome: string;
  papel: PapelDoPainel | null;
};

export type UsuarioDoPainel = UsuarioDaSessao & { papel: PapelDoPainel };

// Lê e valida o cookie de sessão. Confere também se a sessão foi revogada
// (ex.: depois de "Sair" ou de uma troca de senha). Retorna null se não houver
// sessão válida. O cache evita repetir a consulta ao Firebase quando o layout
// e a página do painel leem a sessão na mesma requisição.
export const lerSessao = cache(async (): Promise<UsuarioDaSessao | null> => {
  const cookie = (await cookies()).get(NOME_COOKIE_SESSAO)?.value;
  const sessao = await verificarCookieDeSessao(authAdmin(), cookie);
  if (!sessao) return null;

  try {
    let nome = sessao.nome;
    if (!nome) {
      // O nome de exibição não vem no token se foi definido depois do login.
      const usuario = await authAdmin().getUser(sessao.uid);
      nome = usuario.displayName ?? "";
    }
    return { uid: sessao.uid, email: sessao.email, nome, papel: ehPapelDoPainel(sessao.papel) ? sessao.papel : null };
  } catch {
    return null;
  }
});

type ResultadoPainel =
  | { situacao: "autorizado"; usuario: UsuarioDoPainel }
  | { situacao: "sem-papel"; usuario: UsuarioDaSessao };

// Usada pelo layout do painel, que precisa saber o motivo da recusa.
// Sem sessão: redireciona para o login. Sem papel: devolve "sem-papel", e o
// layout mostra "Acesso não autorizado" sem nenhum dado do painel.
export async function exigirSessaoDoPainel(): Promise<ResultadoPainel> {
  const usuario = await lerSessao();
  if (!usuario) redirect(ROTA_LOGIN);
  const decisao = decidirAcessoAoPainel(usuario);
  if (!decisao.permitido) return { situacao: "sem-papel", usuario };
  return { situacao: "autorizado", usuario: { ...usuario, papel: decisao.papel } };
}

// Use no início de toda ação de servidor e de toda página do painel que lê
// dados. Falha fechada: sem sessão, redireciona para o login; sem papel,
// interrompe com erro antes de qualquer leitura ou gravação. Nas páginas, esse
// erro não aparece na tela: o layout já mostra "Acesso não autorizado".
// Com uma ação, confere também a permissão do papel (tabela em papeis.ts); a
// tela não oferece a quem não pode, então a recusa só aparece num pedido forjado.
export async function exigirPapelDoPainel(acao?: AcaoDoPainel): Promise<UsuarioDoPainel> {
  const usuario = await lerSessao();
  if (!usuario) redirect(ROTA_LOGIN);
  const decisao = decidirAcessoAoPainel(usuario, acao);
  if (!decisao.permitido) {
    throw new Error(decisao.motivo === "sem-permissao" ? "Seu papel não permite esta ação." : "Acesso não autorizado ao painel.");
  }
  return { ...usuario, papel: decisao.papel };
}
