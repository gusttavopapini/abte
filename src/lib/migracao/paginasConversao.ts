// Conversão das páginas institucionais do site antigo para o Markdown
// restrito (etapa 6, degrau 6), só para conferência: os arquivos ficam em
// docs/dados-privados/paginas/ e NADA é importado. Pura (parse5 e o mesmo
// conversor dos posts). Testada em testes/unidade/migracao-paginas.test.mts.
//
// O conteúdo do Wix vem em blocos de texto (data-testid="richTextElement"),
// imagens soltas e botões. Formulários, campos e ícones saem. Pedido de
// 22/10/2026: números oficiais, Pix e formulário de associação não entram;
// cada um vai para a lista de pendências para a ABTE (pela página e pela
// posição, sem o texto):
//   - número: bloco que é só um número (contadores como "+300") ou um
//     número curto com o que ele conta (pacientes, profissionais, anos...);
//     ano sozinho (linha do tempo) e telefone ficam;
//   - Pix: bloco que fala de Pix, chave ou CNPJ;
//   - associação: link para formulário externo (Google Forms e afins) e
//     <form> que fala de associação; os outros <form> (ex.: inscrição por
//     e-mail) também saem e são listados como "formulario".
import { parse } from "parse5";
import { lerMarkdownRestrito, textoDoMarkdown } from "../markdownRestrito.ts";
import { atributo, percorrer, textoCru, type No } from "./postsColeta.ts";
import { converterNosParaMarkdown, escaparTexto, type RelatorioDaConversao } from "./postsConversao.ts";

// formulario: outro <form> da página (ex.: inscrição por e-mail, newsletter em aberto).
export type Pendencia = { tipo: "numero" | "pix" | "associacao" | "formulario"; bloco: number; descricao: string };

export type RelatorioDaPagina = {
  conversao: RelatorioDaConversao;
  blocosDeTexto: number;
  imagensSoltas: number;
  botoes: number;
  formularios: number;
  // Texto que não estava num bloco de texto nem num link (ex.: a lista de
  // posts do widget do blog, já migrados): não convertido, só contado.
  caracteresForaDosBlocos: number;
  pendencias: Pendencia[];
  // Parágrafos longos com número (ficam; conferir se algum é número oficial).
  paragrafosComNumero: number;
};

const SO_NUMERO = /^[+±~]?\s*\d[\d.,\s]*(?:\+|%|mil|mi|k)?\s*\+?$/i;
const NUMERO_COM_CONTAGEM = /\d[\d.,]*\s*(?:\+\s*)?(?:mil\s+)?(?:pacientes?|profissionais?|membros?|associad[oa]s?|atendiment[oa]s?|atendid[oa]s?|anos?|cidades?|estados?|pa[ií]ses|especialistas?|fisioterapeutas?|m[eé]dicos?|cursos?|alun[oa]s?|crian[cç]as?|fam[ií]lias?|cartilhas?)\b/i;
const PIX = /\bpix\b|\bcnpj\b|chave\s+aleat[oó]ria|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/i;
const FORMULARIO_EXTERNO = /^https?:\/\/(?:docs\.google\.com\/forms|forms\.gle|forms\.office\.com|[\w-]+\.typeform\.com|[\w-]+\.jotform\.com)/i;
const LIMITE_DO_NUMERO_CURTO = 80;
// Ficam: ano sozinho (linha do tempo, ex.: "2018") e telefone (8 ou mais
// algarismos), que não são números da instituição.
const ANO = /^(?:19|20)\d{2}$/;
const ALGARISMOS_DE_TELEFONE = 8;

function ehNumeroDaInstituicao(texto: string): boolean {
  const algarismos = texto.replace(/\D/g, "").length;
  if (ANO.test(texto) || algarismos >= ALGARISMOS_DE_TELEFONE) return false;
  return SO_NUMERO.test(texto) || (texto.length <= LIMITE_DO_NUMERO_CURTO && NUMERO_COM_CONTAGEM.test(texto));
}

// Elementos do <main> na ordem da página: blocos de texto (os filhos de cada
// richTextElement), imagens fora deles e botões ou links com texto (como um
// parágrafo com o link). O resto (formulários, ícones, SVG, contêineres
// vazios) sai; o texto que sobra fora disso é só contado.
type Contagem = { blocosDeTexto: number; imagensSoltas: number; botoes: number; formularios: number; caracteresForaDosBlocos: number; tiposDeFormulario: Pendencia[] };

