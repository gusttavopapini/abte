import type { Metadata } from "next";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerConfiguracaoDoSiteAgora } from "@/lib/dados/site";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export const metadata: Metadata = { title: "Configurações" };

const TRILHA = [{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Configurações" }];
const DESCRICAO = "Configurações do site inteiro, em caixas por assunto. Só o administrador altera.";

// Configurações do site (30/10/2026): configuracoes/site, só administrador
// ("configuracoes.editar"). O editor vê a explicação, sem os dados.
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
  return <ConfiguracoesClient trilha={TRILHA} descricao={DESCRICAO} artigosAtivo={configuracao.artigosAtivo} />;
}
