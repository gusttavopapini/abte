import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ROTA_ENTRAR_LOJA } from "@/lib/auth/constantes";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { decidirAcessoAoPedido } from "@/lib/loja/carrinhoVisitante";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_PEDIDOS, ROTULOS_DO_STATUS, rotuloDoMetodo, TEXTO_FRETE_COMBINADO, TEXTO_MODO_DE_TESTE, textoDoPedido } from "@/lib/loja/pagamento";
import { lerPedido } from "@/lib/loja/pedidos";
import { formatarPreco } from "@/lib/produtos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { LimparCarrinhoPago } from "./LimparCarrinhoPago";
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
    <div className={`container pagina-interna ${estilos.secao}`}>
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Pedido</h1>
      {pedido.modo === "teste" && <p className={estilos.modoDeTeste} role="note">{TEXTO_MODO_DE_TESTE}</p>}
      {/* Visitante que pagou: esvazia o carrinho do cookie (o servidor confere o token). */}
      {!pedido.clienteUid && pedido.origem === "carrinho" && pedido.status === "pago" && token && <LimparCarrinhoPago pedidoId={pedido.id} token={token} />}

      <section aria-labelledby="titulo-situacao" className={estilos.painel}>
        <h2 id="titulo-situacao" className={estilos.subtitulo}>{ROTULOS_DO_STATUS[pedido.status]}</h2>
        <p className={estilos.texto}>{textoDoPedido(pedido.status, pedido.metodo)}</p>
        <dl className={estilos.dados}>
          <div><dt>Número do pedido</dt><dd>{pedido.id}</dd></div>
          {pedido.email && <div><dt>E-mail</dt><dd>{pedido.email}</dd></div>}
          {pedido.criadoEm && <div><dt>Feito em</dt><dd>{DATA.format(pedido.criadoEm)}</dd></div>}
          <div><dt>Forma de pagamento</dt><dd>{rotuloDoMetodo(pedido.metodo)}</dd></div>
          {pedido.pagoEm && <div><dt>Pago em</dt><dd>{DATA.format(pedido.pagoEm)}</dd></div>}
        </dl>
        {(pedido.status === "falhou" || pedido.status === "expirado") && (
          <p><Link href="/loja/carrinho">Voltar ao carrinho</Link></p>
        )}
        {!pedido.clienteUid && (
          <p className={estilos.pequeno}>Guarde este endereço: ele é o acesso a este pedido, porque a compra foi feita sem conta. O número do pedido também identifica a compra ao falar com a ABTE.</p>
        )}
      </section>

      <section aria-labelledby="titulo-itens" className={estilos.painel}>
        <h2 id="titulo-itens" className={estilos.subtitulo}>Itens</h2>
        <ul role="list" className={estilos.itens}>
          {pedido.itens.map((item) => (
            <li key={item.produtoId}>
              <span>{item.quantidade} x {item.nome}{item.tipo === "digital" ? " (produto digital)" : ""}</span>
              <span>{formatarPreco(item.precoUnitario * item.quantidade)}</span>
            </li>
          ))}
        </ul>
        <dl className={estilos.dados}>
          <div><dt>Subtotal</dt><dd>{formatarPreco(pedido.subtotal)}</dd></div>
          {temFisico && <div><dt>Frete</dt><dd>{pedido.freteCombinado ? TEXTO_FRETE_COMBINADO : formatarPreco(pedido.frete)}</dd></div>}
          <div className={estilos.total}><dt>Total</dt><dd>{formatarPreco(pedido.total)}</dd></div>
        </dl>
        {temDigital && <p className={estilos.pequeno}>Os produtos digitais são enviados pela ABTE depois da confirmação do pagamento.</p>}
      </section>
    </div>
  );
}
