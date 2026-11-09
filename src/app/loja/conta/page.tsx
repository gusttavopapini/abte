import type { Metadata } from "next";
import Link from "next/link";
import { Botao } from "@/components/Botao/Botao";
import { IconePessoa, IconeSacola } from "@/components/Icones/Icones";
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

const DATA_DO_PEDIDO = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

export default async function PaginaMinhaConta() {
  const cliente = await exigirSessaoCliente("/loja/conta");
  // Pedidos do cliente (08/11/2026), mais recentes primeiro (ordenados na
  // memória, sem índice composto).
  const documentos = await firestoreAdmin().collection(COLECAO_PEDIDOS).where("clienteUid", "==", cliente.uid).limit(50).get();
  const pedidos = documentos.docs
    .map((documento) => lerPedido(documento.id, documento.data()))
    .filter((pedido): pedido is Pedido => pedido !== null)
    .sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0));
  return (
    <div className={`container ${estilos.secao}`}>
      <header className={estilos.cabecalho}>
        <Botao href="/loja" variante="link" className={estilos.voltar}>
          <span className="seta-para-tras" aria-hidden="true">&larr;</span>
          Voltar para a loja
        </Botao>
        <LinksDaLoja />
        <div className={estilos.abertura}>
          <div className={estilos.introducao}>
            <h1 className="tipo-h2">Minha conta</h1>
            <p>Acompanhe seus pedidos e consulte seus dados da loja.</p>
          </div>
          <form action={encerrarSessaoCliente}>
            <Botao type="submit" variante="secundario" className={estilos.sair}>Sair da conta</Botao>
          </form>
        </div>
      </header>

      <div className={estilos.painel}>
        <section aria-labelledby="titulo-pedidos" className={estilos.cartao}>
          <header className={estilos.cabecalhoDoCartao}>
            <span className={estilos.iconeDaSecao}><IconeSacola /></span>
            <h2 id="titulo-pedidos" className="tipo-h3">Meus pedidos</h2>
          </header>
          {pedidos.length > 0 ? (
            <ul role="list" className={estilos.pedidos}>
              {pedidos.map((pedido) => (
                <li key={pedido.id}>
                  <Link href={`/loja/pedido/${pedido.id}`} className={estilos.pedido}>
                    <div className={estilos.identificacao}>
                      <span className={estilos.numero}>Pedido #{pedido.id.slice(-6)}</span>
                      {pedido.criadoEm && <time dateTime={pedido.criadoEm.toISOString()}>{DATA_DO_PEDIDO.format(pedido.criadoEm)}</time>}
                      <span className={estilos.situacao} data-situacao={pedido.status}>{ROTULOS_DO_STATUS[pedido.status]}</span>
                    </div>
                    <div className={estilos.resumo}>
                      <strong>{formatarPreco(pedido.total)}</strong>
                      <span className={estilos.verPedido}>Ver pedido <span aria-hidden="true">&rarr;</span></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={estilos.semPedidos}>
              <p>Você ainda não tem pedidos.</p>
              <Botao href="/loja">Ver produtos</Botao>
            </div>
          )}
        </section>

        <div className={estilos.lateral}>
          <section aria-labelledby="titulo-dados" className={estilos.cartao}>
            <header className={estilos.cabecalhoDoCartao}>
              <span className={estilos.iconeDaSecao}><IconePessoa /></span>
              <h2 id="titulo-dados" className="tipo-h3">Seus dados</h2>
            </header>
            <dl className={estilos.dados}>
              <div>
                <dt>Nome</dt>
                <dd>{cliente.nome || "Não informado"}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{cliente.email || "Não informado"}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="titulo-gerenciar" className={estilos.cartao}>
            <h2 id="titulo-gerenciar" className="tipo-h3">Gerenciar conta</h2>
            <ExcluirConta email={cliente.email} />
          </section>
        </div>
      </div>
    </div>
  );
}
