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
  // Imagens da biblioteca de mídia, na ordem da galeria (modelo de dados:
  // imagens [{ midiaId, ordem }]). A primeira por ordem é a principal.
  imagens: ImagemDoProduto[];
};

export type ImagemDoProduto = { midiaId: string; ordem: number };

// Limite de imagens por produto (proposto em 18/10/2026).
export const LIMITE_DE_IMAGENS_DO_PRODUTO = 8;

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

// Imagens da galeria, como vêm do formulário: um campo "imagens" por imagem,
// na ordem da tela. Ids inválidos, repetidos ou acima do limite são recusados.
// A ordem gravada é a posição (0 é a principal).
export function lerImagensDoProduto(valores: FormDataEntryValue[]): { ok: true; imagens: ImagemDoProduto[] } | { ok: false; erro: string } {
  const ids = valores.map((valor) => (typeof valor === "string" ? valor.trim() : "")).filter(Boolean);
  if (!ids.every(ehIdDeDocumentoValido)) return { ok: false, erro: "Imagem inválida. Escolha as imagens de novo." };
  if (new Set(ids).size !== ids.length) return { ok: false, erro: "A mesma imagem aparece duas vezes na galeria. Remova a repetida." };
  if (ids.length > LIMITE_DE_IMAGENS_DO_PRODUTO) return { ok: false, erro: `Use no máximo ${LIMITE_DE_IMAGENS_DO_PRODUTO} imagens por produto.` };
  return { ok: true, imagens: ids.map((midiaId, ordem) => ({ midiaId, ordem })) };
}

// Ids das imagens na ordem da galeria (a primeira é a principal).
export function idsEmOrdem(imagens: ImagemDoProduto[]): string[] {
  return [...imagens].sort((a, b) => a.ordem - b.ordem).map((imagem) => imagem.midiaId);
}

// Imagem principal para exibir: a primeira da galeria que está disponível
// (fora da lixeira da biblioteca); nenhuma, null (o site mostra o placeholder).
export function imagemPrincipal<Imagem>(imagens: ImagemDoProduto[], disponiveis: Map<string, Imagem>): Imagem | null {
  for (const midiaId of idsEmOrdem(imagens)) {
    const imagem = disponiveis.get(midiaId);
    if (imagem) return imagem;
  }
  return null;
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

  const imagens = lerImagensDoProduto(dados.getAll("imagens"));
  if (!imagens.ok) erros.imagens = imagens.erro;

  if (Object.keys(erros).length > 0 || !imagens.ok) return { ok: false, erros };

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
      imagens: imagens.imagens,
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

export const LIMITE_DE_PRODUTOS_EM_DESTAQUE = 4;

type ProdutoParaDestaque = {
  nome: string;
  ordem: number;
  selo: string;
  status: "disponivel" | "esgotado";
  publicado: boolean;
  excluidoEm: Date | null;
  imagens: ImagemDoProduto[];
};

// Produtos em destaque na home (28/10/2026): só publicados, fora da lixeira,
// disponíveis e com imagem da biblioteca (temImagem diz se a galeria tem uma
// imagem ativa). Primeiro os com selo, depois os outros; dentro de cada grupo,
// a ordem da loja (ordem e, no empate, o nome). Até `limite`; pode ser vazio.
export function escolherProdutosEmDestaque<T extends ProdutoParaDestaque>(produtos: T[], temImagem: (imagens: ImagemDoProduto[]) => boolean, limite = LIMITE_DE_PRODUTOS_EM_DESTAQUE): T[] {
  const ordemDaLoja = (a: T, b: T) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");
  return produtos
    .filter((produto) => produto.publicado && !produto.excluidoEm && produto.status === "disponivel" && temImagem(produto.imagens))
    .sort((a, b) => Number(!a.selo.trim()) - Number(!b.selo.trim()) || ordemDaLoja(a, b))
    .slice(0, limite);
}
