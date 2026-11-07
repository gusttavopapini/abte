// Ações comuns de conteúdo do painel (04/11/2026): publicar e despublicar
// (ou ativar e desativar), mover para a lixeira, restaurar e excluir de vez,
// sempre com uma linha no registro de alterações na mesma transação.
// Sem sessão e sem "server-only", como as outras gravações: recebe o
// Firestore por parâmetro e é usada pelas ações de servidor (que conferem
// sessão e papel antes) e pelos testes no emulador.
//
// Excluir de vez apaga só o documento: as imagens continuam na biblioteca de
// mídia (decisão de 04/11/2026). Item em uso por outro é recusado.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { marcarExclusaoDoTopico, COLECOES_DE_TOPICOS } from "./topicos.ts";
import type { TipoDeTopico } from "../dados/tipos.ts";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { COLECAO_CARRINHOS } from "../loja/contas.ts";
import {
  type AcaoEmLote,
  type ResultadoDoLote,
  COLECOES_DO_PAINEL,
  MENSAGENS_DA_LIXEIRA,
  confirmacaoDeExclusaoValida,
  mensagemDeUso,
  nomeDoItem,
  resumoDaAcao,
  type ColecaoDoPainel,
  type UsoQueImpede,
} from "../lixeira.ts";

export type ResultadoDaAcao = { ok: true; nome: string; mudou: boolean; avisos?: string[] } | { ok: false; mensagem: string };

function tipoDoTopico(colecao: ColecaoDoPainel): TipoDeTopico | undefined {
  return (Object.keys(COLECOES_DE_TOPICOS) as TipoDeTopico[]).find((tipo) => COLECOES_DE_TOPICOS[tipo] === colecao);
}

// Erro com mensagem para a tela, lançado dentro da transação.
class Recusa extends Error {}

async function emTransacao(executar: () => Promise<ResultadoDaAcao>): Promise<ResultadoDaAcao> {
  try {
    return await executar();
  } catch (erro) {
    if (erro instanceof Recusa) return { ok: false, mensagem: erro.message };
    throw erro;
  }
}

// Publica ou despublica (ativa ou desativa) sem abrir o formulário. Item na
// lixeira é recusado: precisa ser restaurado antes. Item já na situação
// pedida não grava nada.
export async function mudarSituacao(db: Firestore, colecao: ColecaoDoPainel, id: string, publicar: boolean, autor: AutorDaAlteracao): Promise<ResultadoDaAcao> {
  const regra = COLECOES_DO_PAINEL[colecao].situacao;
  if (!regra) return { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.semSituacao };
  const referencia = db.collection(colecao).doc(id);
  return emTransacao(() =>
    db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new Recusa(MENSAGENS_DA_LIXEIRA.naoEncontrado);
      const dados = atual.data() ?? {};
      if (dados.excluidoEm) throw new Recusa(MENSAGENS_DA_LIXEIRA.naLixeira);
      const nome = nomeDoItem(colecao, dados);
      if (regra.publicado(dados) === publicar) return { ok: true as const, nome, mudou: false };
      transacao.update(referencia, { [regra.campo]: regra.valor(publicar), atualizadoEm: new Date() });
      registrarNaTransacao(db, transacao, autor, { colecao, documentoId: id, acao: "editar", campos: [regra.campo], resumo: resumoDaAcao(colecao, publicar ? "ligar" : "desligar") });
      return { ok: true as const, nome, mudou: true };
    }),
  );
}

// Move para a lixeira (excluidoEm preenchido). Posts e artigos também viram
// rascunho, para saírem do site público sem mudar o código dele.
export async function moverParaLixeira(db: Firestore, colecao: ColecaoDoPainel, id: string, autor: AutorDaAlteracao): Promise<ResultadoDaAcao> {
  const tipo = tipoDoTopico(colecao);
  if (tipo) {
    const resultado = await marcarExclusaoDoTopico(db, tipo, id, true, autor);
    return resultado.ok ? { ...resultado, mudou: true } : resultado;
  }
  const configuracao = COLECOES_DO_PAINEL[colecao];
  const referencia = db.collection(colecao).doc(id);
  return emTransacao(() =>
    db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new Recusa(MENSAGENS_DA_LIXEIRA.naoEncontrado);
      const dados = atual.data() ?? {};
      const nome = nomeDoItem(colecao, dados);
      if (dados.excluidoEm) return { ok: true as const, nome, mudou: false };
      const campos: Record<string, unknown> = { excluidoEm: FieldValue.serverTimestamp(), atualizadoEm: new Date() };
      if (configuracao.rascunhoNaLixeira && configuracao.situacao && configuracao.situacao.publicado(dados)) {
        campos[configuracao.situacao.campo] = configuracao.situacao.valor(false);
      }
      transacao.update(referencia, campos);
      registrarNaTransacao(db, transacao, autor, {
        colecao,
        documentoId: id,
        acao: "excluir",
        campos: Object.keys(campos).filter((campo) => campo !== "atualizadoEm"),
        resumo: resumoDaAcao(colecao, "lixeira"),
      });
      return { ok: true as const, nome, mudou: true };
    }),
  );
}

