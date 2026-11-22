import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ROTA_ENTRAR_LOJA } from "@/lib/auth/constantes";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { decidirAcessoAoPedido } from "@/lib/loja/carrinhoVisitante";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_PEDIDOS, ROTULOS_DO_STATUS, rotuloDoMetodo, TEXTO_FRETE_COMBINADO, textoDoPedido } from "@/lib/loja/pagamento";
import { lerPedido } from "@/lib/loja/pedidos";
import { formatarPreco } from "@/lib/produtos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { LimparCarrinhoPago } from "./LimparCarrinhoPago";
import { CartaoDaLoja, PaginaDaLoja } from "../../_componentes/PaginaDaLoja/PaginaDaLoja";
import { Botao } from "@/components/Botao/Botao";
import { IconeRecibo, IconeSacola } from "@/components/Icones/Icones";
import estilos from "./page.module.css";

// no-referrer: o endereço pode ter o token do pedido (?t=), que não deve ir
// para outros sites.
export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// Pedido da loja (08/11/2026): abre para o dono logado ou para quem tem o
// token do pedido (?t=, vindo da volta da Stripe; vale também para pedido de
// visitante). Token errado ou pedido de outro: 404. Sem sessão e sem token:
// vai para entrar. A situação vem sempre do Firestore, gravada pelo webhook
// da Stripe; a volta do Checkout (?retorno=sucesso) não muda nada.
export default async function PaginaPedido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : undefined;
  const cliente = await lerSessaoCliente();
  if (!ehIdDeDocumentoValido(id)) notFound();
  const pedido = lerPedido(id, (await firestoreAdmin().collection(COLECAO_PEDIDOS).doc(id).get()).data());
  const acesso = decidirAcessoAoPedido({ pedido, clienteUid: cliente?.uid ?? null, token });
  if (acesso === "entrar") redirect(`${ROTA_ENTRAR_LOJA}?voltar=${encodeURIComponent(`/loja/pedido/${id}`)}`);
  if (acesso !== "ver" || !pedido) notFound();
  const temDigital = pedido.itens.some((item) => item.tipo === "digital");
  const temFisico = pedido.itens.some((item) => item.tipo === "fisico");

  return (
    <PaginaDaLoja
      titulo={`Pedido #${pedido.id.slice(-6)}`}
      descricao={
        <p className={estilos.linhaDaSituacao}>
          <span className={estilos.situacao} data-situacao={pedido.status}>{ROTULOS_DO_STATUS[pedido.status]}</span>
          {pedido.criadoEm && <span>Feito em {DATA.format(pedido.criadoEm)}</span>}
        </p>
      }
    >
      {/* Visitante que pagou: esvazia o carrinho do cookie (o servidor confere o token). */}
      {!pedido.clienteUid && pedido.origem === "carrinho" && pedido.status === "pago" && token && <LimparCarrinhoPago pedidoId={pedido.id} token={token} />}

      <div className={estilos.conteudo}>
        <div className={estilos.coluna}>
          <CartaoDaLoja id="titulo-situacao" titulo="Situação do pedido" icone={<IconeRecibo />}>
            <p className={estilos.texto}>{textoDoPedido(pedido.status, pedido.metodo)}</p>
            {(pedido.status === "falhou" || pedido.status === "expirado") && (
              <Botao href="/loja/carrinho" variante="secundario" className={estilos.botao}>Voltar ao carrinho</Botao>
            )}
            <dl className={estilos.dados}>
              <div><dt>Número do pedido</dt><dd>{pedido.id}</dd></div>
              {pedido.email && <div><dt>E-mail</dt><dd>{pedido.email}</dd></div>}
              <div><dt>Forma de pagamento</dt><dd>{rotuloDoMetodo(pedido.metodo)}</dd></div>
              {pedido.pagoEm && <div><dt>Pago em</dt><dd>{DATA.format(pedido.pagoEm)}</dd></div>}
            </dl>
            {!pedido.clienteUid && (
              <p className={estilos.aviso}>Guarde este endereço: ele é o acesso a este pedido, porque a compra foi feita sem conta. O número do pedido também identifica a compra ao falar com a ABTE.</p>
            )}
          </CartaoDaLoja>
        </div>

        <CartaoDaLoja id="titulo-itens" titulo="Itens e valores" icone={<IconeSacola />}>
          <ul role="list" className={estilos.itens}>
            {pedido.itens.map((item) => (
              <li key={item.produtoId}>
                <span className={estilos.nomeDoItem}>
                  {item.nome}
                  <span className={estilos.detalhe}>{item.quantidade} x {formatarPreco(item.precoUnitario)}{item.tipo === "digital" ? " · produto digital" : ""}</span>
                </span>
                <span>{formatarPreco(item.precoUnitario * item.quantidade)}</span>
              </li>
            ))}
          </ul>
          <dl className={estilos.valores}>
            <div><dt>Subtotal</dt><dd>{formatarPreco(pedido.subtotal)}</dd></div>
            {pedido.desconto > 0 && <div className={estilos.desconto}><dt>Cupom {pedido.cupom?.codigo} ({pedido.cupom?.percentual}%)</dt><dd>- {formatarPreco(pedido.desconto)}</dd></div>}
            {temFisico && <div><dt>Frete</dt><dd>{pedido.freteCombinado ? TEXTO_FRETE_COMBINADO : formatarPreco(pedido.frete)}</dd></div>}
            <div className={estilos.total}><dt>Total</dt><dd>{formatarPreco(pedido.total)}</dd></div>
          </dl>
          {temDigital && <p className={estilos.aviso}>Os produtos digitais são enviados pela ABTE depois da confirmação do pagamento.</p>}
        </CartaoDaLoja>
      </div>
    </PaginaDaLoja>
  );
}
