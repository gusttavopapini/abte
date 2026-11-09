import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_PEDIDOS, ROTULOS_DO_ENVIO, ROTULOS_DO_STATUS, STATUS_DO_PEDIDO, ehStatusDoPedido } from "@/lib/loja/pagamento";
import { lerPedido, type Pedido } from "@/lib/loja/pedidos";
import { formatarPreco } from "@/lib/produtos";
import estilos from "./pedidos.module.css";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const TRILHA = [{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Pedidos" }];
const DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// Pedidos da loja (08/11/2026, só administrador): lista filtrável pela
// situação (?situacao=), mais recentes primeiro. Reembolso: pelo painel da Stripe.
export default async function PaginaPedidos({ searchParams }: { searchParams: Promise<{ situacao?: string }> }) {
  await exigirPapelDoPainel("pedidos.ver");
  const { situacao } = await searchParams;
  const filtro = ehStatusDoPedido(situacao) ? situacao : null;
  const documentos = await firestoreAdmin().collection(COLECAO_PEDIDOS).orderBy("criadoEm", "desc").limit(300).get();
  const pedidos = documentos.docs.map((documento) => lerPedido(documento.id, documento.data())).filter((pedido): pedido is Pedido => pedido !== null && (!filtro || pedido.status === filtro));

  return (
    <>
      <CabecalhoDoPainel trilha={TRILHA} titulo="Pedidos" descricao="Pedidos da loja pagos pela Stripe. Para reembolsar, use o painel da Stripe; a situação muda aqui sozinha." />
      <nav aria-label="Filtrar pela situação" className={estilos.filtros}>
        <Link href="/admin/pedidos" aria-current={!filtro ? "page" : undefined} className={estilos.filtro}>Todos</Link>
        {STATUS_DO_PEDIDO.map((status) => (
          <Link key={status} href={`/admin/pedidos?situacao=${status}`} aria-current={filtro === status ? "page" : undefined} className={estilos.filtro}>
            {ROTULOS_DO_STATUS[status]}
          </Link>
        ))}
      </nav>
      <div className={estilos.caixa}>
        {pedidos.length === 0 ? (
          <CaixaDoPainel>Nenhum pedido {filtro ? "nesta situação" : "ainda"}.</CaixaDoPainel>
        ) : (
          <table className={estilos.tabela}>
            <caption className="somente-leitor">Pedidos, do mais recente para o mais antigo</caption>
            <thead>
              <tr><th scope="col">Data</th><th scope="col">Pedido</th><th scope="col">Cliente</th><th scope="col">E-mail</th><th scope="col">Total</th><th scope="col">Situação</th><th scope="col">Envio</th></tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td data-rotulo="Data">{pedido.criadoEm ? DATA.format(pedido.criadoEm) : ""}</td>
                  <td data-rotulo="Pedido"><Link href={`/admin/pedidos/${pedido.id}`}>{pedido.id.slice(0, 8)}</Link>{pedido.modo === "teste" ? " (teste)" : ""}</td>
                  <td data-rotulo="Cliente">{pedido.clienteUid ? "Conta" : "Visitante"}</td>
                  <td data-rotulo="E-mail">{pedido.email}</td>
                  <td data-rotulo="Total">{formatarPreco(pedido.total)}</td>
                  <td data-rotulo="Situação">{ROTULOS_DO_STATUS[pedido.status]}</td>
                  <td data-rotulo="Envio">{pedido.status === "pago" ? ROTULOS_DO_ENVIO[pedido.envio.situacao] : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
