"use server";

// Ações do painel para os pedidos e o frete da loja (08/11/2026). Só o
// administrador (tabela PERMISSOES); cada uma começa pela checagem de sessão
// e papel e grava com o registro de alterações.
import { revalidatePath } from "next/cache";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { gravarFreteFixo, marcarEnvioDoPedido } from "@/lib/loja/pedidos";
import { lerPrecoEmCentavos } from "@/lib/produtos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDoPainelDaLoja = { ok: boolean; mensagem: string } | null;

export async function marcarEnvio(_anterior: RespostaDoPainelDaLoja, dados: FormData): Promise<RespostaDoPainelDaLoja> {
  const usuario = await exigirPapelDoPainel("pedidos.editar");
  const pedidoId = dados.get("pedidoId");
  const situacao = dados.get("situacao");
  if (!ehIdDeDocumentoValido(pedidoId)) return { ok: false, mensagem: "Pedido não encontrado." };
  if (situacao !== "enviado" && situacao !== "entregue") return { ok: false, mensagem: "Escolha enviado ou entregue." };
  try {
    const erro = await marcarEnvioDoPedido(firestoreAdmin(), pedidoId, situacao, autorDaAlteracao(usuario));
    if (erro) return { ok: false, mensagem: erro };
  } catch (falha) {
    console.error(`Pedido ${pedidoId}: falha ao marcar o envio.`, falha instanceof Error ? falha.message : falha);
    return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
  }
  revalidatePath("/admin/pedidos", "layout");
  return { ok: true, mensagem: situacao === "enviado" ? "Pedido marcado como enviado." : "Pedido marcado como entregue." };
}

// Frete fixo em reais (vazio: sem valor, frete combinado pela ABTE).
export async function salvarFrete(_anterior: RespostaDoPainelDaLoja, dados: FormData): Promise<RespostaDoPainelDaLoja> {
  const usuario = await exigirPapelDoPainel("loja.configurar");
  const entrada = dados.get("frete");
  const texto = typeof entrada === "string" ? entrada : "";
  const centavos = lerPrecoEmCentavos(texto);
  if (centavos === null) return { ok: false, mensagem: "Digite o frete em reais, por exemplo 25,00, ou deixe vazio." };
  try {
    await gravarFreteFixo(firestoreAdmin(), centavos ?? null, autorDaAlteracao(usuario));
  } catch (falha) {
    console.error("Frete da loja: falha ao salvar.", falha instanceof Error ? falha.message : falha);
    return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
  }
  revalidatePath("/admin/loja/frete");
  revalidatePath("/loja", "layout");
  return { ok: true, mensagem: centavos === undefined ? "Frete removido: os pedidos com produto físico mostram \"Frete combinado pela ABTE após a compra\"." : "Frete salvo." };
}