function blocosDaPagina(raiz: No, contagem: Contagem): No[] {
  const blocos: No[] = [];
  const visitar = (no: No) => {
    const tag = no.tagName ?? "";
    if (no.nodeName === "#text") {
      contagem.caracteresForaDosBlocos += (no.value ?? "").replace(/\s+/g, " ").trim().length;
      return;
    }
    if (tag === "form") {
      contagem.formularios++;
      // Só os tipos dos campos e se fala de associação; nada do que foi digitado na página.
      const campos = [...percorrer(no)].filter((atual) => atual.tagName === "input" && atributo(atual, "type") !== "hidden").map((atual) => atributo(atual, "type") ?? "text");
      const deAssociacao = /associ/i.test(textoCru(no));
      const soEmail = campos.length > 0 && campos.every((campo) => campo === "email");
      contagem.tiposDeFormulario.push(
        deAssociacao
          ? { tipo: "associacao", bloco: 0, descricao: "formulário de associação (não entrou)" }
          : { tipo: "formulario", bloco: 0, descricao: soEmail ? "formulário de inscrição por e-mail (newsletter, decisão em aberto; não entrou)" : `formulário com ${campos.length} campo(s) (não entrou)` },
      );
      return;
    }
    if (["script", "style", "svg", "button", "input", "select", "textarea", "iframe", "noscript", "template"].includes(tag)) return;
    if (atributo(no, "data-testid") === "richTextElement") {
      contagem.blocosDeTexto++;
      blocos.push(...(no.childNodes ?? []));
      return;
    }
    if (tag === "wow-image" || tag === "img") {
      contagem.imagensSoltas++;
      blocos.push(no);
      return;
    }
    // Botão (rótulo do Wix) ou link com texto próprio, sem bloco de texto dentro.
    const descendentes = tag === "a" ? [...percorrer(no)] : [];
    const rotulo = descendentes.find((atual) => atributo(atual, "data-testid") === "stylablebutton-label");
    const texto = tag === "a" && !descendentes.some((atual) => atributo(atual, "data-testid") === "richTextElement") ? textoCru(rotulo ?? no).replace(/\s+/g, " ").trim() : "";
    if (texto) {
      contagem.botoes++;
      blocos.push({ nodeName: "p", tagName: "p", attrs: [], childNodes: [{ nodeName: "a", tagName: "a", attrs: (no.attrs ?? []).filter((item) => item.name === "href"), childNodes: [{ nodeName: "#text", value: texto }] }] });
      return;
    }
    for (const filho of no.childNodes ?? []) visitar(filho);
  };
  visitar(raiz);
  return blocos;
}

// Tira os links para formulários externos antes da conversão (o texto fica).
function semFormulariosExternos(no: No, pendencias: Pendencia[], posicao: () => number): No {
  if (no.tagName === "a" && FORMULARIO_EXTERNO.test(atributo(no, "href") ?? "")) {
    pendencias.push({ tipo: "associacao", bloco: posicao(), descricao: "link para formulário externo (o link saiu; o texto ficou)" });
    return { ...no, attrs: (no.attrs ?? []).filter((item) => item.name !== "href") };
  }
  return no.childNodes ? { ...no, childNodes: no.childNodes.map((filho) => semFormulariosExternos(filho, pendencias, posicao)) } : no;
}

export function converterPagina(conteudoHtml: string, imagensConhecidas: ReadonlySet<string>): { markdown: string; relatorio: RelatorioDaPagina } {
  const contagem: Contagem = { blocosDeTexto: 0, imagensSoltas: 0, botoes: 0, formularios: 0, caracteresForaDosBlocos: 0, tiposDeFormulario: [] };
  const pendencias: Pendencia[] = [];
  const nos = blocosDaPagina(parse(conteudoHtml) as unknown as No, contagem);
  const limpos = nos.map((no, i) => semFormulariosExternos(no, pendencias, () => i + 1));
  const { markdown, relatorio } = converterNosParaMarkdown(limpos, { imagensEsperadas: [], capa: null, imagensConhecidas });

  // Números oficiais e Pix saem bloco a bloco (o bloco é o trecho entre
  // linhas em branco do Markdown).
  let paragrafosComNumero = 0;
  const blocos = markdown.trim() ? markdown.trim().split("\n\n") : [];
  const ficam = blocos.filter((bloco, i) => {
    const texto = textoDoMarkdown(lerMarkdownRestrito(bloco)).join(" ").replace(/\s+/g, " ").trim();
    if (!texto) return true;
    if (PIX.test(texto)) {
      pendencias.push({ tipo: "pix", bloco: i + 1, descricao: "trecho sobre Pix, chave ou CNPJ (não entrou)" });
      return false;
    }
    if (ehNumeroDaInstituicao(texto)) {
      pendencias.push({ tipo: "numero", bloco: i + 1, descricao: "número da instituição (contador ou total; não entrou)" });
      return false;
    }
    if (/\d/.test(texto) && NUMERO_COM_CONTAGEM.test(texto)) paragrafosComNumero++;
    return true;
  });
  pendencias.push(...contagem.tiposDeFormulario);
  return {
    markdown: ficam.length ? `${ficam.join("\n\n")}\n` : "",
    relatorio: {
      conversao: relatorio,
      blocosDeTexto: contagem.blocosDeTexto,
      imagensSoltas: contagem.imagensSoltas,
      botoes: contagem.botoes,
      formularios: contagem.formularios,
      caracteresForaDosBlocos: contagem.caracteresForaDosBlocos,
      pendencias,
      paragrafosComNumero,
    },
  };
}

// Título do arquivo de conferência: o título da aba no site antigo, sem o
// nome do site depois da barra (o caminho fica no índice).
export function cabecalhoDaPagina(caminho: string, tituloSite: string): string {
  return `## ${escaparTexto(tituloSite.split("|")[0].trim() || caminho)}\n\n`;
}
