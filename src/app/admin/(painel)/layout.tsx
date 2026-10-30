import { exigirSessaoDoPainel } from "@/lib/auth/sessao";
import { LayoutPainel } from "../_componentes/LayoutPainel/LayoutPainel";
import { EstruturaPainel } from "../_componentes/EstruturaPainel/EstruturaPainel";
import { BotaoSair } from "../_componentes/BotaoSair/BotaoSair";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { lerConfiguracaoDoSiteAgora } from "@/lib/dados/site";

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
  // Configurações do site (30/10/2026): só o administrador recebe os dados e
  // vê o botão; falha na leitura deixa o botão de fora.
  const configuracoes = papelPodeExecutar(resultado.usuario.papel, "configuracoes.editar") ? await lerConfiguracaoDoSiteAgora().catch(() => null) : null;
  return (
    <LayoutPainel usuario={resultado.usuario} sair={<BotaoSair />} configuracoes={configuracoes}>
      {children}
    </LayoutPainel>
  );
}
