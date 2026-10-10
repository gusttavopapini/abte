// Regras dos produtos da loja: preço, validação do cadastro e relacionados.
// Funções puras, com mensagens em português, usadas pelo servidor e pelos
// testes de unidade. Não há pagamento: preço é só informação.
import { ehIdDeDocumentoValido } from "./validacao.ts";

export type DadosDoProduto = {
  nome: string;
  descricao: string;
  preco: number;
  precoPromocional: number | null;
  categoria: string;
  tipo: "fisico" | "digital";
  status: "disponivel" | "esgotado";
  selo: string;
  ordem: number;
  publicado: boolean;
};

export type CampoDoProduto = keyof DadosDoProduto;

export type ResultadoDoProduto =
  | { ok: true; dados: DadosDoProduto }
  | { ok: false; erros: Partial<Record<CampoDoProduto, string>> };

// Maior preço aceito: R$ 100.000,00 (em centavos).
const PRECO_MAXIMO = 10_000_000;
const LIMITES = { nome: 120, descricao: 5000, selo: 30 } as const;
const ORDEM_MAXIMA = 999;

// Formatos aceitos: 25 | 25,9 | 25,90 | 1.250,00 | 25.90 (ponto como decimal só
// com um ou dois dígitos depois dele). "R$" e espaços são ignorados.
const FORMATOS_DE_PRECO = [/^\d+(,\d{1,2})?$/, /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/, /^\d+\.\d{1,2}$/];

// Converte o preço digitado em centavos. Devolve null se o formato não for
// reconhecido, e undefined se o campo estiver vazio.
export function lerPrecoEmCentavos(entrada: string): number | null | undefined {
  const valor = entrada.replace(/R\$/i, "").replace(/\s/g, "");
  if (!valor) return undefined;
  if (!FORMATOS_DE_PRECO.some((formato) => formato.test(valor))) return null;
  const normalizado = valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".") : valor;
  const [inteiro, decimal = ""] = normalizado.split(".");
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}

const FORMATO_REAL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Ex.: 2590 vira "R$ 25,90".
export function formatarPreco(centavos: number): string {
  return FORMATO_REAL.format(centavos / 100);
}

// Valor para o campo de edição do painel (ex.: 2590 vira "25,90").
export function precoParaCampo(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

export function validarProduto(dados: FormData): ResultadoDoProduto {
  const erros: Partial<Record<CampoDoProduto, string>> = {};

  const nome = texto(dados, "nome");
  if (!nome) erros.nome = "Preencha o nome.";
  else if (nome.length > LIMITES.nome) erros.nome = `Use no máximo ${LIMITES.nome} caracteres.`;

  const descricao = texto(dados, "descricao");
  if (descricao.length > LIMITES.descricao) erros.descricao = `A descrição aceita no máximo ${LIMITES.descricao} caracteres.`;

  const preco = lerPrecoEmCentavos(texto(dados, "preco"));
  if (preco === undefined) erros.preco = "Preencha o preço.";
  else if (preco === null) erros.preco = "Preço inválido. Use o formato 25,90 ou 1.250,00.";
  else if (preco <= 0 || preco > PRECO_MAXIMO) erros.preco = "O preço precisa ser maior que zero e de até R$ 100.000,00.";

  const promocional = lerPrecoEmCentavos(texto(dados, "precoPromocional"));
  if (promocional === null) erros.precoPromocional = "Preço promocional inválido. Use o formato 25,90 ou 1.250,00.";
  else if (promocional !== undefined && (promocional <= 0 || (typeof preco === "number" && promocional >= preco))) {
    erros.precoPromocional = "O preço promocional precisa ser maior que zero e menor que o preço normal.";
  }

  const categoria = texto(dados, "categoria");
  if (!ehIdDeDocumentoValido(categoria)) erros.categoria = "Escolha uma categoria.";

  const tipo = texto(dados, "tipo");
  if (tipo !== "fisico" && tipo !== "digital") erros.tipo = "Escolha se o produto é físico ou digital.";

  const status = texto(dados, "status");
  if (status !== "disponivel" && status !== "esgotado") erros.status = "Escolha se o produto está disponível ou esgotado.";

  const selo = texto(dados, "selo");
  if (selo.length > LIMITES.selo) erros.selo = `O selo aceita no máximo ${LIMITES.selo} caracteres.`;

  const ordemTexto = texto(dados, "ordem");
  const ordem = ordemTexto === "" ? 0 : Number(ordemTexto);
  if (!/^\d*$/.test(ordemTexto) || ordem > ORDEM_MAXIMA) erros.ordem = `Use um número inteiro de 0 a ${ORDEM_MAXIMA}.`;

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    dados: {
      nome,
      descricao,
      preco: preco as number,
      precoPromocional: promocional ?? null,
      categoria,
      tipo: tipo as DadosDoProduto["tipo"],
      status: status as DadosDoProduto["status"],
      selo,
      ordem,
      publicado: dados.get("publicado") === "sim",
    },
  };
}

// Preço cobrado de fato: o promocional, se houver.
export function precoAtual(produto: { preco: number; precoPromocional: number | null }): number {
  return produto.precoPromocional ?? produto.preco;
}

// Produtos relacionados: da mesma categoria, sem o próprio produto, na ordem
// já definida da lista (a lista recebida só deve ter produtos visíveis no site).
export function escolherRelacionados<T extends { id: string; categoria: string }>(produto: T, visiveis: T[], limite = 3): T[] {
  return visiveis.filter((outro) => outro.id !== produto.id && outro.categoria === produto.categoria).slice(0, limite);
}
