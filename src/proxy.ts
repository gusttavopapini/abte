// Proxy (antigo "middleware" do Next.js): checagem rápida antes de abrir o /admin.
// Sem cookie de sessão, qualquer rota do painel (exceto o login) vai para
// /admin/entrar. A validação de verdade (assinatura, revogação e papel) é
// feita no servidor, em cada página, por exigirSessaoDoPainel().
import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE_SESSAO, ROTA_LOGIN } from "@/lib/auth/constantes";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ehLogin = pathname === ROTA_LOGIN || pathname.startsWith(`${ROTA_LOGIN}/`);

  if (!ehLogin && !request.cookies.has(NOME_COOKIE_SESSAO)) {
    return NextResponse.redirect(new URL(ROTA_LOGIN, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
