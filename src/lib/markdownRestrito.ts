// Leitura do Markdown restrito do conteúdo dos posts (decisão 1, aprovada em
// 21/10/2026; ênfase acrescentada em 22/10/2026). Pura e sem dependências:
// devolve blocos e trechos que o componente MarkdownRestrito transforma em
// elementos React, sem HTML. Testada em testes/unidade/markdown-restrito.test.mts.
//
// Subconjunto:
//   parágrafos (separados por linha em branco; linhas seguidas se juntam)
//   ## título e ### subtítulo
//   - item e 1. item numerado
//   > citação
//   **negrito** e *itálico* (um dentro do outro, um nível só; o conversor
//   nunca os gera colados, como **a***b*, que esta leitura não separa)
//   [texto](endereço), só https:, mailto: e caminhos internos (/...)
//   ![alt](midia:ID) sozinha na linha (imagem da biblioteca de mídia)
// Qualquer outra coisa vira texto comum, como foi escrita. A barra invertida
// antes de um sinal de pontuação mostra o sinal (\* vira *); no começo do
// parágrafo, também antes de número (\1. não vira lista).

export type Trecho =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrito"; trechos: Trecho[] }
  | { tipo: "italico"; trechos: Trecho[] }
  | { tipo: "link"; endereco: string; trechos: Trecho[] };

export type Bloco =
  | { tipo: "paragrafo"; trechos: Trecho[] }
  | { tipo: "titulo"; nivel: 2 | 3; trechos: Trecho[] }
  | { tipo: "lista"; numerada: boolean; inicio: number; itens: Trecho[][] }
  | { tipo: "citacao"; paragrafos: Trecho[][] }
  | { tipo: "imagem"; alt: string; midia: string };

// Limites contra conteúdo exagerado (o conteúdo vem do painel e da migração).
export const LIMITE_DE_CARACTERES = 200_000;
const LIMITE_DO_ENDERECO = 2_000;
const LIMITE_DO_ID_DA_MIDIA = 200;

