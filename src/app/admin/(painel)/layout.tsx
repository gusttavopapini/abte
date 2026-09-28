
import { exigirSessaoDoPainel } from "@/lib/auth/sessao";
import { LayoutPainel } from "../_componentes/LayoutPainel/LayoutPainel";
import { EstruturaPainel } from "../_componentes/EstruturaPainel/EstruturaPainel";
import { BotaoSair } from "../_componentes/BotaoSair/BotaoSair";

export default async function LayoutAdminProtegido({ children }: { children: React.ReactNode }) {
  const resultado = await exigirSessaoDoPainel();

  if (resultado.situacao === "sem-papel") {
    return (
      <EstruturaPainel titulo="Acesso não autorizado">
        <p>Esta conta não tem permissão para usar o painel da ABTE.</p>
        <BotaoSair />
      </EstruturaPainel>
    );
  }

  // Se não estiver logado, o exigirSessaoDoPainel já redirecionou para /admin/entrar (verificado pelo middleware/função).
  // Porém a tipagem diz que pode ser sucesso.
  if (resultado.situacao === "autorizado") {
    return (
      <LayoutPainel usuario={resultado.usuario}>
        {children}
      </LayoutPainel>
    );
  }

  // Fallback (caso não caia no sucesso nem no sem-papel mas esteja redirecionando)
  return null;
}
