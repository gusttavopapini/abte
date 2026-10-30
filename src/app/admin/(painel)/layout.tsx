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

  // Sem sessão, exigirSessaoDoPainel já redirecionou para /admin/entrar.
  return (
    <LayoutPainel usuario={resultado.usuario} sair={<BotaoSair />}>
      {children}
    </LayoutPainel>
  );
}
