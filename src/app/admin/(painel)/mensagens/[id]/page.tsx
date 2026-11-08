import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { dataHoraDaMensagem } from "@/lib/contato";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { lerMensagemDeContato } from "@/lib/gravacao/contato";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { MarcarComoLida } from "../MarcarComoLida";
import estilos from "../mensagens.module.css";

export const metadata: Metadata = { title: "Mensagem | Mensagens" };
export const dynamic = "force-dynamic";

const TRILHA = [{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Mensagens", href: "/admin/mensagens" }, { rotulo: "Mensagem" }];

// Detalhe de uma mensagem do formulário de contato (08/11/2026). Abrir não
// marca como lida: só o botão "Marcar como lida", que fica no registro.
export default async function PaginaMensagem({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPapelDoPainel();
  if (!papelPodeExecutar(usuario.papel, "mensagens.ler")) {
    return (
      <>
        <CabecalhoDoPainel trilha={TRILHA} titulo="Mensagem" descricao="Mensagem enviada pelo formulário Fale com a ABTE." />
        <CaixaDoPainel tipo="atencao">Só o administrador lê as mensagens do formulário de contato.</CaixaDoPainel>
      </>
    );
  }
  const { id } = await params;
  if (!ehIdDeDocumentoValido(id)) redirect("/admin/mensagens");
  const mensagem = await lerMensagemDeContato(firestoreAdmin(), id);
  if (!mensagem) redirect("/admin/mensagens");
  const remetente = `${mensagem.nome} ${mensagem.sobrenome}`.trim();
  return (
    <>
      <CabecalhoDoPainel trilha={TRILHA} titulo={mensagem.assunto || "Mensagem sem assunto"} descricao={`Enviada por ${remetente} em ${dataHoraDaMensagem(mensagem.criadoEm)}.`} />
      <section className={estilos.detalhe} aria-label="Mensagem">
        <dl className={estilos.dados}>
          <dt>Nome</dt>
          <dd>{remetente}</dd>
          <dt>E-mail</dt>
          <dd>
            <a href={`mailto:${mensagem.email}`}>{mensagem.email}</a>
          </dd>
          <dt>Assunto</dt>
          <dd>{mensagem.assunto || "Sem assunto"}</dd>
          <dt>Recebida em</dt>
          <dd>{dataHoraDaMensagem(mensagem.criadoEm)}</dd>
          <dt>Situação</dt>
          <dd>{mensagem.lida ? `Lida${mensagem.lidaEm ? ` em ${dataHoraDaMensagem(mensagem.lidaEm)}` : ""}` : "Não lida"}</dd>
        </dl>
        <p className={estilos.textoDaMensagem}>{mensagem.mensagem}</p>
        <div className={estilos.acoes}>{!mensagem.lida && <MarcarComoLida id={mensagem.id} />}</div>
      </section>
    </>
  );
}