const PONTUACAO = /[!-/:-@[-`{-~]/;
const LINHA_DE_IMAGEM = /^!\[((?:\\.|[^\]\\])*)\]\(midia:([A-Za-z0-9:._~-]+)\)$/;
const ITEM = /^- (.*)$/;
const ITEM_NUMERADO = /^(\d{1,9})\. (.*)$/;

// Endereço permitido num link, ou null. Caminho interno: começa por uma barra
// só (// e /\ levam a outro site no navegador), sem espaço nem caractere de
// controle. https: precisa de host; mailto: precisa de um endereço.
export function enderecoPermitido(bruto: string): string | null {
  const endereco = bruto.trim();
  if (!endereco || endereco.length > LIMITE_DO_ENDERECO) return null;
  // Espaços, controles e barra invertida nunca entram.
  if (/[\s\u0000-\u001f\u007f\\]/.test(endereco)) return null;
  if (endereco.startsWith("/")) return endereco.startsWith("//") ? null : endereco;
  if (/^mailto:[^@]+@[^@]+$/i.test(endereco)) return endereco;
  if (!/^https:\/\//i.test(endereco)) return null;
  try {
    const url = new URL(endereco);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? endereco : null;
  } catch {
    return null;
  }
}

// Desfaz os escapes de um texto sem marcação (alt da imagem).
function semEscapes(texto: string): string {
  return texto.replace(/\\(.)/g, (todo, caractere: string) => (PONTUACAO.test(caractere) ? caractere : todo));
}

type Permitidos = { negrito: boolean; italico: boolean; link: boolean };

// Posições já calculadas de um texto, para achar fechamentos sem varrer o
// texto de novo a cada abertura (conteúdo exagerado não fica lento).
type Mapa = { escapado: boolean[]; proximoDuplo: number[]; proximoSimples: number[]; proximoColchete: number[]; proximoParentese: number[] };

function mapear(texto: string): Mapa {
  const n = texto.length;
  const escapado = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (texto[i] === "\\" && i + 1 < n && PONTUACAO.test(texto[i + 1])) {
      escapado[i + 1] = true;
      i++;
    }
  }
  const estrela = (i: number) => i >= 0 && i < n && texto[i] === "*" && !escapado[i];
  const proximoDuplo = new Array<number>(n + 1).fill(-1);
  const proximoSimples = new Array<number>(n + 1).fill(-1);
  const proximoColchete = new Array<number>(n + 1).fill(-1);
  const proximoParentese = new Array<number>(n + 1).fill(-1);
  for (let i = n - 1; i >= 0; i--) {
    proximoDuplo[i] = estrela(i) && estrela(i + 1) ? i : proximoDuplo[i + 1];
    // Fechamento do itálico: uma estrela sozinha (não faz parte de **).
    proximoSimples[i] = estrela(i) && !estrela(i - 1) && !estrela(i + 1) ? i : proximoSimples[i + 1];
    proximoColchete[i] = texto[i] === "]" && !escapado[i] ? i : proximoColchete[i + 1];
    proximoParentese[i] = texto[i] === ")" ? i : proximoParentese[i + 1];
  }
  return { escapado, proximoDuplo, proximoSimples, proximoColchete, proximoParentese };
}

// Trechos de uma linha de texto. Negrito, itálico e link podem conter os
// outros, uma vez cada (nada se repete dentro de si mesmo).
export function lerTrechos(texto: string, permitidos: Permitidos = { negrito: true, italico: true, link: true }): Trecho[] {
  const mapa = mapear(texto);
  const trechos: Trecho[] = [];
  let atual = "";
  const fecharTexto = () => {
    if (atual) trechos.push({ tipo: "texto", texto: atual });
    atual = "";
  };
  let i = 0;
  while (i < texto.length) {
    const caractere = texto[i];
    if (caractere === "\\" && i + 1 < texto.length && mapa.escapado[i + 1]) {
      atual += texto[i + 1];
      i += 2;
      continue;
    }
    if (caractere === "*" && !mapa.escapado[i]) {
      const duplo = texto[i + 1] === "*" && !mapa.escapado[i + 1];
      if (duplo && permitidos.negrito) {
        let fim = mapa.proximoDuplo[i + 2] ?? -1;
        // Em ***, fecham as duas últimas estrelas (a primeira fecha um
        // itálico de dentro: **a *b*** e ***a***).
        while (fim > 0 && texto[fim + 2] === "*" && !mapa.escapado[fim + 2]) fim++;
        if (fim > i + 2) {
          fecharTexto();
          trechos.push({ tipo: "negrito", trechos: lerTrechos(texto.slice(i + 2, fim), { ...permitidos, negrito: false }) });
          i = fim + 2;
          continue;
        }
      } else if (!duplo && permitidos.italico) {
        const fim = mapa.proximoSimples[i + 1] ?? -1;
        if (fim > i + 1) {
          fecharTexto();
          trechos.push({ tipo: "italico", trechos: lerTrechos(texto.slice(i + 1, fim), { ...permitidos, italico: false }) });
          i = fim + 1;
          continue;
        }
      }
      // Sem fechamento: as estrelas ficam como texto.
      const tamanho = duplo ? 2 : 1;
      atual += texto.slice(i, i + tamanho);
      i += tamanho;
      continue;
    }
    // Link [texto](endereço). Depois de "!", é imagem fora do lugar: texto.
    if (caractere === "[" && !mapa.escapado[i] && permitidos.link && !(texto[i - 1] === "!" && !mapa.escapado[i - 1])) {
      const fimDoTexto = mapa.proximoColchete[i + 1] ?? -1;
      if (fimDoTexto > i + 1 && texto[fimDoTexto + 1] === "(") {
        const fimDoEndereco = mapa.proximoParentese[fimDoTexto + 2] ?? -1;
        const endereco = fimDoEndereco > fimDoTexto + 2 ? enderecoPermitido(texto.slice(fimDoTexto + 2, fimDoEndereco)) : null;
        if (endereco) {
          fecharTexto();
          trechos.push({ tipo: "link", endereco, trechos: lerTrechos(texto.slice(i + 1, fimDoTexto), { ...permitidos, link: false }) });
          i = fimDoEndereco + 1;
          continue;
        }
      }
    }
    atual += caractere;
    i++;
  }
  fecharTexto();
  return trechos;
}

// Tira a barra invertida que o conversor põe no começo de um parágrafo que
// viraria título, citação ou lista (\# , \> , \- , \+ , \1.).
function inicioDoParagrafo(linha: string): string {
  return /^\\[#>\-+0-9]/.test(linha) ? linha.slice(1) : linha;
}

export function lerMarkdownRestrito(conteudo: string): Bloco[] {
  const blocos: Bloco[] = [];
  const linhas = conteudo.slice(0, LIMITE_DE_CARACTERES).replace(/\r\n?/g, "\n").split("\n");
  let paragrafo: string[] = [];
  const fecharParagrafo = () => {
    if (paragrafo.length) blocos.push({ tipo: "paragrafo", trechos: lerTrechos(inicioDoParagrafo(paragrafo.join(" "))) });
    paragrafo = [];
  };
  for (const bruta of linhas) {
    const linha = bruta.trim();
    const anterior = blocos[blocos.length - 1];
    if (!linha) {
      fecharParagrafo();
      // Linha em branco termina a lista ou a citação.
      blocos.push({ tipo: "paragrafo", trechos: [] });
      continue;
    }
    const item = linha.match(ITEM);
    const numerado = linha.match(ITEM_NUMERADO);
    const imagem = linha.match(LINHA_DE_IMAGEM);
    if (linha.startsWith("## ") || linha.startsWith("### ")) {
      fecharParagrafo();
      const nivel = linha.startsWith("### ") ? 3 : 2;
      blocos.push({ tipo: "titulo", nivel, trechos: lerTrechos(linha.slice(nivel + 1).trim()) });
    } else if (item || numerado) {
      fecharParagrafo();
      const numerada = Boolean(numerado);
      const texto = numerado ? numerado[2] : (item as RegExpMatchArray)[1];
      if (anterior?.tipo === "lista" && anterior.numerada === numerada) anterior.itens.push(lerTrechos(texto));
      else blocos.push({ tipo: "lista", numerada, inicio: numerado ? Number(numerado[1]) : 1, itens: [lerTrechos(texto)] });
    } else if (linha.startsWith("> ") || linha === ">") {
      fecharParagrafo();
      const texto = linha.slice(1).trim();
      if (anterior?.tipo === "citacao") anterior.paragrafos.push(lerTrechos(texto));
      else blocos.push({ tipo: "citacao", paragrafos: [lerTrechos(texto)] });
    } else if (imagem && imagem[2].length <= LIMITE_DO_ID_DA_MIDIA) {
      fecharParagrafo();
      blocos.push({ tipo: "imagem", alt: semEscapes(imagem[1]).trim(), midia: imagem[2] });
    } else {
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  return blocos.filter((bloco) => !(bloco.tipo === "paragrafo" && bloco.trechos.length === 0) && !(bloco.tipo === "citacao" && bloco.paragrafos.every((parte) => parte.length === 0)));
}

// Ids de mídia citados nas imagens, na ordem (para o servidor buscar).
export function midiasDoMarkdown(blocos: Bloco[]): string[] {
  return blocos.flatMap((bloco) => (bloco.tipo === "imagem" ? [bloco.midia] : []));
}

export function textoDosTrechos(trechos: Trecho[]): string {
  return trechos.map((trecho) => (trecho.tipo === "texto" ? trecho.texto : textoDosTrechos(trecho.trechos))).join("");
}

// Texto simples de cada bloco de texto, na ordem (sem as imagens): resumo e
// tempo de leitura.
export function textoDoMarkdown(blocos: Bloco[]): string[] {
  return blocos.flatMap((bloco) => {
    if (bloco.tipo === "paragrafo" || bloco.tipo === "titulo") return [textoDosTrechos(bloco.trechos)];
    if (bloco.tipo === "lista") return bloco.itens.map(textoDosTrechos);
    if (bloco.tipo === "citacao") return bloco.paragrafos.map(textoDosTrechos);
    return [];
  });
}
