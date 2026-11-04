"use server";

// Ações de servidor dos produtos da loja (só cadastro: não há pagamento).
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
// As respostas trazem a mensagem para a tela (e os erros de cada campo), em português.
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { gravarProduto } from "@/lib/gravacao/produtos";
import { completarDonoDasMidias } from "@/lib/midia/biblioteca";
import { validarProduto, type CampoDoProduto } from "@/lib/produtos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDoProduto = {
  ok: boolean;
  mensagem: string;
  erros?: Partial<Record<CampoDoProduto, string>>;
};

function atualizarPaginas() {
  revalidatePath("/admin/loja");
  revalidatePath("/loja", "layout");
  revalidatePath("/admin/midia");
}

// Cria (sem id) ou atualiza (com id). A gravação (slug único, conferência da
// categoria e das imagens e o registro de alterações) fica em
// src/lib/gravacao/produtos.ts. Lixeira, restaurar, excluir de vez,
// publicar e duplicar ficam nas ações comuns (acoes-lixeira.ts).
export async function salvarProduto(_anterior: RespostaDoProduto | null, dados: FormData): Promise<RespostaDoProduto> {
  const usuario = await exigirPapelDoPainel("conteudo.editar");
  const id = dados.get("id");
  if (id !== null && id !== "" && !ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Produto não encontrado." };

  const resultado = validarProduto(dados);
  if (!resultado.ok) return { ok: false, mensagem: "Confira os campos marcados.", erros: resultado.erros };
  const produto = resultado.dados;

  try {
    const db = firestoreAdmin();
    const gravado = await gravarProduto(db, typeof id === "string" && id ? id : null, produto, autorDaAlteracao(usuario));
    if (!gravado.ok) return gravado.campo ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } } : { ok: false, mensagem: gravado.mensagem };
    // Imagens enviadas pelo formulário de um produto novo: recebem o id agora
    // (lib/midia/dono.ts). Falha aqui não desfaz o cadastro.
    await completarDonoDasMidias(db, produto.imagens.map((imagem) => imagem.midiaId), "produto", "galeria", gravado.id, autorDaAlteracao(usuario)).catch((erro: unknown) =>
      console.error("Falha ao ligar as imagens ao produto salvo:", erro),
    );
  } catch (erro) {
    console.error("Falha ao salvar produto:", erro);
    return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
  }

  atualizarPaginas();
  return { ok: true, mensagem: `"${produto.nome}" foi salvo.` };
}
