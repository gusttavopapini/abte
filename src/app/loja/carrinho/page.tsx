import type { Metadata } from "next";
import Link from "next/link";
import { Botao } from "@/components/Botao/Botao";
import { exigirSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerItensDoCarrinho, lerProdutosDoCarrinho } from "@/lib/dados/carrinho";
import { montarResumoDoCarrinho, quantidadeMaxima } from "@/lib/loja/carrinho";
import { formatarPreco } from "@/lib/produtos";
import { ItensDoCarrinho } from "../_componentes/ItensDoCarrinho/ItensDoCarrinho";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false, follow: false } };

// Carrinho do cliente (exige conta). Preços e situação lidos agora do
// Firestore. A finalização da compra ainda não existe (decisão: "em breve").
export default async function PaginaCarrinho() {
  const cliente = await exigirSessaoCliente("/loja/carrinho");
  const itens = await lerItensDoCarrinho(cliente.uid);
  const produtos = await lerProdutosDoCarrinho(itens.map((item) => item.produtoId));
  const resumo = montarResumoDoCarrinho(itens, produtos);
  const linhas = resumo.linhas.map((linha) => ({ ...linha, maximo: quantidadeMaxima(produtos.get(linha.produtoId)?.tipo ?? "fisico") }));

  return (
    <div className={`container pagina-interna ${estilos.secao}`}>
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Carrinho</h1>

      {linhas.length === 0 ? (
        <p className="tipo-texto">
          Seu carrinho está vazio. <Link href="/loja">Ver produtos</Link>
        </p>
      ) : (
        <div className={estilos.conteudo}>
          <ItensDoCarrinho linhas={linhas} />
          <section aria-labelledby="titulo-resumo" className={estilos.resumo}>
            <h2 id="titulo-resumo" className="tipo-texto-lg">Resumo</h2>
            <p>Total ({resumo.unidades} {resumo.unidades === 1 ? "unidade" : "unidades"}): <strong>{formatarPreco(resumo.total)}</strong></p>
            {resumo.temProblema && <p>Itens esgotados ou fora da loja não entram no total.</p>}
            <Botao type="button" aria-disabled="true" aria-describedby="finalizar-em-breve">Finalizar compra: em breve</Botao>
            <p id="finalizar-em-breve">A compra online ainda não está disponível. Seu carrinho fica guardado na sua conta.</p>
          </section>
        </div>
      )}
    </div>
  );
}
