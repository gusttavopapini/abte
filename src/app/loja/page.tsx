import Link from "next/link";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { CardProduto } from "@/components/CardProduto/CardProduto";
import { revelar } from "@/components/Revelar/revelar";
import { listarProdutosVisiveis, listarTopicosAtivos } from "@/lib/dados/colecoes";
import estilos from "./page.module.css";

export const metadata = { title: "Loja" };
export const dynamic = "force-dynamic";

export default async function PaginaLoja({ searchParams }: { searchParams: Promise<{ categoria?: string; conta?: string }> }) {
  const [produtos, categorias] = await Promise.all([listarProdutosVisiveis(), listarTopicosAtivos("categoriaDeProduto")]);
  // Só categorias com produto na loja viram filtro. Slug desconhecido: mostra tudo.
  const comProduto = categorias.filter((categoria) => produtos.some((produto) => produto.categoria === categoria.id));
  const { categoria: slugDoFiltro, conta } = await searchParams;
  const filtro = comProduto.find((categoria) => categoria.slug === slugDoFiltro) ?? null;
  const exibidos = filtro ? produtos.filter((produto) => produto.categoria === filtro.id) : produtos;

  return (
    <div className={`container ${estilos.secao}`}>
      {conta === "excluida" && (
        <Mensagem tipo="sucesso" className={estilos.aviso}>Sua conta foi excluída, com seu nome, seu e-mail e seu carrinho.</Mensagem>
      )}
      <h1 className={`tipo-h1 ${estilos.titulo}`}>Loja da ABTE</h1>
      <p className={`tipo-texto-xl ${estilos.descricao}`}>Conheça nossos produtos. Cada compra apoia pacientes com escoliose.</p>

      {comProduto.length > 0 && (
        <nav aria-label="Categorias de produto" className={estilos.filtros}>
          <ul role="list" className={estilos.listaDeFiltros}>
            <li>
              <Link href="/loja" className={estilos.filtro} aria-current={filtro ? undefined : "page"}>Todos</Link>
            </li>
            {comProduto.map((categoria) => (
              <li key={categoria.id}>
                <Link href={`/loja?categoria=${categoria.slug}`} className={estilos.filtro} aria-current={filtro?.id === categoria.id ? "page" : undefined}>
                  {categoria.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {exibidos.length === 0 ? (
        <p className={`tipo-texto ${estilos.vazio}`}>Nenhum produto disponível ainda.</p>
      ) : (
        <ul role="list" {...revelar(estilos.grade)}>
          {exibidos.map((produto) => (
            <li key={produto.id}>
              <CardProduto
                produto={{ nome: produto.nome, slug: produto.slug, preco: produto.preco, precoPromocional: produto.precoPromocional, selo: produto.selo, esgotado: produto.status === "esgotado" }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
