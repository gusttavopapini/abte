import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessaoCliente } from "@/lib/auth/sessao-cliente";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_PEDIDOS, ROTULOS_DO_STATUS, rotuloDoMetodo, TEXTO_FRETE_COMBINADO, TEXTO_MODO_DE_TESTE, textoDoPedido } from "@/lib/loja/pagamento";
import { lerPedido } from "@/lib/loja/pedidos";
import { formatarPreco } from "@/lib/produtos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// Pedido da loja (08/11/2026): só o dono vê (outro cliente recebe 404). A
// situação vem sempre do Firestore, gravada pelo webhook da Stripe; a volta do
// Checkout (?retorno=sucesso) não muda nada.
export default async function PaginaPedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await exigirSessaoCliente(`/loja/pedido/${encodeURIComponent(id)}`);
  if (!ehIdDeDocumentoValido(id)) notFound();
  const pedido = lerPedido(id, (await firestoreAdmin().collection(COLECAO_PEDIDOS).doc(id).get()).data());
  if (!pedido || pedido.clienteUid !== cliente.uid) notFound();
  const temDigital = pedido.itens.some((item) => item.tipo === "digital");
  const temFisico = pedido.itens.some((item) => item.tipo === "fisico");

  return (
    <div className={`container pagina-interna ${estilos.secao}`}>
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Pedido</h1>
      {pedido.modo === "teste" && <p className={estilos.modoDeTeste} role="note">{TEXTO_MODO_DE_TESTE}</p>}

      <section aria-labelledby="titulo-situacao" className={estilos.painel}>
        <h2 id="titulo-situacao" className={estilos.subtitulo}>{ROTULOS_DO_STATUS[pedido.status]}</h2>
        <p className={estilos.texto}>{textoDoPedido(pedido.status, pedido.metodo)}</p>
        <dl className={estilos.dados}>
          <div><dt>Número do pedido</dt><dd>{pedido.id}</dd></div>
          {pedido.criadoEm && <div><dt>Feito em</dt><dd>{DATA.format(pedido.criadoEm)}</dd></div>}
          <div><dt>Forma de pagamento</dt><dd>{rotuloDoMetodo(pedido.metodo)}</dd></div>
          {pedido.pagoEm && <div><dt>Pago em</dt><dd>{DATA.format(pedido.pagoEm)}</dd></div>}
        </dl>
        {(pedido.status === "falhou" || pedido.status === "expirado") && (
          <p><Link href="/loja/carrinho">Voltar ao carrinho</Link></p>
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
