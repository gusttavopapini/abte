"use server";

// Ações de servidor dos produtos da loja (só cadastro: não há pagamento).
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
// As respostas trazem a mensagem para a tela (e os erros de cada campo), em português.
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { COLECAO_DE_TOPICOS } from "@/lib/dados/colecoes";
import { validarProduto, type CampoDoProduto } from "@/lib/produtos";
import { escolherSlugUnico, gerarSlug } from "@/lib/slug";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDoProduto = {
  ok: boolean;
  mensagem: string;
  erros?: Partial<Record<CampoDoProduto, string>>;
};

class ErroDeValidacao extends Error {}

function atualizarPaginas() {
  revalidatePath("/admin/loja");
  revalidatePath("/loja", "layout");
}

// Cria (sem id) ou atualiza (com id). O slug é criado com o nome, único entre
// todos os produtos (inclusive os da lixeira), e não muda ao renomear.
export async function salvarProduto(_anterior: RespostaDoProduto | null, dados: FormData): Promise<RespostaDoProduto> {
  await exigirPapelDoPainel();
  const id = dados.get("id");
  if (id !== null && id !== "" && !ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Produto não encontrado." };

  const resultado = validarProduto(dados);
  if (!resultado.ok) return { ok: false, mensagem: "Confira os campos marcados.", erros: resultado.erros };
  const produto = resultado.dados;

  try {
    const db = firestoreAdmin();
    const categoria = await db.collection(COLECAO_DE_TOPICOS.categoriaDeProduto).doc(produto.categoria).get();
    if (!categoria.exists || categoria.get("excluidoEm")) {
      return { ok: false, mensagem: "Confira os campos marcados.", erros: { categoria: "Esta categoria não existe mais. Escolha outra." } };
    }

    const colecao = db.collection("produtos");
    const agora = new Date();
    await db.runTransaction(async (transacao) => {
      if (typeof id === "string" && id) {
        const atual = await transacao.get(colecao.doc(id));
        if (!atual.exists) throw new ErroDeValidacao("Produto não encontrado.");
        transacao.update(colecao.doc(id), { ...produto, atualizadoEm: agora });
        return;
      }
      // Coleção pequena: lida inteira na transação, o que garante o slug único.
      const existentes = await transacao.get(colecao);
      const emUso = new Set(existentes.docs.map((documento) => String(documento.get("slug") ?? "")));
      const slug = escolherSlugUnico(gerarSlug(produto.nome) || "produto", emUso);
      transacao.create(colecao.doc(), { ...produto, slug, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
    });
  } catch (erro) {
    if (erro instanceof ErroDeValidacao) return { ok: false, mensagem: erro.message };
    console.error("Falha ao salvar produto:", erro);
    return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
  }

  atualizarPaginas();
  return { ok: true, mensagem: `"${produto.nome}" foi salvo.` };
}

// Preenche (exclui) ou limpa (restaura) o campo excluidoEm. Nada é apagado de vez.
async function marcarExclusao(dados: FormData, excluir: boolean): Promise<RespostaDoProduto> {
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Produto não encontrado." };
  try {
    const referencia = firestoreAdmin().collection("produtos").doc(id);
    const atual = await referencia.get();
    if (!atual.exists) return { ok: false, mensagem: "Produto não encontrado." };
    await referencia.update({ excluidoEm: excluir ? FieldValue.serverTimestamp() : null, atualizadoEm: new Date() });
    atualizarPaginas();
    const nome = String(atual.get("nome") ?? "");
    return { ok: true, mensagem: excluir ? `"${nome}" foi para os excluídos e saiu da loja.` : `"${nome}" foi restaurado.` };
  } catch (erro) {
    console.error("Falha ao excluir ou restaurar produto:", erro);
    return { ok: false, mensagem: excluir ? "Não foi possível excluir agora. Tente de novo em instantes." : "Não foi possível restaurar agora. Tente de novo em instantes." };
  }
}

export async function excluirProduto(_anterior: RespostaDoProduto | null, dados: FormData): Promise<RespostaDoProduto> {
  await exigirPapelDoPainel();
  return marcarExclusao(dados, true);
}

export async function restaurarProduto(_anterior: RespostaDoProduto | null, dados: FormData): Promise<RespostaDoProduto> {
  await exigirPapelDoPainel();
  return marcarExclusao(dados, false);
}
