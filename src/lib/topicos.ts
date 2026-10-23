// Regras puras do campo ativa das categorias de artigo (decisão de
// 23/10/2026, opção A): campo opcional, ausente vale true (os documentos
// antigos não precisam de migração). Categoria inativa some do /artigos
// público, mas continua no seletor do painel, marcada, e pode ser usada num
// artigo; a lixeira (excluidoEm) continua escondendo de todo lugar.
// Testado em testes/unidade/topicos.test.mts.
import type { Topico } from "./dados/tipos.ts";

// Leitura do Firestore: só false desliga.
export function lerAtiva(valor: unknown): boolean {
  return valor !== false;
}

// A categoria aparece no /artigos público?
export function categoriaVisivelNoSite(topico: Pick<Topico, "ativa" | "excluidoEm">): boolean {
  return topico.ativa && !topico.excluidoEm;
}

// Opções do seletor de categoria do painel (criar e editar artigo): fora da
// lixeira; a inativa aparece com "(inativa)" no nome.
export function opcoesDeCategoriaNoPainel(topicos: Pick<Topico, "id" | "nome" | "ativa" | "excluidoEm">[]): { id: string; nome: string }[] {
  return topicos.filter((topico) => !topico.excluidoEm).map((topico) => ({ id: topico.id, nome: topico.ativa ? topico.nome : `${topico.nome} (inativa)` }));
}

// Campo "Ativa" do formulário da categoria. A caixa de marcar só manda "sim"
// quando marcada; o campo escondido "ativaNoFormulario" diz que o controle
// estava na tela (sem ele, nada muda). Outro valor é recusado.
export function lerAtivaDoFormulario(dados: FormData): { ok: true; ativa: boolean | null } | { ok: false; mensagem: string } {
  if (dados.get("ativaNoFormulario") === null) return { ok: true, ativa: null };
  const valor = dados.get("ativa");
  if (valor === null) return { ok: true, ativa: false };
  if (valor === "sim") return { ok: true, ativa: true };
  return { ok: false, mensagem: "Valor inválido para Ativa. Recarregue a página e tente de novo." };
}

// Página pública /artigos/categoria/[slug] (23/10/2026): categoria inativa
// ou na lixeira conta como inexistente (404); sem o campo, abre.
export function categoriaDaPaginaPublica<T extends Pick<Topico, "ativa" | "excluidoEm">>(categoria: T | undefined): T | null {
  return categoria && categoriaVisivelNoSite(categoria) ? categoria : null;
}
