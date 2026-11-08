import type { Metadata } from "next";
import Link from "next/link";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { exigirSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerItensDoCarrinho, lerProdutosDoCarrinho } from "@/lib/dados/carrinho";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { montarResumoDoCarrinho, quantidadeMaxima } from "@/lib/loja/carrinho";
import { DOCUMENTO_DA_LOJA, lerFreteFixo, TEXTO_FRETE_COMBINADO, TEXTO_MODO_DE_TESTE, TEXTO_PAGAMENTO_SEGURO } from "@/lib/loja/pagamento";
import { formatarPreco } from "@/lib/produtos";
import { liberacaoAtual } from "@/lib/stripe/servidor";
import { FinalizarCompra } from "../_componentes/FinalizarCompra/FinalizarCompra";
import { ItensDoCarrinho } from "../_componentes/ItensDoCarrinho/ItensDoCarrinho";
import { LinksDaLoja } from "../_componentes/LinksDaLoja/LinksDaLoja";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false, follow: false } };

// Carrinho do cliente (exige conta). Preços e situação lidos agora do
// Firestore. Desde 08/11/2026, com PAGAMENTO_HABILITADO=sim, o resumo mostra
// subtotal, frete e total e o botão "Finalizar compra" (Stripe Checkout);
// desligado, continua o "em breve" de antes.
export default async function PaginaCarrinho({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cliente = await exigirSessaoCliente("/loja/carrinho");
  const parametros = await searchParams;
  const itens = await lerItensDoCarrinho(cliente.uid);
  const produtos = await lerProdutosDoCarrinho(itens.map((item) => item.produtoId));
  const resumo = montarResumoDoCarrinho(itens, produtos);
  const linhas = resumo.linhas.map((linha) => ({ ...linha, maximo: quantidadeMaxima(produtos.get(linha.produtoId)?.tipo ?? "fisico") }));
  const liberacao = liberacaoAtual();
  const pagamentoLigado = liberacao.ok;

  // Frete: só com produto físico disponível; sem valor cadastrado, combinado pela ABTE.
  const temFisico = resumo.linhas.some((linha) => linha.situacao === "ok" && produtos.get(linha.produtoId)?.tipo === "fisico");
  const freteFixo = pagamentoLigado && temFisico ? lerFreteFixo((await firestoreAdmin().collection("configuracoes").doc(DOCUMENTO_DA_LOJA).get()).get("freteFixo")) : null;
  const frete = temFisico ? (freteFixo ?? 0) : 0;

  return (
    <div className={`container pagina-interna ${estilos.secao}`}>
      {/* Links da loja (08/11/2026), no lugar do menu flutuante. */}
      <LinksDaLoja />
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Carrinho</h1>
      {parametros.pagamento === "cancelado" && <Mensagem tipo="sucesso">Pagamento cancelado. Seu carrinho continua guardado.</Mensagem>}
      {pagamentoLigado && liberacao.modo === "teste" && <p className={estilos.modoDeTeste} role="note">{TEXTO_MODO_DE_TESTE}</p>}

      {linhas.length === 0 ? (
        <p className="tipo-texto">
          Seu carrinho está vazio. <Link href="/loja">Ver produtos</Link>
        </p>
      ) : (
        <div className={estilos.conteudo}>
          <ItensDoCarrinho linhas={linhas} />
          <section aria-labelledby="titulo-resumo" className={estilos.resumo}>
            <h2 id="titulo-resumo" className="tipo-texto-lg">Resumo</h2>
            {pagamentoLigado ? (
              <>
                <dl className={estilos.valores}>
                  <div>
                    <dt>Subtotal ({resumo.unidades} {resumo.unidades === 1 ? "unidade" : "unidades"})</dt>
                    <dd>{formatarPreco(resumo.total)}</dd>
                  </div>
                  <div>
                    <dt>Frete</dt>
                    <dd>{!temFisico ? "Sem frete (produto digital)" : freteFixo === null ? TEXTO_FRETE_COMBINADO : formatarPreco(frete)}</dd>
                  </div>
                  <div className={estilos.total}>
                    <dt>Total</dt>
                    <dd>{formatarPreco(resumo.total + frete)}</dd>
                  </div>
                </dl>
                {resumo.temProblema && <p>Remova os itens esgotados ou fora da loja para finalizar a compra.</p>}
                <FinalizarCompra desabilitado={resumo.temProblema || resumo.unidades === 0} />
                <p className={estilos.pequeno}>{TEXTO_PAGAMENTO_SEGURO}</p>
              </>
            ) : (
              <>
                <p>Total ({resumo.unidades} {resumo.unidades === 1 ? "unidade" : "unidades"}): <strong>{formatarPreco(resumo.total)}</strong></p>
                {resumo.temProblema && <p>Itens esgotados ou fora da loja não entram no total.</p>}
                <Botao type="button" aria-disabled="true" aria-describedby="finalizar-em-breve">Finalizar compra: em breve</Botao>
                <p id="finalizar-em-breve">A compra online ainda não está disponível. Seu carrinho fica guardado na sua conta.</p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
