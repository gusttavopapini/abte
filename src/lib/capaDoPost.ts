// Qual capa um post mostra no site (função pura, testada em test:unidade).
// 1. Com capaMidiaId: a imagem da biblioteca; se ela estiver na lixeira ou
//    tiver sido excluída, nada da biblioteca (a capa antiga não volta).
// 2. Sem capaMidiaId: a capa antiga (endereço digitado antes da biblioteca).
// 3. Sem imagem nenhuma: na lista do blog, o placeholder interno; na página
//    do post, nenhum bloco de imagem.
export type CapaParaExibir<Imagem> =
  | { tipo: "biblioteca"; imagem: Imagem }
  | { tipo: "antiga"; endereco: string }
  | { tipo: "placeholder" }
  | { tipo: "nenhuma" };

export function capaParaExibir<Imagem>(
  post: { capaMidiaId: string | null; imagem: string },
  // Imagem da biblioteca já resolvida (null ou undefined: não existe ou está na lixeira).
  imagemDaBiblioteca: Imagem | null | undefined,
  lugar: "lista" | "pagina",
): CapaParaExibir<Imagem> {
  if (post.capaMidiaId && imagemDaBiblioteca) return { tipo: "biblioteca", imagem: imagemDaBiblioteca };
  if (!post.capaMidiaId && post.imagem) return { tipo: "antiga", endereco: post.imagem };
  return lugar === "lista" ? { tipo: "placeholder" } : { tipo: "nenhuma" };
}
