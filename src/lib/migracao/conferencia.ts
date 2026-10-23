// Conferência depois de cada passo da migração (roteiro de execução real),
// só leitura: contagem dos documentos de cada coleção (todos, os que vieram
// da migração e os marcados para revisão) e busca de endereço do Wix em todos
// os documentos dessas coleções e do registro de alterações. As imagens do
// texto dos posts que ainda apontam para o Wix pelo id (midia:wix:...) não
// são endereço: são contadas à parte (não aparecem no site).
//
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/conferir-migracao.mts) e nos testes no emulador.
import type { Firestore } from "firebase-admin/firestore";
import { COLECAO_LOG } from "../log/alteracoes.ts";
import { SISTEMA_DE_ORIGEM } from "./imagens.ts";

export const COLECOES_CONFERIDAS = ["midias", "profissionais", "categoriasDeProdutos", "produtos", "posts", "categoriasDeArtigos", "artigos", "diretoria"] as const;

// Endereço (host) do Wix ou dos servidores de mídia dele.
const ENDERECO_DO_WIX = /wixstatic\.com|wixmp\.com|static\.wix|usrfiles|parastorage\.com|wix\.com/i;
const IMAGEM_PENDENTE = /\]\(midia:wix:/g;

export async function conferirMigracao(db: Firestore) {
  const colecoes: { colecao: string; total: number; daMigracao: number; paraRevisar: number; comEnderecoDoWix: string[] }[] = [];
  let imagensPendentesNoTexto = 0;
  let postsComImagemPendente = 0;
  for (const colecao of [...COLECOES_CONFERIDAS, COLECAO_LOG]) {
    const documentos = (await db.collection(colecao).get()).docs;
    const comEnderecoDoWix = documentos.filter((documento) => ENDERECO_DO_WIX.test(JSON.stringify(documento.data()))).map((documento) => documento.id);
    colecoes.push({
      colecao,
      total: documentos.length,
      daMigracao: colecao === COLECAO_LOG ? documentos.filter((documento) => documento.get("origem") === "migracao").length : documentos.filter((documento) => documento.get("origem.sistema") === SISTEMA_DE_ORIGEM).length,
      paraRevisar: documentos.filter((documento) => documento.get("revisarMigracao") === true).length,
      comEnderecoDoWix,
    });
    if (colecao === "posts") {
      for (const documento of documentos) {
        const pendentes = String(documento.get("conteudo") ?? "").match(IMAGEM_PENDENTE)?.length ?? 0;
        imagensPendentesNoTexto += pendentes;
        if (pendentes) postsComImagemPendente++;
      }
    }
  }
  return {
    colecoes,
    imagensPendentesNoTexto,
    postsComImagemPendente,
    documentosComEnderecoDoWix: colecoes.reduce((soma, item) => soma + item.comEnderecoDoWix.length, 0),
  };
}
