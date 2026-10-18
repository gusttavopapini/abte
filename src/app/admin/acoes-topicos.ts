"use server";

// Ações de servidor dos tópicos: categorias e tags dos artigos e categorias
// de produto da loja.
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
// As respostas trazem a mensagem para a tela, sempre em português.
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { COLECAO_DE_TOPICOS } from "@/lib/dados/colecoes";
import type { TipoDeTopico } from "@/lib/dados/tipos";
import { escolherSlugUnico, gerarSlug } from "@/lib/slug";
import { MENSAGEM_IMAGEM_DA_CATEGORIA_INDISPONIVEL, imagemDaCategoriaValida } from "@/lib/gravacao/topicos";
import { lerIdDaMidiaEscolhida } from "@/lib/midia/regras";
import { ehIdDeDocumentoValido, lerInteiroDoFormulario, lerTextoDoFormulario } from "@/lib/validacao";

export type RespostaDoTopico = { ok: boolean; mensagem: string };

const LIMITE_NOME_TOPICO = 60;
const ORDEM_MAXIMA = 999;

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

// Mensagem de erro de validação (lançada por nós, em português) ou genérica.
class ErroDeValidacao extends Error {}

function lerTipo(dados: FormData): TipoDeTopico {
  const tipo = dados.get("tipo");
  if (tipo === "categoria" || tipo === "tag" || tipo === "categoriaDeProduto") return tipo;
  throw new ErroDeValidacao("Tipo de tópico desconhecido.");
}

function lerId(dados: FormData): string {
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) throw new ErroDeValidacao("Tópico não encontrado.");
  return id;
}

function lerNome(dados: FormData): string {
  let nome: string;
  try {
    nome = lerTextoDoFormulario(dados, "nome", { rotulo: "Nome", limite: LIMITE_NOME_TOPICO }).trim();
  } catch (erro) {
    throw new ErroDeValidacao(erro instanceof Error ? erro.message : "Nome inválido.");
  }
  if (!nome) throw new ErroDeValidacao("Preencha o nome.");
  if (!gerarSlug(nome)) throw new ErroDeValidacao("O nome precisa ter pelo menos uma letra ou um número.");
  return nome;
}

function lerOrdem(dados: FormData): number {
  try {
    return lerInteiroDoFormulario(dados, "ordem", { rotulo: "Ordem", minimo: 0, maximo: ORDEM_MAXIMA, padrao: 0 });
  } catch (erro) {
    throw new ErroDeValidacao(erro instanceof Error ? erro.message : "Ordem inválida.");
  }
}

// Só as categorias (de artigos e de produtos) têm imagem; tags não.
function temImagem(tipo: TipoDeTopico): boolean {
  return tipo === "categoria" || tipo === "categoriaDeProduto";
}

// Imagem da categoria (campo escondido do seletor de mídia): vazio vira null.
function lerImagem(dados: FormData): string | null {
  const imagem = lerIdDaMidiaEscolhida(dados.get("imagemMidiaId"));
  if (!imagem.ok) throw new ErroDeValidacao("Imagem inválida. Escolha a imagem de novo.");
  return imagem.id;
}

// Converte qualquer falha em resposta para a tela, sem expor detalhe técnico.
function respostaDeErro(erro: unknown): RespostaDoTopico {
  if (erro instanceof ErroDeValidacao) return { ok: false, mensagem: erro.message };
  console.error("Falha ao gravar tópico de artigo:", erro);
  return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
}

function atualizarPaginas() {
  revalidatePath("/admin/artigos/topicos");
  revalidatePath("/admin/artigos");
  revalidatePath("/artigos");
  revalidatePath("/artigos/categoria/[slug]", "page");
  revalidatePath("/artigos/[slug]", "page");
  revalidatePath("/admin/loja/categorias");
  revalidatePath("/loja");
  revalidatePath("/admin/midia");
}

// Dois tópicos ativos com o mesmo nome (ignorando acento e maiúsculas) confundem
// quem navega; o nome repetido é recusado.
function nomeRepetido(nome: string, documentos: FirebaseFirestore.QueryDocumentSnapshot[], ignorarId?: string): boolean {
  const chave = gerarSlug(nome);
  return documentos.some(
    (documento) => documento.id !== ignorarId && !documento.get("excluidoEm") && gerarSlug(String(documento.get("nome") ?? "")) === chave,
  );
}

