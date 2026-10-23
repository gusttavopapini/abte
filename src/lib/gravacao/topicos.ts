// Gravação dos tópicos (categorias e tags dos artigos e categorias de produto)
// no Firestore. Sem sessão e sem "server-only", como os outros módulos de
// gravação: recebe o Firestore e o autor por parâmetro e é usada por
// acoes-topicos.ts (que confere sessão e papel antes) e pelos testes no
// emulador.
//
// Desde 23/10/2026, toda criação, edição, exclusão para a lixeira e
// restauração de CATEGORIA DE ARTIGO grava em logAlteracoes na mesma
// transação (a alteração e o registro entram juntos, ou nenhum entra), no
// formato dos profissionais: só os nomes dos campos (nome, ordem,
// imagemMidiaId, ativa), nunca os valores, e um resumo em português. Tags e
// categorias de produto ainda não registram (etapa 3).
import { FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { TipoDeTopico } from "../dados/tipos.ts";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { escolhaDeMidiaValida } from "../midia/biblioteca.ts";
import { escolherSlugUnico, gerarSlug } from "../slug.ts";
import { lerAtiva } from "../topicos.ts";

export const MENSAGEM_IMAGEM_DA_CATEGORIA_INDISPONIVEL = "A imagem escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Escolha outra ou remova a imagem.";

// Mesmos nomes de COLECAO_DE_TOPICOS em lib/dados/colecoes.ts (server-only).
export const COLECOES_DE_TOPICOS: Record<TipoDeTopico, string> = {
  categoria: "categoriasDeArtigos",
  tag: "tagsDeArtigos",
  categoriaDeProduto: "categoriasDeProdutos",
};

// Textos das mensagens de cada tipo de tópico.
const TEXTOS: Record<TipoDeTopico, { repetido: string; criado: string; emUso: string }> = {
  categoria: {
    repetido: "Já existe uma categoria com esse nome.",
    criado: "Categoria criada",
    emUso: "está em uso por pelo menos um artigo. Troque a categoria desses artigos antes de excluir.",
  },
  categoriaDeProduto: {
    repetido: "Já existe uma categoria de produto com esse nome.",
    criado: "Categoria criada",
    emUso: "está em uso por pelo menos um produto. Troque a categoria desses produtos antes de excluir.",
  },
  tag: {
    repetido: "Já existe uma tag com esse nome.",
    criado: "Tag criada",
    emUso: "está em uso por pelo menos um artigo. Tire a tag desses artigos antes de excluir.",
  },
};

type Falha = { ok: false; mensagem: string };

// Erro com mensagem para a tela (em português), lançado dentro da transação.
class RecusaDoTopico extends Error {}

function falha(erro: unknown): Falha {
  if (erro instanceof RecusaDoTopico) return { ok: false, mensagem: erro.message };
  throw erro;
}

// Só as categorias de artigo registram em logAlteracoes (por enquanto).
const comRegistro = (tipo: TipoDeTopico) => tipo === "categoria";

// Dois tópicos ativos com o mesmo nome (ignorando acento e maiúsculas) confundem
// quem navega; o nome repetido é recusado.
function nomeRepetido(nome: string, documentos: QueryDocumentSnapshot[], ignorarId?: string): boolean {
  const chave = gerarSlug(nome);
  return documentos.some((documento) => documento.id !== ignorarId && !documento.get("excluidoEm") && gerarSlug(String(documento.get("nome") ?? "")) === chave);
}

// Confere a imagem escolhida para a categoria antes de gravar: sem imagem, a
// mesma que já estava gravada (mesmo na lixeira da biblioteca) ou uma imagem
// que existe e está fora da lixeira.
export async function imagemDaCategoriaValida(db: Firestore, colecao: string, id: string, escolhida: string | null): Promise<boolean> {
  const atual = await db.collection(colecao).doc(id).get();
  return escolhaDeMidiaValida(db, escolhida, atual.get("imagemMidiaId") ?? null);
}

const ROTULOS: Record<string, string> = { nome: "nome", ordem: "ordem", imagemMidiaId: "imagem" };

// Resumo da edição de uma categoria de artigo, em português, sem valores
// (nem o nome): "Categoria desativada.", "Categoria alterada: nome e imagem."
export function resumoDaEdicaoDaCategoria(campos: string[], ativaDepois: boolean): string {
  const partes: string[] = [];
  if (campos.includes("ativa")) partes.push(ativaDepois ? "Categoria ativada." : "Categoria desativada.");
  const outros = campos.filter((campo) => campo !== "ativa").map((campo) => ROTULOS[campo] ?? campo);
  if (outros.length) {
    const lista = outros.length === 1 ? outros[0] : `${outros.slice(0, -1).join(", ")} e ${outros[outros.length - 1]}`;
    partes.push(`Categoria alterada: ${lista}.`);
  }
  return partes.join(" ") || "Categoria salva sem alterações.";
}

export async function criarTopico(db: Firestore, tipo: TipoDeTopico, dados: { nome: string; ordem: number }, autor: AutorDaAlteracao): Promise<{ ok: true; id: string; mensagem: string } | Falha> {
  const colecao = db.collection(COLECOES_DE_TOPICOS[tipo]);
  try {
    // Coleção pequena: lida inteira dentro da transação, o que garante o slug
    // único mesmo com duas pessoas criando ao mesmo tempo.
    const id = await db.runTransaction(async (transacao) => {
      const existentes = await transacao.get(colecao);
      if (nomeRepetido(dados.nome, existentes.docs)) throw new RecusaDoTopico(TEXTOS[tipo].repetido);
      // Slugs de tópicos na lixeira continuam reservados (podem ser restaurados).
      const emUso = new Set(existentes.docs.map((documento) => String(documento.get("slug") ?? "")));
      const agora = new Date();
      const referencia = colecao.doc();
      transacao.create(referencia, { nome: dados.nome, slug: escolherSlugUnico(gerarSlug(dados.nome), emUso), ordem: dados.ordem, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
      if (comRegistro(tipo)) {
        registrarNaTransacao(db, transacao, autor, { colecao: COLECOES_DE_TOPICOS[tipo], documentoId: referencia.id, acao: "criar", campos: ["nome", "ordem"], resumo: "Categoria criada." });
      }
      return referencia.id;
    });
    return { ok: true, id, mensagem: `${TEXTOS[tipo].criado}: ${dados.nome}.` };
  } catch (erro) {
    return falha(erro);
  }
}

// Renomeia, muda a ordem e, nas categorias, a imagem; nas categorias de
// artigo, também o campo ativa. Campo ausente em "dados" fica como está. O
// slug não muda, para os endereços continuarem valendo. Como nos
// profissionais, toda edição salva registra, com os campos que mudaram
// (lista vazia quando nada mudou).
export async function atualizarTopico(
  db: Firestore,
  tipo: TipoDeTopico,
  id: string,
  dados: { nome: string; ordem: number; imagemMidiaId?: string | null; ativa?: boolean },
  autor: AutorDaAlteracao,
): Promise<{ ok: true } | Falha> {
  const nomeDaColecao = COLECOES_DE_TOPICOS[tipo];
  const colecao = db.collection(nomeDaColecao);
  if (dados.imagemMidiaId !== undefined && !(await imagemDaCategoriaValida(db, nomeDaColecao, id, dados.imagemMidiaId))) {
    return { ok: false, mensagem: MENSAGEM_IMAGEM_DA_CATEGORIA_INDISPONIVEL };
  }
  const novos: Record<string, unknown> = { nome: dados.nome, ordem: dados.ordem };
  if (dados.imagemMidiaId !== undefined) novos.imagemMidiaId = dados.imagemMidiaId;
  if (dados.ativa !== undefined && tipo === "categoria") novos.ativa = dados.ativa;
  try {
    await db.runTransaction(async (transacao) => {
      const existentes = await transacao.get(colecao);
      const atual = existentes.docs.find((documento) => documento.id === id);
      if (!atual) throw new RecusaDoTopico("Tópico não encontrado.");
      if (nomeRepetido(dados.nome, existentes.docs, id)) throw new RecusaDoTopico(TEXTOS[tipo].repetido);
      transacao.update(colecao.doc(id), { ...novos, atualizadoEm: new Date() });
      if (comRegistro(tipo)) {
        // Antes, como a tela vê: imagem ausente é null e ativa ausente é true.
        const antes: Record<string, unknown> = { nome: atual.get("nome"), ordem: atual.get("ordem"), imagemMidiaId: atual.get("imagemMidiaId") ?? null, ativa: lerAtiva(atual.get("ativa")) };
        const campos = Object.keys(novos).filter((campo) => JSON.stringify(antes[campo] ?? null) !== JSON.stringify(novos[campo] ?? null));
        registrarNaTransacao(db, transacao, autor, {
          colecao: nomeDaColecao,
          documentoId: id,
          acao: "editar",
          campos,
          resumo: resumoDaEdicaoDaCategoria(campos, novos.ativa === undefined ? lerAtiva(atual.get("ativa")) : Boolean(novos.ativa)),
        });
      }
    });
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

// Manda para a lixeira (excluir) ou tira dela (restaurar). Excluir: tópico
// usado por algum artigo ou produto não sai (uso conta mesmo em itens na
// lixeira, que podem ser restaurados). Restaurar: recusa se outro tópico
// ativo já usa o mesmo nome.
export async function marcarExclusaoDoTopico(db: Firestore, tipo: TipoDeTopico, id: string, excluir: boolean, autor: AutorDaAlteracao): Promise<{ ok: true; nome: string } | Falha> {
  const nomeDaColecao = COLECOES_DE_TOPICOS[tipo];
  const colecao = db.collection(nomeDaColecao);
  try {
    if (excluir) {
      const atual = await colecao.doc(id).get();
      if (!atual.exists) throw new RecusaDoTopico("Tópico não encontrado.");
      const emUso =
        tipo === "categoria"
          ? await db.collection("artigos").where("categoria", "==", id).limit(1).get()
          : tipo === "tag"
            ? await db.collection("artigos").where("tags", "array-contains", id).limit(1).get()
            : await db.collection("produtos").where("categoria", "==", id).limit(1).get();
      if (!emUso.empty) throw new RecusaDoTopico(`"${String(atual.get("nome") ?? "")}" ${TEXTOS[tipo].emUso}`);
    }
    const nome = await db.runTransaction(async (transacao) => {
      const existentes = await transacao.get(colecao);
      const documento = existentes.docs.find((item) => item.id === id);
      if (!documento) throw new RecusaDoTopico("Tópico não encontrado.");
      if (!excluir && nomeRepetido(String(documento.get("nome") ?? ""), existentes.docs, id)) {
        throw new RecusaDoTopico("Já existe um tópico ativo com esse nome. Renomeie um dos dois antes de restaurar.");
      }
      transacao.update(colecao.doc(id), { excluidoEm: excluir ? FieldValue.serverTimestamp() : null, atualizadoEm: new Date() });
      if (comRegistro(tipo)) {
        registrarNaTransacao(db, transacao, autor, {
          colecao: nomeDaColecao,
          documentoId: id,
          acao: excluir ? "excluir" : "restaurar",
          campos: ["excluidoEm"],
          resumo: excluir ? "Categoria movida para os excluídos." : "Categoria restaurada.",
        });
      }
      return String(documento.get("nome") ?? "");
    });
    return { ok: true, nome };
  } catch (erro) {
    return falha(erro);
  }
}
