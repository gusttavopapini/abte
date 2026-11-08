import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import Link from "next/link";
import { exigirSessaoCliente } from "@/lib/auth/sessao-cliente";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_PEDIDOS, ROTULOS_DO_STATUS } from "@/lib/loja/pagamento";
import { lerPedido, type Pedido } from "@/lib/loja/pedidos";
import { formatarPreco } from "@/lib/produtos";
import { encerrarSessaoCliente } from "../acoes-conta";
import { ExcluirConta } from "../_componentes/ExcluirConta/ExcluirConta";
import { LinksDaLoja } from "../_componentes/LinksDaLoja/LinksDaLoja";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };

export default async function PaginaMinhaConta() {
  const cliente = await exigirSessaoCliente("/loja/conta");
  // Pedidos do cliente (08/11/2026), mais recentes primeiro (ordenados na
  // memória, sem índice composto).
  const documentos = await firestoreAdmin().collection(COLECAO_PEDIDOS).where("clienteUid", "==", cliente.uid).limit(50).get();
  const pedidos = documentos.docs
    .map((documento) => lerPedido(documento.id, documento.data()))
    .filter((pedido): pedido is Pedido => pedido !== null)
    .sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0));
  const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

  return (
    <div className={`container pagina-interna ${estilos.secao}`}>
      {/* Links da loja (08/11/2026), no lugar do menu flutuante. */}
      <LinksDaLoja />
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Minha conta</h1>

      <section aria-labelledby="titulo-dados" className={estilos.bloco}>
        <h2 id="titulo-dados" className="tipo-h3">Seus dados</h2>
        <dl className={estilos.dados}>
          <dt>Nome</dt>
          <dd>{cliente.nome || "Não informado"}</dd>
          <dt>E-mail</dt>
          <dd>{cliente.email}</dd>
        </dl>
        <form action={encerrarSessaoCliente}>
          <Botao type="submit" variante="secundario">Sair</Botao>
        </form>
      </section>

      {pedidos.length > 0 && (
        <section aria-labelledby="titulo-pedidos" className={estilos.bloco}>
          <h2 id="titulo-pedidos" className="tipo-h3">Meus pedidos</h2>
          <ul role="list" className={estilos.pedidos}>
            {pedidos.map((pedido) => (
              <li key={pedido.id}>
                <Link href={`/loja/pedido/${pedido.id}`}>
                  {pedido.criadoEm ? data.format(pedido.criadoEm) : "Pedido"}: {formatarPreco(pedido.total)}, {ROTULOS_DO_STATUS[pedido.status].toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-excluir" className={estilos.bloco}>
        <h2 id="titulo-excluir" className="tipo-h3">Excluir minha conta</h2>
        <div className={estilos.conteudo}>
          <ExcluirConta email={cliente.email} />
        </div>
      </section>
    </div>
  );
}