// Tira da lixeira. Posts e artigos voltam como rascunho (não são publicados
// de novo sozinhos).
export async function restaurarDaLixeira(db: Firestore, colecao: ColecaoDoPainel, id: string, autor: AutorDaAlteracao): Promise<ResultadoDaAcao> {
  const tipo = tipoDoTopico(colecao);
  if (tipo) {
    const resultado = await marcarExclusaoDoTopico(db, tipo, id, false, autor);
    return resultado.ok ? { ...resultado, mudou: true } : resultado;
  }
  const referencia = db.collection(colecao).doc(id);
  return emTransacao(() =>
    db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new Recusa(MENSAGENS_DA_LIXEIRA.naoEncontrado);
      const dados = atual.data() ?? {};
      const nome = nomeDoItem(colecao, dados);
      if (!dados.excluidoEm) return { ok: true as const, nome, mudou: false };
      transacao.update(referencia, { excluidoEm: null, atualizadoEm: new Date() });
      registrarNaTransacao(db, transacao, autor, { colecao, documentoId: id, acao: "restaurar", campos: ["excluidoEm"], resumo: resumoDaAcao(colecao, "restaurar") });
      return { ok: true as const, nome, mudou: true };
    }),
  );
}

// Onde cada coleção pode estar em uso. Conta também os itens que estão na
// lixeira (restaurados, ficariam com o vínculo quebrado).
type Vinculo = { colecao: string; campo: string; lista: boolean; onde: string; campoDoNome: string };

const VINCULOS: Partial<Record<ColecaoDoPainel, Vinculo[]>> = {
  categoriasDePosts: [{ colecao: "posts", campo: "categoria", lista: false, onde: "post(s)", campoDoNome: "titulo" }],
  tagsDePosts: [{ colecao: "posts", campo: "tags", lista: true, onde: "post(s)", campoDoNome: "titulo" }],
  categoriasDeArtigos: [{ colecao: "artigos", campo: "categoria", lista: false, onde: "artigo(s)", campoDoNome: "titulo" }],
  tagsDeArtigos: [{ colecao: "artigos", campo: "tags", lista: true, onde: "artigo(s)", campoDoNome: "titulo" }],
  categoriasDeProdutos: [{ colecao: "produtos", campo: "categoria", lista: false, onde: "produto(s)", campoDoNome: "nome" }],
  profissionais: [
    { colecao: "diretoria", campo: "profissionalId", lista: false, onde: "membro(s) da diretoria", campoDoNome: "cargo" },
    { colecao: "posts", campo: "autorProfissionalId", lista: false, onde: "post(s) como autor", campoDoNome: "titulo" },
  ],
};

const EXEMPLOS = 3;

export async function usosQueImpedemExclusao(db: Firestore, colecao: ColecaoDoPainel, id: string): Promise<UsoQueImpede[]> {
  const usos: UsoQueImpede[] = [];
  for (const vinculo of VINCULOS[colecao] ?? []) {
    const consulta = db.collection(vinculo.colecao).where(vinculo.campo, vinculo.lista ? "array-contains" : "==", id);
    const documentos = (await consulta.get()).docs;
    if (documentos.length === 0) continue;
    const exemplos = documentos.slice(0, EXEMPLOS).map((documento) => {
      const nome = documento.get(vinculo.campoDoNome);
      return typeof nome === "string" && nome.trim() ? nome.trim() : "sem título";
    });
    usos.push({ onde: vinculo.onde, quantidade: documentos.length, exemplos });
  }
  return usos;
}

