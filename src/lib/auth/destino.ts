// Destino depois do login da loja (parâmetro ?voltar=). Função pura.
// Só aceita caminhos da própria loja, para ninguém montar um link que, depois
// do login, leve a outro site.
export const DESTINO_PADRAO_DA_LOJA = "/loja/conta";

export function destinoSeguroNaLoja(voltar: unknown): string {
  if (typeof voltar !== "string") return DESTINO_PADRAO_DA_LOJA;
  if (!/^\/loja(?:[/?#]|$)/.test(voltar) || voltar.includes("//") || voltar.includes("\\")) return DESTINO_PADRAO_DA_LOJA;
  // As telas de entrar e cadastro não são destino: o cliente já entrou.
  if (/^\/loja\/(entrar|cadastro)(?:[/?#]|$)/.test(voltar)) return DESTINO_PADRAO_DA_LOJA;
  return voltar;
}
