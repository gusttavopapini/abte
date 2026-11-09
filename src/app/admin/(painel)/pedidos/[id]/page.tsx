import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_PEDIDOS, ROTULOS_DO_ENVIO, ROTULOS_DO_STATUS, rotuloDoMetodo, TEXTO_FRETE_COMBINADO } from "@/lib/loja/pagamento";
import { lerPedido } from "@/lib/loja/pedidos";
import { formatarPreco } from "@/lib/produtos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { AcoesDeEnvio } from "../FormulariosDoPainelDaLoja";
import estilos from "../pedidos.module.css";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

const DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// Detalhe do pedido (08/11/2026, só administrador): itens (com o que enviar
// manualmente nos digitais), valores, contato, endereço e o envio.
export default async function PaginaPedido({ params }: { params: Promise<{ id: string }> }) {
  await exigirPapelDoPainel("pedidos.ver");
  const { id } = await params;
  if (!ehIdDeDocumentoValido(id)) notFound();
  const pedido = lerPedido(id, (await firestoreAdmin().collection(COLECAO_PEDIDOS).doc(id).get()).data());
  if (!pedido) notFound();
  const digitais = pedido.itens.filter((item) => item.tipo === "digital");
  const endereco = pedido.endereco;

  return (
    <>
      <CabecalhoDoPainel trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Pedidos", href: "/admin/pedidos" }, { rotulo: id.slice(0, 8) }]} titulo={`Pedido ${id.slice(0, 8)}`} descricao={`${ROTULOS_DO_STATUS[pedido.status]}${pedido.modo === "teste" ? " (modo de teste)" : ""}`} />
      <section aria-labelledby="titulo-itens" className={estilos.caixa}>
        <h2 id="titulo-itens" className={estilos.subtitulo}>Itens</h2>
        <table className={estilos.tabela}>
          <thead><tr><th scope="col">Produto</th><th scope="col">Tipo</th><th scope="col">Quantidade</th><th scope="col">Preço</th></tr></thead>
          <tbody>
            {pedido.itens.map((item) => (
              <tr key={item.produtoId}>
                <td data-rotulo="Produto">{item.nome}</td>
                <td data-rotulo="Tipo">{item.tipo === "digital" ? "Digital" : "Físico"}</td>
                <td data-rotulo="Quantidade">{item.quantidade}</td>
                <td data-rotulo="Preço">{formatarPreco(item.precoUnitario * item.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className={estilos.dados}>
          <div><dt>Subtotal:</dt><dd>{formatarPreco(pedido.subtotal)}</dd></div>
          <div><dt>Frete:</dt><dd>{pedido.freteCombinado ? TEXTO_FRETE_COMBINADO : formatarPreco(pedido.frete)}</dd></div>
          <div><dt>Total:</dt><dd>{formatarPreco(pedido.total)}</dd></div>
        </dl>
        {digitais.length > 0 && pedido.status === "pago" && (
          <CaixaDoPainel tipo="atencao" titulo="Enviar manualmente">
            Produtos digitais para enviar ao cliente ({pedido.email}): {digitais.map((item) => item.nome).join("; ")}.
          </CaixaDoPainel>
        )}
      </section>
      <section aria-labelledby="titulo-pagamento" className={estilos.caixa}>
        <h2 id="titulo-pagamento" className={estilos.subtitulo}>Pagamento e contato</h2>
        <dl className={estilos.dados}>
          <div><dt>Situação:</dt><dd>{ROTULOS_DO_STATUS[pedido.status]}</dd></div>
          <div><dt>Forma:</dt><dd>{rotuloDoMetodo(pedido.metodo)}</dd></div>
          {pedido.criadoEm && <div><dt>Criado em:</dt><dd>{DATA.format(pedido.criadoEm)}</dd></div>}
          {pedido.pagoEm && <div><dt>Pago em:</dt><dd>{DATA.format(pedido.pagoEm)}</dd></div>}
          <div><dt>Cliente:</dt><dd>{pedido.clienteUid ? "Conta da loja" : "Visitante (compra sem conta)"}</dd></div>
          {pedido.nome && <div><dt>Nome:</dt><dd>{pedido.nome}</dd></div>}
          <div><dt>E-mail:</dt><dd>{pedido.email}</dd></div>
          {pedido.telefone && <div><dt>Telefone:</dt><dd>{pedido.telefone}</dd></div>}
          {endereco && (
            <div>
              <dt>Entrega:</dt>
              <dd>{[endereco.nome, endereco.linha1, endereco.linha2, `${endereco.cidade} ${endereco.estado}`.trim(), endereco.cep].filter(Boolean).join(", ")}</dd>
            </div>
          )}
          {pedido.stripeSessionId && <div><dt>Sessão na Stripe:</dt><dd>{pedido.stripeSessionId}</dd></div>}
        </dl>
      </section>
      {pedido.status === "pago" && (
        <section aria-labelledby="titulo-envio" className={estilos.caixa}>
          <h2 id="titulo-envio" className={estilos.subtitulo}>Envio: {ROTULOS_DO_ENVIO[pedido.envio.situacao]}</h2>
          <AcoesDeEnvio pedidoId={pedido.id} situacao={pedido.envio.situacao} />
        </section>
      )}
    </>
  );
}
