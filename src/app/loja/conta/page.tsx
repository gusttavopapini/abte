import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { exigirSessaoCliente } from "@/lib/auth/sessao-cliente";
import { encerrarSessaoCliente } from "../acoes-conta";
import { ExcluirConta } from "../_componentes/ExcluirConta/ExcluirConta";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };

export default async function PaginaMinhaConta() {
  const cliente = await exigirSessaoCliente("/loja/conta");

  return (
    <div className={`container ${estilos.secao}`}>
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

      <section aria-labelledby="titulo-excluir" className={estilos.bloco}>
        <h2 id="titulo-excluir" className="tipo-h3">Excluir minha conta</h2>
        <div className={estilos.conteudo}>
          <ExcluirConta email={cliente.email} />
        </div>
      </section>
    </div>
  );
}
