// Configurações do site (30/10/2026): documento único configuracoes/site,
// editado em /admin/configuracoes (só administrador). Puro (sem Firebase):
// usado pelo layout público, pelas páginas, pela gravação e pelos testes.
// Sem o documento, com um campo ausente ou se a leitura falhar, vale o
// padrão, que é o comportamento de antes (Artigos no site).
import type { ItemDoMenu, LinkDeNavegacao } from "../../config/navegacao.ts";

export const COLECAO_DE_CONFIGURACOES = "configuracoes";
export const DOCUMENTO_DO_SITE = "site";
// Etiqueta do cache da leitura (lib/dados/site.ts), revalidada ao salvar.
export const ETIQUETA_DO_SITE = "configuracoes-site";

export type ConfiguracaoDoSite = {
  // Artigos no site (menu, rodapé, /artigos e links para lá). Ausente: true.
  artigosAtivo: boolean;
};

export const CONFIGURACAO_PADRAO_DO_SITE: ConfiguracaoDoSite = { artigosAtivo: true };

// Leitura tolerante: o que não tiver a forma esperada vale o padrão.
export function lerConfiguracaoDoSite(dados: unknown): ConfiguracaoDoSite {
  const campos = dados && typeof dados === "object" ? (dados as Record<string, unknown>) : {};
  return { artigosAtivo: campos.artigosAtivo !== false };
}

// O caminho leva aos Artigos públicos? (/artigos, /artigos/..., com ou sem
// busca ou âncora; o painel /admin/artigos não conta)
export function ehCaminhoDosArtigos(href: string): boolean {
  return /^\/artigos(?:[/?#]|$)/.test(href);
}

// Um link interno pode aparecer no site com esta configuração?
export function linkDisponivel(href: string, configuracao: ConfiguracaoDoSite): boolean {
  return configuracao.artigosAtivo || !ehCaminhoDosArtigos(href);
}

// Menu principal e listas do rodapé sem os itens que a configuração esconde.
export function itensDoMenu(itens: ItemDoMenu[], configuracao: ConfiguracaoDoSite): ItemDoMenu[] {
  return itens.filter((item) => !item.href || linkDisponivel(item.href, configuracao));
}

export function linksDisponiveis(links: LinkDeNavegacao[], configuracao: ConfiguracaoDoSite): LinkDeNavegacao[] {
  return links.filter((link) => linkDisponivel(link.href, configuracao));
}

// Formulário da caixa "Menu e rodapé": "sim" ou "nao"; outro valor recusa.
export function lerArtigosAtivoDoFormulario(valor: unknown): { ok: true; artigosAtivo: boolean } | { ok: false; mensagem: string } {
  if (valor === "sim") return { ok: true, artigosAtivo: true };
  if (valor === "nao") return { ok: true, artigosAtivo: false };
  return { ok: false, mensagem: "Não foi possível ler a escolha. Recarregue a página e tente de novo." };
}
