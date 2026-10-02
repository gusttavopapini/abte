// Gera o slug de um título: minúsculas, sem acento e só letras e números
// separados por hífen (ex.: "Meu Post Legal" vira "meu-post-legal").
// Função pura: usada pelas ações do painel e pelos testes de unidade.
export function gerarSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
