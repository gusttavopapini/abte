// Leitura da visão geral do painel (etapa 3, 04/11/2026), SÓ no servidor:
// contagens de cada área (só os campos de situação) e as últimas linhas do
// registro de alterações. Quem chama confere sessão e papel antes.
import "server-only";

import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_LOG } from "@/lib/log/alteracoes";
import { contarLixeira, contarSituacoes, QUANTAS_ALTERACOES, rotuloDaColecaoNoRegistro, type ContagemDaArea } from "@/lib/painel/visaoGeral";

export type ResumoDoPainel = {
  posts: ContagemDaArea;
  artigos: ContagemDaArea;
  profissionais: ContagemDaArea;
  produtos: ContagemDaArea;
  midiasNaLixeira: number;
};

async function campos(colecao: string, nomes: string[]): Promise<Record<string, unknown>[]> {
  return (await firestoreAdmin().collection(colecao).select(...nomes).get()).docs.map((documento) => documento.data());
}

export async function lerResumoDoPainel(): Promise<ResumoDoPainel> {
  const [posts, artigos, profissionais, produtos, midias] = await Promise.all([
    campos("posts", ["status", "excluidoEm"]),
    campos("artigos", ["status", "excluidoEm"]),
    campos("profissionais", ["ativo", "excluidoEm"]),
    campos("produtos", ["publicado", "excluidoEm"]),
    campos("midias", ["excluidoEm"]),
  ]);
  return {
    posts: contarSituacoes("posts", posts),
    artigos: contarSituacoes("artigos", artigos),
    profissionais: contarSituacoes("profissionais", profissionais),
    produtos: contarSituacoes("produtos", produtos),
    midiasNaLixeira: contarLixeira(midias),
  };
}

export type AlteracaoNaTela = { id: string; quando: Date | null; quem: string; onde: string; resumo: string };

// Só o que a tela mostra: quando, quem (nome do cadastro, nunca o e-mail),
// a área e o resumo (que não leva valores nem nomes de itens).
export async function lerUltimasAlteracoes(): Promise<AlteracaoNaTela[]> {
  const documentos = await firestoreAdmin().collection(COLECAO_LOG).orderBy("criadoEm", "desc").limit(QUANTAS_ALTERACOES).get();
  return documentos.docs.map((documento) => {
    const criadoEm = documento.get("criadoEm");
    return {
      id: documento.id,
      quando: criadoEm && typeof criadoEm.toDate === "function" ? criadoEm.toDate() : null,
      quem: String(documento.get("usuarioNome") ?? "") || "Sem nome",
      onde: rotuloDaColecaoNoRegistro(documento.get("colecao")),
      resumo: String(documento.get("resumo") ?? ""),
    };
  });
}
