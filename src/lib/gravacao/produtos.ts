// Gravação dos produtos da loja no Firestore. Sem sessão e sem "server-only",
// como os outros módulos de gravação: usada por acoes-produtos.ts e
// acoes-lixeira.ts (que conferem sessão e papel antes) e pelos testes no
// emulador. Desde 04/11/2026, criar, editar e duplicar gravam no registro de
// alterações na mesma transação. Não há pagamento: preço é só informação.
import type { Firestore } from "firebase-admin/firestore";
import { camposAlterados, registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA } from "../lixeira.ts";
import { escolhasDeMidiaValidas, midiaPodeSerEscolhida } from "../midia/biblioteca.ts";
import type { DadosDoProduto, ImagemDoProduto } from "../produtos.ts";
import { escolherSlugUnico, gerarSlug } from "../slug.ts";

export const COLECAO_PRODUTOS = "produtos";
const COLECAO_CATEGORIAS = "categoriasDeProdutos";
const LIMITE_DO_NOME = 120;

export const MENSAGEM_IMAGEM_DO_PRODUTO_INDISPONIVEL = "Uma das imagens escolhidas não está mais na biblioteca (foi para a lixeira ou excluída). Remova-a ou escolha outra.";
export const MENSAGEM_CATEGORIA_DO_PRODUTO_INDISPONIVEL = "Esta categoria não existe mais. Escolha outra.";

// Imagens novas da galeria precisam existir e estar fora da lixeira; as que
// já estavam gravadas no produto podem ficar (voltam se forem restauradas).
// Ids repetidos e o limite são conferidos antes, em lerImagensDoProduto.
export async function imagensDoProdutoValidas(db: Firestore, id: string | null, imagens: ImagemDoProduto[]): Promise<boolean> {
  const gravadas = id ? (await db.collection(COLECAO_PRODUTOS).doc(id).get()).get("imagens") : [];
  const anteriores = Array.isArray(gravadas) ? gravadas.map((imagem) => String(imagem?.midiaId ?? "")) : [];
  return escolhasDeMidiaValidas(db, imagens.map((imagem) => imagem.midiaId), anteriores);
}

type Falha = { ok: false; mensagem: string; campo?: "categoria" | "imagens" };

// Cria (id null) ou atualiza um produto. O slug é criado com o nome, único
// entre todos os produtos (inclusive os da lixeira), e não muda ao renomear.
export async function gravarProduto(
  db: Firestore,
  id: string | null,
  produto: DadosDoProduto,
  autor: AutorDaAlteracao,
  resumoDoRegistro?: string,
): Promise<{ ok: true; id: string } | Falha> {
  const categoria = await db.collection(COLECAO_CATEGORIAS).doc(produto.categoria).get();
  if (!categoria.exists || categoria.get("excluidoEm")) return { ok: false, mensagem: MENSAGEM_CATEGORIA_DO_PRODUTO_INDISPONIVEL, campo: "categoria" };
  if (!(await imagensDoProdutoValidas(db, id, produto.imagens))) return { ok: false, mensagem: MENSAGEM_IMAGEM_DO_PRODUTO_INDISPONIVEL, campo: "imagens" };

  const colecao = db.collection(COLECAO_PRODUTOS);
  const referencia = id ? colecao.doc(id) : colecao.doc();
  const agora = new Date();
  return db.runTransaction(async (transacao) => {
    if (id) {
      const atual = await transacao.get(referencia);
      if (!atual.exists) return { ok: false as const, mensagem: "Produto não encontrado." };
      // Na lixeira, só se salva fora da loja: publicar exige restaurar antes.
      if (atual.get("excluidoEm") && produto.publicado) return { ok: false as const, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira };
      transacao.update(referencia, { ...produto, atualizadoEm: agora });
      registrarNaTransacao(db, transacao, autor, { colecao: COLECAO_PRODUTOS, documentoId: referencia.id, acao: "editar", campos: camposAlterados(atual.data() ?? {}, produto), resumo: resumoDoRegistro ?? "Produto alterado." });
      return { ok: true as const, id: referencia.id };
    }
    // Coleção pequena: lida inteira na transação, o que garante o slug único.
    const existentes = await transacao.get(colecao);
    const emUso = new Set(existentes.docs.map((documento) => String(documento.get("slug") ?? "")));
    const slug = escolherSlugUnico(gerarSlug(produto.nome) || "produto", emUso);
    transacao.create(referencia, { ...produto, slug, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
    registrarNaTransacao(db, transacao, autor, { colecao: COLECAO_PRODUTOS, documentoId: referencia.id, acao: "criar", campos: [...Object.keys(produto), "slug"], resumo: resumoDoRegistro ?? "Produto criado." });
    return { ok: true as const, id: referencia.id };
  });
}

// Duplica um produto (04/11/2026): cópia fora da loja (não publicada),
// "Cópia de ...", slug novo, sem dados da migração. A categoria é
// obrigatória: se a do original não está mais disponível, a cópia é recusada.
// Só as imagens ainda disponíveis vão junto (apontam para as mesmas da
// biblioteca, sem copiar arquivos).
export async function duplicarProduto(db: Firestore, id: string, autor: AutorDaAlteracao): Promise<{ ok: true; id: string; nome: string } | Falha> {
  const original = await db.collection(COLECAO_PRODUTOS).doc(id).get();
  if (!original.exists) return { ok: false, mensagem: "Produto não encontrado." };
  const campos = original.data() ?? {};
  const imagensOriginais: ImagemDoProduto[] = (Array.isArray(campos.imagens) ? campos.imagens : []).filter(
    (imagem): imagem is ImagemDoProduto => Boolean(imagem) && typeof imagem.midiaId === "string" && typeof imagem.ordem === "number",
  );
  const disponiveis: ImagemDoProduto[] = [];
  for (const imagem of imagensOriginais) if (await midiaPodeSerEscolhida(db, imagem.midiaId)) disponiveis.push(imagem);
  const nome = `Cópia de ${String(campos.nome ?? "")}`.slice(0, LIMITE_DO_NOME).trim();
  const dados: DadosDoProduto = {
    nome,
    descricao: String(campos.descricao ?? ""),
    preco: typeof campos.preco === "number" ? campos.preco : 0,
    precoPromocional: typeof campos.precoPromocional === "number" ? campos.precoPromocional : null,
    categoria: String(campos.categoria ?? ""),
    tipo: campos.tipo === "digital" ? "digital" : "fisico",
    status: campos.status === "esgotado" ? "esgotado" : "disponivel",
    selo: String(campos.selo ?? ""),
    ordem: typeof campos.ordem === "number" ? campos.ordem : 0,
    publicado: false,
    imagens: disponiveis.map((imagem, indice) => ({ midiaId: imagem.midiaId, ordem: indice })),
  };
  if (!dados.categoria) return { ok: false, mensagem: MENSAGEM_CATEGORIA_DO_PRODUTO_INDISPONIVEL, campo: "categoria" };
  const gravado = await gravarProduto(db, null, dados, autor, "Produto duplicado fora da loja.");
  return gravado.ok ? { ok: true, id: gravado.id, nome } : gravado;
}
