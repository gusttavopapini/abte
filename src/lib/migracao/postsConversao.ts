// Conversão do corpo dos posts do site antigo para o Markdown restrito do site
// novo (etapa 6, degrau 4a; formato aprovado em 21/10/2026, decisão 1).
// Subconjunto: parágrafos, títulos ## e ###, listas (- e 1.), citações (>),
// **negrito** e *itálico* (desde 22/10/2026; sublinhado vira texto simples),
// links [texto](endereço) só com https:, mailto: e caminhos internos com
// destino conhecido, e imagens ![alt](midia:wix:<id da mídia no Wix>), que a
// importação troca pelo id do documento em midias (origem.midiaId). Nada de
// HTML: o que não cabe no subconjunto vira texto simples ou é descartado, e
// tudo é contado no relatório. Erros de digitação NÃO são corrigidos (precisa
// da ABTE).
//
// Respostas de 22/10/2026: links em http e caminhos internos sem destino no
// site novo saem (o texto fica) e são listados com o texto, para conferência
// e para religar depois; a primeira imagem do corpo, quando é a própria capa,
// sai (a página do post já mostra a capa), e uma repetição dela mais adiante
// fica.
//
// Escapes (o renderizador, src/lib/markdownRestrito.ts, desfaz os mesmos):
// \ [ ] * _ ` viram \\ \[ \] \* \_ \`; um parágrafo que começaria por #, >,
// -, + ou "1." ganha uma barra invertida na frente, para não virar título,
// citação ou lista.
//
// Pura, com o parse5 (só nos scripts de coleta). Testada com HTML sintético
// em testes/unidade/migracao-posts.test.mts.
import { parse } from "parse5";
import { gerarSlug } from "../slug.ts";
import { atributo, percorrer, type No } from "./postsColeta.ts";


export type PostDoMapa = { slug: string; titulo: string; publicadoEm: string; atualizadoEm: string | null; idiomaEstimado: string; capa: string | null };

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

export function lerPostsDoMapa(conteudo: string): { ok: true; posts: PostDoMapa[] } | { ok: false; erros: string[] } {
  const erros: string[] = [];
  const posts: PostDoMapa[] = [];
  conteudo.split("\n").forEach((linha, i) => {
    if (!linha.trim()) return;
    let r: Record<string, unknown>;
    try {
      r = JSON.parse(linha);
    } catch {
      erros.push(`Linha ${i + 1} do mapa não é JSON.`);
      return;
    }
    if (r.tipo !== "post") return;
    if (!texto(r.slug) || !texto(r.titulo) || !texto(r.publicadoEm)) erros.push(`Linha ${i + 1} (post): slug, título ou data ausente.`);
    posts.push({
      slug: texto(r.slug),
      titulo: texto(r.titulo),
      publicadoEm: texto(r.publicadoEm),
      atualizadoEm: texto(r.atualizadoEm) || null,
      idiomaEstimado: texto(r.idiomaEstimado),
      capa: texto(r.capa) || null,
    });
  });
  if (new Set(posts.map((post) => post.slug)).size !== posts.length) erros.push("O mapa tem slugs de post repetidos.");
  if (erros.length === 0 && posts.length === 0) erros.push("O mapa não tem posts.");
  return erros.length > 0 ? { ok: false, erros } : { ok: true, posts };
}

// Idioma do post (decisão de 22/10/2026): "es" nos posts que o mapa marca em
// espanhol (os dois indicados pelo responsável); os demais, pt-BR. Os slugs
// ficam só no mapa privado; o relatório da conversão lista os marcados.
export function idiomaDoPost(post: Pick<PostDoMapa, "idiomaEstimado">): "pt-BR" | "es" {
  return post.idiomaEstimado === "es" ? "es" : "pt-BR";
}

// O que o conversor encontrou e como tratou cada tipo de elemento.
export type LinkRemovido = { endereco: string; texto: string };

