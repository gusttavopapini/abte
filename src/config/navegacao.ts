// Navegação do site, centralizada aqui para facilitar mudanças.
// Itens e ordem do menu: PROPOSTA da arquitetura, ainda não validada pela ABTE.

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
  { rotulo: "Sobre", href: "/sobre" },
  {
    rotulo: "Encontre um profissional",
    href: "/profissionais",
    submenu: [
      { rotulo: "Fisioterapeutas", href: "/profissionais/fisioterapeutas" },
      { rotulo: "Médicos", href: "/profissionais/medicos" },
      { rotulo: "Ortesistas", href: "/profissionais/ortesistas" },
      { rotulo: "Psicólogos", href: "/profissionais/psicologos" },
      { rotulo: "Outros", href: "/profissionais/outros" },
    ],
  },
  {
    rotulo: "Conteúdo",
    submenu: [
      { rotulo: "Blog", href: "/blog" },
      { rotulo: "Artigos científicos", href: "/artigos" },
    ],
  },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Seja associado", href: "/seja-associado" },
  { rotulo: "Contato", href: "/contato" },
];

// Botão de destaque no fim do menu.
export const CHAMADA_DOACAO: LinkDeNavegacao = { rotulo: "Doe para a ABTE", href: "/doe" };

// Rodapé
export const RODAPE_MENU: LinkDeNavegacao[] = [
  { rotulo: "Sobre", href: "/sobre" },
  { rotulo: "Encontre um profissional", href: "/profissionais" },
  { rotulo: "Blog", href: "/blog" },
  { rotulo: "Artigos científicos", href: "/artigos" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Seja associado", href: "/seja-associado" },
  { rotulo: "Doe", href: "/doe" },
];

export const RODAPE_LEGAL: LinkDeNavegacao[] = [
  { rotulo: "Declaração de acessibilidade", href: "/acessibilidade" },
  { rotulo: "Política de privacidade", href: "/politica-de-privacidade" },
  { rotulo: "Termos de uso", href: "/termos-de-uso" },
];

// Dados de contato da ABTE (conferidos letra por letra: o site antigo tinha
// o e-mail com erro de digitação na página Contato).
export const EMAIL_CONTATO = "tratandoescoliose@gmail.com";

export const REDES_SOCIAIS = {
  instagram: "https://www.instagram.com/abte.escoliose",
  facebook: "https://www.facebook.com/tratando.escoliose",
} as const;
