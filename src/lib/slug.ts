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

// Escolhe um slug que ainda não está em uso: o próprio slug base, ou o base
// seguido de -2, -3... (ex.: "coletes" ocupado vira "coletes-2").
// Função pura: quem chama lê os slugs existentes no servidor, dentro de uma
// transação, e grava o resultado na mesma transação.
export function escolherSlugUnico(base: string, emUso: ReadonlySet<string>): string {
  if (!emUso.has(base)) return base;
  let numero = 2;
  while (emUso.has(`${base}-${numero}`)) numero++;
  return `${base}-${numero}`;
}