export type RelatorioDaConversao = {
  blocos: { paragrafos: number; titulos: number; itensDeLista: number; citacoes: number; imagens: number };
  // Ênfase mantida (negrito e itálico) e simplificada (ver o conversor).
  enfase: { negrito: number; italico: number; aninhadaSimplificada: number; emTitulo: number; emLinkSimplificada: number; coladaSimplificada: number };
  // Viraram texto simples (o subconjunto não tem): sublinhado, tachado...
  formatacaoDescartada: Record<string, number>;
  // Convertidos para o subconjunto de outro jeito.
  adaptados: Record<string, number>;
  // Descartados (iframes, vídeos, scripts, divisores...).
  descartados: Record<string, number>;
  links: {
    mantidos: number;
    siteAntigoReescritos: number;
    // Caminho do site antigo sem destino no site novo: o link sai e o texto fica.
    internosSemDestinoConhecido: LinkRemovido[];
    wixRemovidos: number;
    httpRemovidos: LinkRemovido[];
    outrosRemovidos: string[];
  };
  imagens: { noCorpo: number; casadas: number; capaNoCorpo: number; capaRemovidaDoCorpo: number; semIdDaMidia: number; semUsoNoArquivo: string[]; esperadasNaoAchadas: string[] };
  // Pontos para a revisão da ABTE (notas em sup, títulos h4 a h6).
  paraRevisar: string[];
  avisos: string[];
  temSecaoDeReferencias: boolean;
};

export type ContextoDoPost = {
  // Imagens do corpo esperadas, na ordem do uso postCorpo (posição 1, 2...).
  imagensEsperadas: string[];
  capa: string | null;
};

const DESCARTADOS = new Set(["iframe", "video", "audio", "object", "embed", "script", "style", "svg", "button", "form", "input", "noscript", "canvas", "select", "textarea", "template"]);
const NEGRITO = new Set(["strong", "b"]);
const ITALICO = new Set(["em", "i"]);
const FORMATACAO = new Set(["u", "s", "del", "mark", "small"]);
const BLOCOS_DE_CONTEUDO = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "figure", "table", "pre", "hr", "img", "wow-image", "iframe", "video", "audio", "object", "embed"]);
const ID_DA_MIDIA = /([0-9a-f]{6}_[0-9a-f]{32}(?:~mv2(?:_d_\d+_\d+_s_\d+(?:_\d+)?)?)?\.(?:jpe?g|png|gif|webp|avif))|((?<![0-9a-f])[0-9a-f]{32}\.(?:jpe?g|png))/i;
const HOSTS_DO_SITE_ANTIGO = /(^|\.)(abteescoliose\.com\.br|tratandoescoliose\.com\.br)$/i;
const SECAO_DE_REFERENCIAS = /^(refer[eê]ncias|referencias|bibliografia|references)\b/i;

// Marcas internas da ênfase durante a conversão (viram ** e * no fim). Como
// todo * do texto sai escapado, as marcas nunca se confundem com o texto.
const MARCA_DO_NEGRITO = "\u0001";
const MARCA_DO_ITALICO = "\u0002";
const MARCAS = /[\u0001\u0002]/g;
const TEM_MARCA = /[\u0001\u0002]/;
const MARCA_EM_VOLTA = /^([\u0001\u0002])([^\u0001\u0002]*)\1$/;

function somar(contagem: Record<string, number>, chave: string, quanto = 1) {
  contagem[chave] = (contagem[chave] ?? 0) + quanto;
}

