import type { Metadata } from "next";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { BotaoDasConfiguracoes } from "@/app/admin/_componentes/ConfiguracoesDoSite/ConfiguracoesDoSite";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerConfiguracaoDoSiteAgora } from "@/lib/dados/site";

export const metadata: Metadata = { title: "Configurações" };

const TRILHA = [{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Configurações" }];
const DESCRICAO = "As configurações do site ficam no botão \"Configurações do site\", presente em todas as telas do painel. Só o administrador altera.";

// Atalho (30/10/2026): a rota continua valendo e abre o Modal das
// configurações do site, o mesmo do botão da barra do painel.
export default async function PaginaConfiguracoes() {
  const usuario = await exigirPapelDoPainel();
  if (!papelPodeExecutar(usuario.papel, "configuracoes.editar")) {
    return (
      <>
        <CabecalhoDoPainel trilha={TRILHA} titulo="Configurações" descricao={DESCRICAO} />
        <CaixaDoPainel tipo="atencao">Só o administrador altera as configurações do site. Peça a um administrador, se precisar mudar algo aqui.</CaixaDoPainel>
      </>
    );
  }
  const configuracao = await lerConfiguracaoDoSiteAgora();
  return (
    <>
      <CabecalhoDoPainel trilha={TRILHA} titulo="Configurações" descricao={DESCRICAO} acao={<BotaoDasConfiguracoes configuracoes={configuracao} abrirAoCarregar />} />
    </>
  );
}
