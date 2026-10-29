import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Botao } from "@/components/Botao/Botao";
import { CardProduto } from "@/components/CardProduto/CardProduto";
import { GaleriaDoProduto } from "@/components/GaleriaDoProduto/GaleriaDoProduto";
import { PrecoProduto } from "@/components/PrecoProduto/PrecoProduto";
import { revelar } from "@/components/Revelar/revelar";
import { lerTopicos, listarProdutosVisiveis } from "@/lib/dados/colecoes";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { quantidadeMaxima } from "@/lib/loja/carrinho";
import { AdicionarAoCarrinho } from "../../_componentes/AdicionarAoCarrinho/AdicionarAoCarrinho";
import { escolherRelacionados, imagemPrincipal } from "@/lib/produtos";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./page.module.css";

export const dynamic = "force-dynamic";

// Produto visível (publicado e fora da lixeira) pelo slug, com a lista usada
// nos relacionados. O cache evita ler duas vezes (metadata e página).
const lerProdutoDaLoja = cache(async (slug: string) => {
  const visiveis = await listarProdutosVisiveis();
  const produto = visiveis.find((item) => item.slug === slug) ?? null;
  return { produto, visiveis };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { produto } = await lerProdutoDaLoja((await params).slug);
  if (!produto) return { title: "Produto não encontrado" };
  return { title: produto.nome, description: produto.descricao.slice(0, 160) || undefined };
}

export default async function PaginaProduto({ params }: { params: Promise<{ slug: string }> }) {
  const { produto, visiveis } = await lerProdutoDaLoja((await params).slug);
  if (!produto) notFound();

  const [categoria, cliente] = await Promise.all([
    lerTopicos("categoriaDeProduto").doc(produto.categoria).get().then((documento) => documento.data()),
    lerSessaoCliente(),
  ]);
  const relacionados = escolherRelacionados(produto, visiveis);
  // Imagens da galeria (só as fora da lixeira, na ordem) e a principal (primeira disponível) de cada relacionado.
  const imagens = await imagensAtivasPorId([produto, ...relacionados].flatMap((item) => item.imagens.map((imagem) => imagem.midiaId)));
  const galeria = produto.imagens.map((imagem) => imagens.get(imagem.midiaId)).filter((imagem): imagem is ImagemNaTela => imagem !== undefined);
  const esgotado = produto.status === "esgotado";

  // Dados estruturados de produto SEM oferta de compra (sem "offers"): não há
  // venda online. Sem "offers", o Google não mostra preço nem disponibilidade.
  const dadosEstruturados = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.nome,
    ...(produto.descricao && { description: produto.descricao }),
    ...(categoria && !categoria.excluidoEm && { category: categoria.nome }),
    brand: { "@type": "Organization", name: "ABTE, Associação Brasileira de Tratamento da Escoliose" },
  };

  return (
    <div className={`container pagina-interna ${estilos.secao}`}>
      <Botao href="/loja" variante="link">&larr; Voltar para a loja</Botao>

      <article className={estilos.produto}>
        <GaleriaDoProduto imagens={galeria} />

        <div className={estilos.detalhes}>
          {produto.selo && <p className={estilos.selo}>{produto.selo}</p>}
          <h1 className={`tipo-h2 ${estilos.titulo}`}>{produto.nome}</h1>
          <PrecoProduto preco={produto.preco} precoPromocional={produto.precoPromocional} grande />
          <p className={estilos.situacao}>
            {esgotado ? "Esgotado" : "Disponível"} · {produto.tipo === "digital" ? "Produto digital" : "Produto físico"}
          </p>
          {/* Carrinho só com conta de cliente (decisão D1); a compra online ainda não existe. */}
          {esgotado ? (
            <p className={estilos.situacao}>Produto esgotado: não dá para adicionar ao carrinho.</p>
          ) : cliente ? (
            <AdicionarAoCarrinho produtoId={produto.id} maximo={quantidadeMaxima(produto.tipo)} />
          ) : (
            <p>
              <Link href={`/loja/entrar?voltar=${encodeURIComponent(`/loja/produto/${produto.slug}`)}`}>Entre na sua conta da loja</Link> para adicionar ao carrinho.
            </p>
          )}
          <div className={estilos.aviso} role="note">
            <p>Em breve: a finalização da compra online ainda não está disponível. Você pode guardar os produtos no carrinho.</p>
          </div>
          {produto.descricao && <div className={`tipo-texto ${estilos.descricao}`}>{produto.descricao}</div>}
        </div>
      </article>

      {relacionados.length > 0 && (
        <section aria-labelledby="titulo-relacionados" {...revelar(estilos.relacionados)}>
          <h2 id="titulo-relacionados" className="tipo-h3">Produtos relacionados</h2>
          <ul role="list" className="grade-de-cards">
            {relacionados.map((outro) => (
              <li key={outro.id}>
                <CardProduto
                  nivelDoTitulo={3}
                  produto={{
                    nome: outro.nome,
                    slug: outro.slug,
                    preco: outro.preco,
                    precoPromocional: outro.precoPromocional,
                    selo: outro.selo,
                    esgotado: outro.status === "esgotado",
                    imagem: imagemPrincipal(outro.imagens, imagens),
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <script
        type="application/ld+json"
        // "<" escapado para o texto do produto não poder fechar a tag <script>.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