// Avisos que não impedem a exclusão (decisão de 04/11/2026): produto guardado
// no carrinho de clientes. O carrinho guarda só id e quantidade e já mostra
// como indisponível o produto que saiu da loja.
export async function avisosAntesDeExcluir(db: Firestore, colecao: ColecaoDoPainel, id: string): Promise<string[]> {
  if (colecao !== "produtos") return [];
  const carrinhos = (await db.collection(COLECAO_CARRINHOS).get()).docs;
  const comProduto = carrinhos.filter((carrinho) => {
    const itens = carrinho.get("itens");
    return Array.isArray(itens) && itens.some((item) => item && typeof item === "object" && (item as { produtoId?: unknown }).produtoId === id);
  }).length;
  return comProduto > 0 ? [`Este produto está guardado no carrinho de ${comProduto} cliente(s). Lá ele vai aparecer como indisponível.`] : [];
}

// Apaga o documento de vez: só item que já está na lixeira, com a
// confirmação reforçada (EXCLUIR ou o nome) e sem uso por outro item.
// As imagens ficam na biblioteca.
export async function excluirDeVez(db: Firestore, colecao: ColecaoDoPainel, id: string, confirmacao: unknown, autor: AutorDaAlteracao): Promise<ResultadoDaAcao> {
  const referencia = db.collection(colecao).doc(id);
  const antes = await referencia.get();
  if (!antes.exists) return { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naoEncontrado };
  if (!antes.get("excluidoEm")) return { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.soDaLixeira };
  const nome = nomeDoItem(colecao, antes.data() ?? {});
  if (!confirmacaoDeExclusaoValida(confirmacao, nome)) return { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.confirmacao };
  const usos = await usosQueImpedemExclusao(db, colecao, id);
  if (usos.length > 0) return { ok: false, mensagem: mensagemDeUso(usos) };
  const avisos = await avisosAntesDeExcluir(db, colecao, id);

  return emTransacao(() =>
    db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new Recusa(MENSAGENS_DA_LIXEIRA.naoEncontrado);
      // Restaurado por outra pessoa entre a conferência e a exclusão.
      if (!atual.get("excluidoEm")) throw new Recusa(MENSAGENS_DA_LIXEIRA.soDaLixeira);
      const nomeAtual = nomeDoItem(colecao, atual.data() ?? {});
      if (!confirmacaoDeExclusaoValida(confirmacao, nomeAtual)) throw new Recusa(MENSAGENS_DA_LIXEIRA.confirmacao);
      transacao.delete(referencia);
      registrarNaTransacao(db, transacao, autor, { colecao, documentoId: id, acao: "excluir_definitivo", campos: [], resumo: resumoDaAcao(colecao, "excluirDeVez") });
      return { ok: true as const, nome: nomeAtual, mudou: true, avisos };
    }),
  );
}

// Ações em lote (etapa 2, 04/11/2026): despublicar, mover para a lixeira ou
// restaurar vários itens, um por vez (cada um com a própria transação e a
// própria linha no registro). O que falha não impede os outros; o resultado
// diz quem mudou, quem já estava assim e quem falhou (com o motivo).
export async function aplicarEmLote(db: Firestore, colecao: ColecaoDoPainel, ids: string[], acao: AcaoEmLote, autor: AutorDaAlteracao): Promise<ResultadoDoLote> {
  const resultado: ResultadoDoLote = { feitos: [], semMudanca: [], falhas: [] };
  for (const id of ids) {
    try {
      const resposta =
        acao === "despublicar" ? await mudarSituacao(db, colecao, id, false, autor) : acao === "lixeira" ? await moverParaLixeira(db, colecao, id, autor) : await restaurarDaLixeira(db, colecao, id, autor);
      if (!resposta.ok) {
        const documento = await db.collection(colecao).doc(id).get();
        resultado.falhas.push({ nome: documento.exists ? nomeDoItem(colecao, documento.data() ?? {}) : "Item não encontrado", motivo: resposta.mensagem });
      } else if (resposta.mudou) resultado.feitos.push(resposta.nome);
      else resultado.semMudanca.push(resposta.nome);
    } catch (erro) {
      // A falha deste item não esconde o resultado dos anteriores nem impede os seguintes.
      console.error("Falha em item de uma ação em lote:", erro);
      resultado.falhas.push({ nome: `Item ${id}`, motivo: "Não foi possível concluir este item. Tente novamente." });
    }
  }
  return resultado;
}
