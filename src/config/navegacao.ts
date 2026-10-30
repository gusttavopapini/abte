// Navegação do site, centralizada aqui para facilitar mudanças.
// Itens e ordem do menu: PROPOSTA da arquitetura, ainda não validada pela ABTE.

import { TAGS_DE_PROFISSIONAIS } from "./profissionais";

export type LinkDeNavegacao = {
  rotulo: string;
  href: string;
};

export type ItemDoMenu = {
  rotulo: string;
  // Sem href: o item só abre o submenu (ex.: "Conteúdo").
  href?: string;
  submenu?: LinkDeNavegacao[];
};

export const MENU_PRINCIPAL: ItemDoMenu[] = [
  {
    rotulo: "Profissionais",
    href: "/profissionais",
    submenu: TAGS_DE_PROFISSIONAIS.map((tag) => ({ rotulo: tag, href: `/profissionais?tag=${tag}` })),
  },
  { rotulo: "Blog", href: "/blog" },
  { rotulo: "Artigos", href: "/artigos" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Contato", href: "/contato" },
];

// Um link fica ativo na própria página e nas páginas abaixo dela.
// Atenção: o pathname não inclui "?tag=...", então os links do submenu de
// Profissionais nunca ficam ativos (comportamento atual, pendência no CLAUDE.md).
export function linkEstaAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Item com link segue o próprio link; item só com submenu fica ativo quando
// algum subitem está.
export function itemEstaAtivo(pathname: string, item: ItemDoMenu): boolean {
  if (item.href) return linkEstaAtivo(pathname, item.href);
  return item.submenu?.some((sub) => linkEstaAtivo(pathname, sub.href)) ?? false;
}

// Botão de destaque no fim do menu.
export const CHAMADA_DOACAO: LinkDeNavegacao = { rotulo: "Doe para a ABTE", href: "/doe" };

// Rodapé
export const RODAPE_MENU: LinkDeNavegacao[] = [
  { rotulo: "Profissionais", href: "/profissionais" },
  { rotulo: "Blog", href: "/blog" },
  { rotulo: "Artigos", href: "/artigos" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Contato", href: "/contato" },
];

export const RODAPE_LEGAL: LinkDeNavegacao[] = [
  { rotulo: "Declaração de acessibilidade", href: "/acessibilidade" },
  { rotulo: "Política de privacidade", href: "/politica-de-privacidade" },
  { rotulo: "Termos de uso", href: "/termos-de-uso" },
];

// Dados de contato da ABTE (conferidos letra por letra: o site antigo tinha
// o e-mail com erro de digitação na página Contato).
export const EMAIL_CONTATO = "tratandoescoliose@gmail.com";

// Só o Instagram desde 30/10/2026 (o Facebook da ABTE saiu do site a pedido
// do responsável).
export const REDES_SOCIAIS = {
  instagram: "https://www.instagram.com/abte.escoliose",
} as const;
