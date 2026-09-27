import type { Metadata } from "next";
import { exigirSessaoDoPainel } from "@/lib/auth/sessao";
import { BotaoSair } from "./_componentes/BotaoSair/BotaoSair";
import { EstruturaPainel } from "./_componentes/EstruturaPainel/EstruturaPainel";
import estilos from "./painel.module.css";

export const metadata: Metadata = { title: "Painel da ABTE" };

// Página protegida PROVISÓRIA do painel.
export default async function PaginaPainel() {
  // Sem sessão válida: redireciona para /admin/entrar.
  const resultado = await exigirSessaoDoPainel();

  if (resultado.situacao === "sem-papel") {
    return (
      <EstruturaPainel titulo="Acesso não autorizado">
        <p>Esta conta não tem permissão para usar o painel da ABTE.</p>
        <BotaoSair />
      </EstruturaPainel>
    );
  }

  const { usuario } = resultado;
  return (
    <EstruturaPainel titulo="Painel da ABTE">
      <p className="tipo-texto-lg">Painel em construção</p>
      <dl className={estilos.dados}>
        <div>
          <dt>Nome</dt>
          <dd>{usuario.nome || "Não informado"}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{usuario.email}</dd>
        </div>
      </dl>
      <BotaoSair />
    </EstruturaPainel>
  );
}