export async function criarTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  await exigirPapelDoPainel();
  try {
    const tipo = lerTipo(dados);
    const nome = lerNome(dados);
    const ordem = lerOrdem(dados);
    const db = firestoreAdmin();
    const colecao = db.collection(COLECAO_DE_TOPICOS[tipo]);

    // Coleção pequena: lida inteira dentro da transação, o que garante o slug
    // único mesmo com duas pessoas criando ao mesmo tempo.
    await db.runTransaction(async (transacao) => {
      const existentes = await transacao.get(colecao);
      if (nomeRepetido(nome, existentes.docs)) {
        throw new ErroDeValidacao(TEXTOS[tipo].repetido);
      }
      // Slugs de tópicos na lixeira continuam reservados (podem ser restaurados).
      const emUso = new Set(existentes.docs.map((documento) => String(documento.get("slug") ?? "")));
      const agora = new Date();
      transacao.create(colecao.doc(), {
        nome,
        slug: escolherSlugUnico(gerarSlug(nome), emUso),
        ordem,
        criadoEm: agora,
        atualizadoEm: agora,
        excluidoEm: null,
      });
    });

    atualizarPaginas();
    return { ok: true, mensagem: `${TEXTOS[tipo].criado}: ${nome}.` };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

// Renomeia, muda a ordem e, nas categorias, a imagem. O slug não muda, para os
// endereços continuarem valendo.
export async function atualizarTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  await exigirPapelDoPainel();
  try {
    const tipo = lerTipo(dados);
    const id = lerId(dados);
    const nome = lerNome(dados);
    const ordem = lerOrdem(dados);
    const db = firestoreAdmin();
    const colecao = db.collection(COLECAO_DE_TOPICOS[tipo]);
    // Tags não têm imagem: o campo nem é gravado. Nas categorias, só quando o
    // formulário traz o campo (sem ele, a imagem gravada fica como está).
    let imagem: { imagemMidiaId?: string | null } = {};
    if (temImagem(tipo) && dados.has("imagemMidiaId")) {
      const imagemMidiaId = lerImagem(dados);
      if (!(await imagemDaCategoriaValida(db, COLECAO_DE_TOPICOS[tipo], id, imagemMidiaId))) {
        throw new ErroDeValidacao(MENSAGEM_IMAGEM_DA_CATEGORIA_INDISPONIVEL);
      }
      imagem = { imagemMidiaId };
    }

    await db.runTransaction(async (transacao) => {
      const existentes = await transacao.get(colecao);
      if (!existentes.docs.some((documento) => documento.id === id)) throw new ErroDeValidacao("Tópico não encontrado.");
      if (nomeRepetido(nome, existentes.docs, id)) {
        throw new ErroDeValidacao(TEXTOS[tipo].repetido);
      }
      transacao.update(colecao.doc(id), { nome, ordem, ...imagem, atualizadoEm: new Date() });
    });

    atualizarPaginas();
    return { ok: true, mensagem: "Alterações salvas." };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

// Manda para a lixeira (excluidoEm). Tópico usado por algum artigo não sai:
// antes é preciso trocar o tópico desses artigos.
export async function excluirTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  await exigirPapelDoPainel();
  try {
    const tipo = lerTipo(dados);
    const id = lerId(dados);
    const db = firestoreAdmin();
    const referencia = db.collection(COLECAO_DE_TOPICOS[tipo]).doc(id);
    const atual = await referencia.get();
    if (!atual.exists) throw new ErroDeValidacao("Tópico não encontrado.");
    const nome = String(atual.get("nome") ?? "");
    // Uso conta mesmo em itens na lixeira, que podem ser restaurados.
    const emUso =
      tipo === "categoria"
        ? await db.collection("artigos").where("categoria", "==", id).limit(1).get()
        : tipo === "tag"
          ? await db.collection("artigos").where("tags", "array-contains", id).limit(1).get()
          : await db.collection("produtos").where("categoria", "==", id).limit(1).get();
    if (!emUso.empty) {
      throw new ErroDeValidacao(`"${nome}" ${TEXTOS[tipo].emUso}`);
    }

    await db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referencia);
      if (!documento.exists) throw new ErroDeValidacao("Tópico não encontrado.");
      transacao.update(referencia, { excluidoEm: FieldValue.serverTimestamp(), atualizadoEm: new Date() });
    });

    atualizarPaginas();
    return { ok: true, mensagem: `"${nome}" foi para os excluídos. Dá para restaurar abaixo.` };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

// Tira da lixeira. Se outro tópico ativo já usa o mesmo nome, recusa.
export async function restaurarTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  await exigirPapelDoPainel();
  try {
    const tipo = lerTipo(dados);
    const id = lerId(dados);
    const db = firestoreAdmin();
    const colecao = db.collection(COLECAO_DE_TOPICOS[tipo]);

    const nome = await db.runTransaction(async (transacao) => {
      const existentes = await transacao.get(colecao);
      const documento = existentes.docs.find((item) => item.id === id);
      if (!documento) throw new ErroDeValidacao("Tópico não encontrado.");
      if (nomeRepetido(String(documento.get("nome") ?? ""), existentes.docs, id)) {
        throw new ErroDeValidacao("Já existe um tópico ativo com esse nome. Renomeie um dos dois antes de restaurar.");
      }
      transacao.update(colecao.doc(id), { excluidoEm: null, atualizadoEm: new Date() });
      return String(documento.get("nome") ?? "");
    });

    atualizarPaginas();
    return { ok: true, mensagem: `"${nome}" foi restaurado.` };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
