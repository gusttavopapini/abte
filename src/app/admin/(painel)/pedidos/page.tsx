import type { Metadata } from "next";
import Link from "next/link";
import { Botao } from "@/components/Botao/Botao";
import { CelulaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
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
      {/* Mesma tabela das outras listas (10/11/2026): ações na última coluna,
          cartões até 767px e o estado vazio numa caixa branca. */}
      <TabelaPainel
        legenda="Pedidos, do mais recente para o mais antigo."
        colunas={["Pedido", "Cliente", "Total", "Situação", "Ações"]}
        vazia={pedidos.length === 0}
        estadoVazio={<p className="tipo-texto">Nenhum pedido {filtro ? "nesta situação" : "ainda"}.</p>}
      >
        {/* Cinco colunas (10/11/2026): com oito, a tabela não cabia de 768 a 1024px. */}
        {pedidos.map((pedido) => (
          <tr key={pedido.id}>
            <CelulaDoPainel rotulo="Pedido">
              {pedido.id.slice(0, 8)}
              {pedido.modo === "teste" ? " (teste)" : ""}
              <span className={estilos.detalheDaCelula}>{pedido.criadoEm ? DATA.format(pedido.criadoEm) : ""}</span>
            </CelulaDoPainel>
            <CelulaDoPainel rotulo="Cliente" quebrar>
              {pedido.clienteUid ? "Conta" : "Visitante"}
              <span className={estilos.detalheDaCelula}>{pedido.email}</span>
            </CelulaDoPainel>
            <CelulaDoPainel rotulo="Total">{formatarPreco(pedido.total)}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Situação">
              {ROTULOS_DO_STATUS[pedido.status]}
              {pedido.status === "pago" && <span className={estilos.detalheDaCelula}>{ROTULOS_DO_ENVIO[pedido.envio.situacao]}</span>}
            </CelulaDoPainel>
            <CelulaDoPainel rotulo="Ações" acoes>
              <Botao href={`/admin/pedidos/${pedido.id}`} variante="secundario" aria-label={`Ver o pedido ${pedido.id.slice(0, 8)}`}>
                Ver pedido
              </Botao>
            </CelulaDoPainel>
          </tr>
        ))}
      </TabelaPainel>
    </>
  );
}
