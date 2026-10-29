// Opções do menu flutuante da loja (29/10/2026), no lugar do antigo
// subcabeçalho: Produtos, Carrinho (com a contagem) e Entrar ou, com o
// cliente logado, Minha conta. Pura, para o componente e os testes.
export type OpcaoDoMenuDaLoja = {
  chave: "produtos" | "carrinho" | "entrar" | "conta";
  rotulo: string;
  href: string;
  // Página atual (aria-current="page").
  atual: boolean;
};

// O caminho é o próprio ou uma rota filha dele.
const dentroDe = (caminho: string, base: string) => caminho === base || caminho.startsWith(`${base}/`);

export function opcoesDoMenuDaLoja(caminho: string, { logado, unidades }: { logado: boolean; unidades: number }): OpcaoDoMenuDaLoja[] {
  return [
    { chave: "produtos", rotulo: "Produtos", href: "/loja", atual: caminho === "/loja" || dentroDe(caminho, "/loja/produto") },
    { chave: "carrinho", rotulo: unidades > 0 ? `Carrinho (${unidades})` : "Carrinho", href: "/loja/carrinho", atual: dentroDe(caminho, "/loja/carrinho") },
    logado
      ? { chave: "conta", rotulo: "Minha conta", href: "/loja/conta", atual: dentroDe(caminho, "/loja/conta") }
      : { chave: "entrar", rotulo: "Entrar", href: "/loja/entrar", atual: dentroDe(caminho, "/loja/entrar") || dentroDe(caminho, "/loja/cadastro") },
  ];
}
