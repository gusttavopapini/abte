import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { dataHoraDaMensagem } from "@/lib/contato";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { LIMITE_DA_LISTA_DE_MENSAGENS, listarMensagensDeContato } from "@/lib/gravacao/contato";
import estilos from "./mensagens.module.css";

export const metadata: Metadata = { title: "Mensagens" };
export const dynamic = "force-dynamic";

const TRILHA = [{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Mensagens" }];
const DESCRICAO = "Mensagens enviadas pelo formulário \"Fale com a ABTE\", as mais recentes primeiro. As não lidas ficam marcadas. Só o administrador vê esta tela.";

// Mensagens do formulário de contato (08/11/2026). Só administrador; o
// editor que abre o endereço vê a explicação, sem os dados.
export default async function PaginaMensagens() {
  const usuario = await exigirPapelDoPainel();
  if (!papelPodeExecutar(usuario.papel, "mensagens.ler")) {
    return (
      <>
        <CabecalhoDoPainel trilha={TRILHA} titulo="Mensagens" descricao={DESCRICAO} />
        <CaixaDoPainel tipo="atencao">Só o administrador lê as mensagens do formulário de contato.</CaixaDoPainel>
      </>
    );
  }
  let mensagens;
  try {
    mensagens = await listarMensagensDeContato(firestoreAdmin());
  } catch (erro) {
    console.error("Mensagens: falha ao ler a lista.", erro);
    return (
      <>
        <CabecalhoDoPainel trilha={TRILHA} titulo="Mensagens" descricao={DESCRICAO} />
        <CaixaDoPainel tipo="erro">Não foi possível carregar as mensagens agora. Recarregue a página em instantes.</CaixaDoPainel>
      </>
    );
  }
  const naoLidas = mensagens.filter((mensagem) => !mensagem.lida).length;
  return (
    <>
      <CabecalhoDoPainel trilha={TRILHA} titulo="Mensagens" descricao={DESCRICAO} />
      {mensagens.length === 0 ? (
        <CaixaDoPainel tipo="informacao">Nenhuma mensagem recebida ainda. As mensagens enviadas pela página de contato aparecem aqui.</CaixaDoPainel>
      ) : (
        <>
          <p>
            {mensagens.length === 1 ? "1 mensagem" : `${mensagens.length} mensagens`}, {naoLidas === 1 ? "1 não lida" : `${naoLidas} não lidas`}.
            {mensagens.length >= LIMITE_DA_LISTA_DE_MENSAGENS && ` Mostrando as ${LIMITE_DA_LISTA_DE_MENSAGENS} mais recentes.`}
          </p>
          <ul className={estilos.lista}>
            {mensagens.map((mensagem) => (
              <li key={mensagem.id} className={`${estilos.item} ${mensagem.lida ? "" : estilos.naoLida}`}>
                <Link href={`/admin/mensagens/${mensagem.id}`} className={estilos.link}>
                  <span className={estilos.topo}>
                    <span className={estilos.remetente}>
                      {mensagem.nome} {mensagem.sobrenome}
                      {mensagem.assunto ? `: ${mensagem.assunto}` : ""}
                    </span>
                    {!mensagem.lida && <span className={estilos.etiqueta}>Não lida</span>}
                  </span>
                  <span className={estilos.data}>
                    {dataHoraDaMensagem(mensagem.criadoEm)}, {mensagem.email}
                  </span>
                  <span className={estilos.trecho}>{mensagem.mensagem}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