export function escaparTexto(valor: string): string {
  return valor.replace(/[\\[\]*_`]/g, (caractere) => `\\${caractere}`);
}

// Texto como o leitor vê (sem marcas nem escapes), para as listas de links.
function textoVisivel(valor: string): string {
  return valor.replace(MARCAS, "").replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
}

function escaparInicio(linha: string): string {
  return /^(#|>|-|\+|\d+\.)/.test(linha) ? `\\${linha}` : linha;
}

function enderecoSeguro(endereco: string): string {
  return endereco.replace(/[\s()<>]/g, (caractere) => encodeURIComponent(caractere));
}

// Põe a marca em volta do texto, deixando os espaços das pontas do lado de
// fora; cada pedaço entre quebras (<br>) é marcado à parte, porque vira um
// parágrafo próprio.
function envolver(marca: string, conteudo: string): string {
  return conteudo
    .split("\n")
    .map((parte) => {
      const [, antes, meio, depois] = parte.match(/^(\s*)([\s\S]*?)(\s*)$/) as RegExpMatchArray;
      return meio.replace(MARCAS, "").trim() ? `${antes}${marca}${meio}${marca}${depois}` : parte;
    })
    .join("\n");
}

// Ênfase pronta de uma linha: junta marcas seguidas do mesmo tipo (fim de um
// negrito colado ao começo de outro, ou negrito vazio), desfaz a colagem de
// negrito com itálico (**a***b*, que o leitor não separa) e troca as marcas
// por ** e *.
function finalizarEnfase(linha: string, relatorio: RelatorioDaConversao): string {
  let atual = linha;
  let anterior = "";
  while (atual !== anterior) {
    anterior = atual;
    atual = atual.split(MARCA_DO_NEGRITO + MARCA_DO_NEGRITO).join("").split(MARCA_DO_ITALICO + MARCA_DO_ITALICO).join("");
  }
  if (atual.includes(MARCA_DO_NEGRITO + MARCA_DO_ITALICO) || atual.includes(MARCA_DO_ITALICO + MARCA_DO_NEGRITO)) {
    relatorio.enfase.coladaSimplificada++;
    atual = atual.split(MARCA_DO_ITALICO).join("");
  }
  return atual.split(MARCA_DO_NEGRITO).join("**").split(MARCA_DO_ITALICO).join("*");
}

function idDaMidia(no: No): string | null {
  for (const atual of percorrer(no)) {
    for (const nome of ["src", "data-src", "id"]) {
      const valor = atributo(atual, nome);
      const achado = valor ? decodeURIComponent(valor).match(ID_DA_MIDIA) : null;
      if (achado) return achado[0];
    }
  }
  return null;
}

// Caminho no site novo para um caminho do site antigo, quando há destino
// conhecido (posts e produtos pelo slug sem acento; categorias da loja).
export function caminhoNovoDoSiteAntigo(caminho: string): string | null {
  let decodificado: string;
  try {
    decodificado = decodeURIComponent(caminho);
  } catch {
    decodificado = caminho;
  }
  const post = decodificado.match(/^\/post\/([^/?#]+)\/?$/);
  if (post) return `/blog/${gerarSlug(post[1])}`;
  const produto = decodificado.match(/^\/product-page\/([^/?#]+)\/?$/);
  if (produto) return `/loja/produto/${gerarSlug(produto[1])}`;
  const categoria = decodificado.match(/^\/category\/([^/?#]+)\/?$/);
  if (categoria) return { abte: "/loja?categoria=produtos-abte", "produtos-parceiros": "/loja?categoria=produtos-parceiros" }[categoria[1]] ?? "/loja";
  if (/^\/(blogtratandoescoliose|blog)\/?$/.test(decodificado)) return "/blog";
  if (/^\/?$/.test(decodificado)) return "/";
  return null;
}

type Linha = { tipo: "paragrafo" | "titulo2" | "titulo3" | "item" | "itemNumerado" | "citacao" | "imagem"; texto: string; numero?: number };

// Ênfase em que o texto está (negrito e itálico só um nível cada; dentro de
// título e de link, nenhuma marca nova).
type Contexto = { negrito: boolean; italico: boolean; titulo: boolean };
const FORA_DE_ENFASE: Contexto = { negrito: false, italico: false, titulo: false };

export function converterCorpoDoPost(artigoHtml: string, contexto: ContextoDoPost): { ok: true; markdown: string; relatorio: RelatorioDaConversao } | { ok: false; erro: string } {
  const documento = parse(artigoHtml) as unknown as No;
  const corpo = [...percorrer(documento)].find((no) => atributo(no, "data-hook") === "post-description");
  if (!corpo) return { ok: false, erro: 'Corpo do post (data-hook="post-description") não encontrado.' };

  const relatorio: RelatorioDaConversao = {
    blocos: { paragrafos: 0, titulos: 0, itensDeLista: 0, citacoes: 0, imagens: 0 },
    enfase: { negrito: 0, italico: 0, aninhadaSimplificada: 0, emTitulo: 0, emLinkSimplificada: 0, coladaSimplificada: 0 },
    formatacaoDescartada: {},
    adaptados: {},
    descartados: {},
    links: { mantidos: 0, siteAntigoReescritos: 0, internosSemDestinoConhecido: [], wixRemovidos: 0, httpRemovidos: [], outrosRemovidos: [] },
    imagens: { noCorpo: 0, casadas: 0, capaNoCorpo: 0, capaRemovidaDoCorpo: 0, semIdDaMidia: 0, semUsoNoArquivo: [], esperadasNaoAchadas: [] },
    paraRevisar: [],
    avisos: [],
    temSecaoDeReferencias: false,
  };
  const linhas: Linha[] = [];
  // Imagens achadas dentro de um parágrafo ou item de lista: entram logo
  // depois do texto do bloco (o subconjunto não tem imagem no meio do texto).
  let pendentes: No[] = [];
  let proximaEsperada = 0;
  const usadas = new Set<string>();

  // Texto de um elemento em linha; "\n" marca uma quebra (<br>), que vira
  // parágrafo novo (o subconjunto não tem quebra dentro do parágrafo).
  function emLinha(no: No, ctx: Contexto = FORA_DE_ENFASE): string {
    if (no.nodeName === "#text") return escaparTexto((no.value ?? "").replace(/[\s ]+/g, " "));
    const tag = no.tagName ?? "";
    if (!tag) return "";
    if (DESCARTADOS.has(tag)) {
      somar(relatorio.descartados, tag);
      return "";
    }
    if (tag === "br") return "\n";
    if (tag === "figure" || tag === "img" || tag === "wow-image") {
      somar(relatorio.adaptados, "imagem dentro de parágrafo ou item de lista (posta logo depois do texto)");
      pendentes.push(no);
      return "";
    }
    const filhos = (dentro: Contexto) => (no.childNodes ?? []).map((filho) => emLinha(filho, dentro)).join("");
    if (NEGRITO.has(tag) || ITALICO.has(tag)) {
      const negrito = NEGRITO.has(tag);
      const conteudo = filhos(negrito ? { ...ctx, negrito: true } : { ...ctx, italico: true });
      if (!conteudo.replace(MARCAS, "").trim()) return conteudo;
      // Em título, a marca sai (o título já é destacado); dentro de outra
      // ênfase, fica só a de fora.
      if (ctx.titulo) {
        relatorio.enfase.emTitulo++;
        return conteudo;
      }
      if (ctx.negrito || ctx.italico) {
        relatorio.enfase.aninhadaSimplificada++;
        return conteudo;
      }
      relatorio.enfase[negrito ? "negrito" : "italico"]++;
      return envolver(negrito ? MARCA_DO_NEGRITO : MARCA_DO_ITALICO, conteudo);
    }
    if (FORMATACAO.has(tag)) somar(relatorio.formatacaoDescartada, tag);
    if (tag === "sup" || tag === "sub") somar(relatorio.adaptados, `${tag} (nota ou índice, virou texto)`);
    if (tag === "code") somar(relatorio.adaptados, "code (virou texto)");
    const conteudo = filhos(ctx);
    if (tag === "a") return link(no, conteudo);
    return conteudo;
  }

  // Texto do link: a ênfase que cobre o texto inteiro vai para fora do link;
  // outra ênfase dentro dele sai.
  function textoDoLink(conteudo: string): { antes: string; texto: string; depois: string } {
    const visivel = conteudo.replace(/\n/g, " ").trim();
    const inteira = visivel.match(MARCA_EM_VOLTA);
    if (inteira) return { antes: inteira[1], texto: inteira[2].trim(), depois: inteira[1] };
    if (TEM_MARCA.test(visivel)) relatorio.enfase.emLinkSimplificada++;
    return { antes: "", texto: visivel.replace(MARCAS, "").trim(), depois: "" };
  }

  function link(no: No, conteudo: string): string {
    const endereco = (atributo(no, "href") ?? "").trim();
    const { antes, texto, depois } = textoDoLink(conteudo);
    const comLink = (destino: string) => `${antes}[${texto}](${enderecoSeguro(destino)})${depois}`;
    if (!texto) {
      if (endereco) somar(relatorio.adaptados, "link sem texto (descartado)");
      return conteudo;
    }
    if (!endereco || endereco.startsWith("#")) return conteudo;
    if (/^mailto:/i.test(endereco)) {
      relatorio.links.mantidos++;
      return comLink(endereco);
    }
    if (/^tel:/i.test(endereco)) {
      relatorio.links.outrosRemovidos.push("tel:");
      return conteudo;
    }
    let url: URL;
    try {
      url = new URL(endereco, "https://www.abteescoliose.com.br");
    } catch {
      relatorio.links.outrosRemovidos.push("endereço inválido");
      return conteudo;
    }
    if (/wix/i.test(url.hostname) && /static|media|usrfiles/i.test(url.hostname + url.pathname)) {
      relatorio.links.wixRemovidos++;
      return conteudo;
    }
    if (HOSTS_DO_SITE_ANTIGO.test(url.hostname)) {
      const novo = caminhoNovoDoSiteAntigo(url.pathname);
      if (novo) {
        relatorio.links.siteAntigoReescritos++;
        return comLink(novo);
      }
      // Sem destino no site novo: o texto fica e o caminho é listado (resposta 2).
      relatorio.links.internosSemDestinoConhecido.push({ endereco: url.pathname, texto: textoVisivel(texto) });
      return conteudo;
    }
    if (url.protocol === "http:") {
      // O texto fica; o endereço vai para a lista de conferência (resposta 3).
      relatorio.links.httpRemovidos.push({ endereco: url.href, texto: textoVisivel(texto) });
      return conteudo;
    }
    if (url.protocol !== "https:") {
      relatorio.links.outrosRemovidos.push(url.protocol);
      return conteudo;
    }
    relatorio.links.mantidos++;
    return comLink(url.href);
  }

  function descarregarImagens() {
    const lista = pendentes;
    pendentes = [];
    for (const no of lista) imagemComLegenda(no);
  }

  function adicionarTexto(tipo: Linha["tipo"], bruto: string, numero?: number) {
    const partes = bruto.split("\n").map((parte) => parte.replace(/ {2,}/g, " ").trim()).filter((parte) => parte.replace(MARCAS, "").trim());
    if (partes.length > 1) somar(relatorio.adaptados, "quebra de linha (virou parágrafo novo)", partes.length - 1);
    partes.forEach((parte, i) => {
      if (SECAO_DE_REFERENCIAS.test(textoVisivel(parte))) relatorio.temSecaoDeReferencias = true;
      linhas.push({ tipo: i === 0 ? tipo : tipo === "titulo2" || tipo === "titulo3" ? tipo : tipo === "item" || tipo === "itemNumerado" ? "paragrafo" : tipo, texto: finalizarEnfase(parte, relatorio), numero });
    });
    descarregarImagens();
  }

  // false quando a imagem não entra no Markdown (a legenda também não).
  function imagem(no: No): boolean {
    relatorio.imagens.noCorpo++;
    const primeira = relatorio.imagens.noCorpo === 1;
    const id = idDaMidia(no);
    if (!id) {
      relatorio.imagens.semIdDaMidia++;
      relatorio.avisos.push(`Imagem ${relatorio.imagens.noCorpo} do corpo sem id de mídia do Wix: descartada.`);
      return false;
    }
    // A primeira imagem do corpo igual à capa sai (resposta 4).
    if (primeira && id === contexto.capa && !contexto.imagensEsperadas.includes(id)) {
      relatorio.imagens.capaRemovidaDoCorpo++;
      return false;
    }
    const esperada = contexto.imagensEsperadas[proximaEsperada];
    if (id === esperada) proximaEsperada++;
    else if (contexto.imagensEsperadas.includes(id)) {
      relatorio.avisos.push(`Imagem ${relatorio.imagens.noCorpo} do corpo está em outra posição no imagens-origem.json (posição ${contexto.imagensEsperadas.indexOf(id) + 1}).`);
    } else if (id === contexto.capa) {
      relatorio.imagens.capaNoCorpo++;
    } else {
      relatorio.imagens.semUsoNoArquivo.push(id);
      relatorio.avisos.push(`Imagem ${relatorio.imagens.noCorpo} do corpo não está no imagens-origem.json (não importada): descartada.`);
      return false;
    }
    if (id !== contexto.capa || contexto.imagensEsperadas.includes(id)) {
      relatorio.imagens.casadas++;
      usadas.add(id);
    }
    const alt = [...percorrer(no)].map((atual) => (atual.tagName === "img" ? atributo(atual, "alt") ?? "" : "")).find((valor) => valor.trim()) ?? "";
    const altUtil = alt && !/\.(jpe?g|png|gif|webp|avif)$/i.test(alt.trim()) ? alt.replace(/\s+/g, " ").trim() : "";
    linhas.push({ tipo: "imagem", texto: `![${escaparTexto(altUtil)}](midia:wix:${id})` });
    return true;
  }

  function imagemComLegenda(no: No) {
    const entrou = imagem(no);
    const legenda = [...percorrer(no)].find((atual) => atual.tagName === "figcaption");
    if (legenda) {
      const conteudo = (legenda.childNodes ?? []).map((filho) => emLinha(filho)).join("");
      if (!conteudo.replace(MARCAS, "").trim()) return;
      if (!entrou) {
        // A legenda de uma imagem que saiu não faz sentido sozinha.
        somar(relatorio.descartados, "legenda de imagem que saiu");
        return;
      }
      adicionarTexto("paragrafo", conteudo);
      somar(relatorio.adaptados, "legenda de imagem (virou parágrafo)");
    }
  }

  function lista(no: No, numerada: boolean, nivel: number) {
    let numero = 0;
    for (const filho of no.childNodes ?? []) {
      if (filho.tagName !== "li") continue;
      numero++;
      const subListas = (filho.childNodes ?? []).filter((neto) => neto.tagName === "ul" || neto.tagName === "ol");
      const semSubListas: No = { ...filho, childNodes: (filho.childNodes ?? []).filter((neto) => neto.tagName !== "ul" && neto.tagName !== "ol") };
      const conteudo = blocosEmLinha(semSubListas);
      if (conteudo.replace(MARCAS, "").trim()) adicionarTexto(numerada ? "itemNumerado" : "item", conteudo, numero);
      else descarregarImagens();
      if (nivel > 0) somar(relatorio.adaptados, "item de lista aninhada (achatado)");
      for (const sub of subListas) lista(sub, sub.tagName === "ol", nivel + 1);
    }
  }

  // Texto em linha de um bloco que pode ter <p> dentro (ex.: <li><p>...</p></li>).
  function blocosEmLinha(no: No, ctx: Contexto = FORA_DE_ENFASE): string {
    return (no.childNodes ?? [])
      .map((filho) => (filho.tagName === "p" || filho.tagName === "div" ? `${blocosEmLinha(filho, ctx)}\n` : emLinha(filho, ctx)))
      .join("");
  }

  // Tem, em qualquer profundidade, um elemento de bloco de verdade (não só
  // div e span, que o Wix usa em volta de tudo)?
  function temBloco(no: No): boolean {
    return [...percorrer(no)].slice(1).some((atual) => Boolean(atual.tagName && BLOCOS_DE_CONTEUDO.has(atual.tagName)));
  }

  function bloco(no: No) {
    if (no.nodeName === "#text") {
      if ((no.value ?? "").trim()) adicionarTexto("paragrafo", emLinha(no));
      return;
    }
    const tag = no.tagName ?? "";
    if (!tag) return;
    if (DESCARTADOS.has(tag)) {
      somar(relatorio.descartados, tag);
      return;
    }
    if (tag === "hr") {
      somar(relatorio.descartados, "hr (divisor)");
      return;
    }
    if (tag === "figure" || tag === "img" || tag === "wow-image") {
      imagemComLegenda(no);
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      const nivel = Number(tag[1]);
      if (nivel === 1) somar(relatorio.adaptados, "h1 no corpo (virou ##)");
      if (nivel >= 4) {
        somar(relatorio.adaptados, `${tag} (virou ###)`);
        relatorio.paraRevisar.push(`título ${tag} virou ### (conferir o nível)`);
      }
      adicionarTexto(nivel <= 2 ? "titulo2" : "titulo3", blocosEmLinha(no, { ...FORA_DE_ENFASE, titulo: true }));
      return;
    }
    if (tag === "ul" || tag === "ol") {
      lista(no, tag === "ol", 0);
      return;
    }
    if (tag === "blockquote") {
      const conteudo = blocosEmLinha(no);
      if (conteudo.replace(MARCAS, "").trim()) {
        for (const parte of conteudo.split("\n").map((linha) => linha.trim()).filter((linha) => linha.replace(MARCAS, "").trim())) linhas.push({ tipo: "citacao", texto: finalizarEnfase(parte, relatorio) });
        relatorio.blocos.citacoes++;
      }
      return;
    }
    if (tag === "table") {
      somar(relatorio.adaptados, "tabela (cada linha virou um parágrafo, células separadas por ponto e vírgula)");
      for (const linhaDaTabela of [...percorrer(no)].filter((atual) => atual.tagName === "tr")) {
        const celulas = (linhaDaTabela.childNodes ?? []).filter((celula) => celula.tagName === "td" || celula.tagName === "th").map((celula) => blocosEmLinha(celula).replace(/\n/g, " ").trim());
        if (celulas.some(Boolean)) adicionarTexto("paragrafo", celulas.join("; "));
      }
      return;
    }
    if (tag === "pre") {
      somar(relatorio.adaptados, "pre (virou parágrafo)");
      adicionarTexto("paragrafo", blocosEmLinha(no));
      return;
    }
    if (tag === "p" || !temBloco(no)) {
      adicionarTexto("paragrafo", blocosEmLinha(no));
      return;
    }
    for (const filho of no.childNodes ?? []) bloco(filho);
  }

  for (const filho of corpo.childNodes ?? []) bloco(filho);
  descarregarImagens();

  for (const id of contexto.imagensEsperadas) {
    if (!usadas.has(id)) {
      relatorio.imagens.esperadasNaoAchadas.push(id);
      relatorio.avisos.push(`Imagem esperada (posição ${contexto.imagensEsperadas.indexOf(id) + 1} do uso postCorpo) não foi achada no corpo.`);
    }
  }
  const notas = relatorio.adaptados["sup (nota ou índice, virou texto)"] ?? 0;
  if (notas) relatorio.paraRevisar.push(`${notas} nota(s) em sup viraram texto colado (conferir as referências)`);

  relatorio.blocos.paragrafos = linhas.filter((linha) => linha.tipo === "paragrafo").length;
  relatorio.blocos.titulos = linhas.filter((linha) => linha.tipo === "titulo2" || linha.tipo === "titulo3").length;
  relatorio.blocos.itensDeLista = linhas.filter((linha) => linha.tipo === "item" || linha.tipo === "itemNumerado").length;
  relatorio.blocos.imagens = linhas.filter((linha) => linha.tipo === "imagem").length;

  const saida: string[] = [];
  linhas.forEach((linha, i) => {
    const anterior = linhas[i - 1];
    const mesmaLista = anterior && ((linha.tipo === "item" && anterior.tipo === "item") || (linha.tipo === "itemNumerado" && anterior.tipo === "itemNumerado") || (linha.tipo === "citacao" && anterior.tipo === "citacao"));
    if (i > 0) saida.push(mesmaLista ? "\n" : "\n\n");
    if (linha.tipo === "titulo2") saida.push(`## ${linha.texto}`);
    else if (linha.tipo === "titulo3") saida.push(`### ${linha.texto}`);
    else if (linha.tipo === "item") saida.push(`- ${linha.texto}`);
    else if (linha.tipo === "itemNumerado") saida.push(`${linha.numero ?? 1}. ${linha.texto}`);
    else if (linha.tipo === "citacao") saida.push(`> ${linha.texto}`);
    else if (linha.tipo === "imagem") saida.push(linha.texto);
    else saida.push(escaparInicio(linha.texto));
  });
  return { ok: true, markdown: `${saida.join("")}\n`, relatorio };
}
