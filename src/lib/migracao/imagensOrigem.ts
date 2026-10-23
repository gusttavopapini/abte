// Entrada da migração das imagens do site antigo (etapa 6), pura e sem
// dependências: validação de docs/dados-privados/imagens-origem.json, leitura
// dos títulos e nomes do mapa-site-antigo.jsonl e texto alternativo
// provisório. Os arquivos de entrada têm dados pessoais e ficam fora do Git;
// as mensagens de erro citam só posições e valores que não são pessoais.
// Testado em testes/unidade/migracao.test.mts.

export const TIPOS_DE_USO = ["profissional", "post", "postCorpo", "produto", "artigo", "categoriaDeProduto", "diretoria", "pagina"] as const;
export type TipoDeUso = (typeof TIPOS_DE_USO)[number];

export const PAPEIS_DE_USO = ["foto", "capa", "corpo", "galeria", "imagem", "conteudo", "compartilhamento"] as const;
export const PRIORIDADES = ["alta", "media", "baixa"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

// Logo, menu e ícones do layout do Wix: nunca importados (proteção; nenhum
// deles está no arquivo de 21/10/2026).
export const PREFIXOS_DE_LAYOUT = ["b3206b", "ecc471", "0a5ee7", "6fc301", "1966d4", "11062b"] as const;

// Id de mídia do Wix, sem host nem caminho. Formatos vistos no site antigo:
// "xxxxxx_<32 hex>~mv2.jpg" (o comum), o mesmo com "_d_<largura>_<altura>_s_<n>"
// depois de "~mv2", "xxxxxx_<32 hex>.jpg" e "<32 hex>.jpg" (mais antigos).
// Só letras, números, "_", "~" e ".": não há como apontar para outro servidor.
const FORMATO_DO_ID = /^(?:[0-9a-f]{6}_)?[0-9a-f]{32}(?:~mv2(?:_d_\d{1,5}_\d{1,5}_s_\d{1,2}(?:_\d{1,2})?)?)?\.(jpe?g|png|gif|avif|webp)$/;

export type UsoDeOrigem = { tipo: TipoDeUso; chaveDeOrigem: string; rotulo: string; posicao: number; papel: string | null };

export type ImagemDeOrigem = {
  midiaIdWix: string;
  usos: UsoDeOrigem[];
  altNoSiteAntigo: string | null;
  observacao: string | null;
  prioridade: Prioridade | null;
};

export function ehIdDeMidiaWix(valor: unknown): valor is string {
  return typeof valor === "string" && FORMATO_DO_ID.test(valor);
}

export function ehDoLayout(id: string): boolean {
  return PREFIXOS_DE_LAYOUT.some((prefixo) => id.startsWith(`${prefixo}_`));
}

// Tipo esperado pela extensão do id. Só uma previsão: a decisão é sempre pela
// assinatura do arquivo baixado.
export function formatoPrevisto(id: string): "jpeg" | "png" | "webp" | "gif" | "avif" {
  const extensao = id.slice(id.lastIndexOf(".") + 1);
  return extensao === "jpg" || extensao === "jpeg" ? "jpeg" : (extensao as "png" | "webp" | "gif" | "avif");
}

export function previstoComoRecusado(id: string): boolean {
  const formato = formatoPrevisto(id);
  return formato === "gif" || formato === "avif";
}

const ehTexto = (valor: unknown, maximo: number): valor is string => typeof valor === "string" && valor.trim() !== "" && valor.length <= maximo;
const ehOpcional = (valor: unknown, lista: readonly string[]) => valor === undefined || valor === null || (typeof valor === "string" && lista.includes(valor));

// Confere o arquivo inteiro e devolve todas as falhas de uma vez (com a
// posição), para corrigir de uma só vez. Tipo, papel ou prioridade fora das
// listas, id fora do formato, id do layout e id repetido são recusados.
export function validarImagensOrigem(dados: unknown): { ok: true; imagens: ImagemDeOrigem[] } | { ok: false; erros: string[] } {
  const erros: string[] = [];
  if (typeof dados !== "object" || dados === null) return { ok: false, erros: ["O arquivo não é um objeto JSON."] };
  const raiz = dados as Record<string, unknown>;
  if (raiz.versao !== 1) erros.push(`versao precisa ser 1 (veio ${JSON.stringify(raiz.versao)}).`);
  if (!Array.isArray(raiz.imagens) || raiz.imagens.length === 0) return { ok: false, erros: [...erros, "imagens precisa ser uma lista com pelo menos uma imagem."] };

  const vistos = new Set<string>();
  const imagens: ImagemDeOrigem[] = [];
  raiz.imagens.forEach((bruta: unknown, i: number) => {
    const onde = `imagens[${i}]`;
    if (typeof bruta !== "object" || bruta === null) {
      erros.push(`${onde}: não é um objeto.`);
      return;
    }
    const imagem = bruta as Record<string, unknown>;
    const id = imagem.midiaIdWix;
    if (!ehIdDeMidiaWix(id)) erros.push(`${onde}.midiaIdWix fora do formato de id do Wix.`);
    else if (ehDoLayout(id)) erros.push(`${onde}.midiaIdWix é do layout do site antigo (logo, menu ou ícone) e não pode ser importado.`);
    else if (vistos.has(id)) erros.push(`${onde}.midiaIdWix repetido (cada imagem aparece uma vez, com vários usos).`);
    if (typeof id === "string") vistos.add(id);
    if (!ehOpcional(imagem.prioridade, PRIORIDADES)) erros.push(`${onde}.prioridade desconhecida: ${JSON.stringify(imagem.prioridade)}.`);
    for (const campo of ["altNoSiteAntigo", "observacao"]) {
      if (imagem[campo] !== undefined && imagem[campo] !== null && typeof imagem[campo] !== "string") erros.push(`${onde}.${campo} precisa ser texto ou null.`);
    }

    const usos: UsoDeOrigem[] = [];
    if (!Array.isArray(imagem.usos) || imagem.usos.length === 0) erros.push(`${onde}.usos precisa ter pelo menos um uso.`);
    else {
      const chaves = new Set<string>();
      imagem.usos.forEach((brutoDoUso: unknown, j: number) => {
        const ondeDoUso = `${onde}.usos[${j}]`;
        const uso = (typeof brutoDoUso === "object" && brutoDoUso !== null ? brutoDoUso : {}) as Record<string, unknown>;
        const tipoValido = typeof uso.tipo === "string" && (TIPOS_DE_USO as readonly string[]).includes(uso.tipo);
        if (!tipoValido) erros.push(`${ondeDoUso}.tipo desconhecido: ${JSON.stringify(uso.tipo)}.`);
        if (!ehTexto(uso.chaveDeOrigem, 200)) erros.push(`${ondeDoUso}.chaveDeOrigem precisa ser texto (até 200 caracteres).`);
        if (!ehTexto(uso.rotulo, 300)) erros.push(`${ondeDoUso}.rotulo precisa ser texto (até 300 caracteres).`);
        if (!Number.isInteger(uso.posicao) || (uso.posicao as number) < 1) erros.push(`${ondeDoUso}.posicao precisa ser um inteiro a partir de 1.`);
        if (!ehOpcional(uso.papel, PAPEIS_DE_USO)) erros.push(`${ondeDoUso}.papel desconhecido: ${JSON.stringify(uso.papel)}.`);
        const chave = `${String(uso.tipo)}|${String(uso.chaveDeOrigem)}|${String(uso.posicao)}`;
        if (chaves.has(chave)) erros.push(`${ondeDoUso}: uso repetido (mesmo tipo, chave e posição).`);
        chaves.add(chave);
        usos.push({
          tipo: uso.tipo as TipoDeUso,
          chaveDeOrigem: String(uso.chaveDeOrigem ?? "").trim(),
          rotulo: String(uso.rotulo ?? "").trim(),
          posicao: Number(uso.posicao),
          papel: typeof uso.papel === "string" ? uso.papel : null,
        });
      });
    }
    imagens.push({
      midiaIdWix: String(id),
      usos,
      altNoSiteAntigo: typeof imagem.altNoSiteAntigo === "string" ? imagem.altNoSiteAntigo : null,
      observacao: typeof imagem.observacao === "string" ? imagem.observacao : null,
      prioridade: (imagem.prioridade as Prioridade | undefined) ?? null,
    });
  });
  return erros.length > 0 ? { ok: false, erros } : { ok: true, imagens };
}

// Títulos e nomes do mapa do site antigo, só os que entram no alt: títulos
// dos posts, nomes dos produtos, nomes da diretoria (pelo cargo) e títulos
// das categorias (pelo slug do endereço /category/<slug>).
export type MapaParaAlt = {
  posts: Map<string, string>;
  produtos: Map<string, string>;
  diretoria: Map<string, string>;
  categorias: Map<string, string>;
};

export function lerMapaParaAlt(conteudo: string): { ok: true; mapa: MapaParaAlt } | { ok: false; erros: string[] } {
  const mapa: MapaParaAlt = { posts: new Map(), produtos: new Map(), diretoria: new Map(), categorias: new Map() };
  const erros: string[] = [];
  conteudo.split("\n").forEach((linha, i) => {
    if (linha.trim() === "") return;
    let registro: Record<string, unknown>;
    try {
      registro = JSON.parse(linha);
    } catch {
      erros.push(`Linha ${i + 1} do mapa não é JSON.`);
      return;
    }
    const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");
    if (registro.tipo === "post" && texto(registro.slug) && texto(registro.titulo)) mapa.posts.set(texto(registro.slug), texto(registro.titulo));
    if (registro.tipo === "produto" && texto(registro.slug) && texto(registro.nome)) mapa.produtos.set(texto(registro.slug), texto(registro.nome));
    if (registro.tipo === "diretoria" && texto(registro.cargo) && texto(registro.nome)) mapa.diretoria.set(texto(registro.cargo), texto(registro.nome));
    const endereco = texto(registro.url);
    if (registro.tipo === "categoria" && endereco.startsWith("/category/") && texto(registro.titulo)) {
      // "Produtos ABTE | ABTE" vira "Produtos ABTE".
      mapa.categorias.set(endereco.slice("/category/".length), texto(registro.titulo).split(" | ")[0].trim());
    }
  });
  return erros.length > 0 ? { ok: false, erros } : { ok: true, mapa };
}

export const LIMITE_DO_ALT_PROVISORIO = 200;

// Ordem de preferência quando a imagem tem vários usos: vale o primeiro.
const ORDEM_DOS_TIPOS: TipoDeUso[] = ["profissional", "diretoria", "produto", "post", "postCorpo", "artigo", "categoriaDeProduto", "pagina"];

// Cargos da diretoria 2025-2027 como aparecem no texto (chave do mapa).
const CARGOS: Record<string, string> = {
  presidente: "presidente",
  "vice-presidente": "vice-presidente",
  "secretaria-geral": "secretária-geral",
  "diretora-financeira": "diretora financeira",
  "diretora-de-ensino-e-pesquisa": "diretora de ensino e pesquisa",
  "diretora-de-comunicacao-e-marketing": "diretora de comunicação e marketing",
  "coordenadora-da-comissao-de-membros": "coordenadora da comissão de membros",
};

// Páginas do site antigo (chave do arquivo de imagens).
const PAGINAS: Record<string, string> = {
  home: "Imagem da página inicial",
  especialidades: "Imagem da página Especialidades",
  contato: "Imagem da página Contato",
  "paginas-de-profissionais": "Imagem das páginas de profissionais",
  cartilha: "Imagem da página Cartilha",
  triagem: "Imagem da página Triagem",
  outros: "Imagem da página Outros profissionais",
  "nossa-historia": "Imagem da página Nossa história",
  blog: "Imagem da página do blog",
};

export type RegraDoAlt = TipoDeUso | "paginaGenerica" | "postCorpoAltAntigo";

function limitar(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length <= LIMITE_DO_ALT_PROVISORIO ? limpo : `${limpo.slice(0, LIMITE_DO_ALT_PROVISORIO - 1).trimEnd()}…`;
}

// Total de imagens de cada produto (para "imagem n de total").
export function contarImagensPorProduto(imagens: ImagemDeOrigem[]): Map<string, number> {
  const total = new Map<string, number>();
  for (const imagem of imagens) for (const uso of imagem.usos) if (uso.tipo === "produto") total.set(uso.chaveDeOrigem, (total.get(uso.chaveDeOrigem) ?? 0) + 1);
  return total;
}

// O alt do site antigo parece nome de arquivo? Sublinhado, extensão de
// imagem, sufixo de câmera ou de editor (IMG, DSC, "edited", "copy",
// "Design sem nome"...), sequência longa de números ou trecho hexadecimal
// (hash), ou uma palavra só com hífens, como um slug.
export function altPareceNomeDeArquivo(alt: string): boolean {
  const limpo = alt.trim();
  return (
    limpo.includes("_") ||
    /\.(jpe?g|png|gif|webp|avif|heic|heif|tiff?|bmp|svg)\b/i.test(limpo) ||
    /\b(img|dsc|dscn|dcim|pxl|mvimg|screenshot|captura de tela|whatsapp image|design sem nome|sem t[ií]tulo|untitled|edited|editada|copy|c[óo]pia)\b/i.test(limpo) ||
    /\d{6,}/.test(limpo) ||
    /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/i.test(limpo) ||
    /^[\p{L}\d]+(-[\p{L}\d]+)+$/u.test(limpo)
  );
}

// Alt do site antigo aproveitável (resposta 2 de 22/10/2026): existe, cabe
// no limite e não parece nome de arquivo. Senão, null.
export function altAproveitavelDoSiteAntigo(alt: string | null): string | null {
  const limpo = alt?.replace(/\s+/g, " ").trim() ?? "";
  return limpo && limpo.length <= LIMITE_DO_ALT_PROVISORIO && !altPareceNomeDeArquivo(limpo) ? limpo : null;
}

// Alt da imagem importada. Em geral, PROVISÓRIO (altProvisorio = true no
// documento), para revisão humana. Exceção (resposta 2 de 22/10/2026): imagem
// cujo uso que vale é o corpo de um post e que tinha no site antigo um alt
// aproveitável usa esse alt, sem marcar como provisório (provisorio false).
// Os alts dos outros tipos não são usados (no arquivo, podem estar cortados).
// semDadoNoMapa: o título ou nome não foi achado no mapa e o alt usou a chave.
export function montarAltProvisorio(
  imagem: ImagemDeOrigem,
  mapa: MapaParaAlt,
  imagensPorProduto: Map<string, number>,
): { alt: string; regra: RegraDoAlt; semDadoNoMapa: boolean; provisorio: boolean } {
  const uso = [...imagem.usos].sort((a, b) => ORDEM_DOS_TIPOS.indexOf(a.tipo) - ORDEM_DOS_TIPOS.indexOf(b.tipo) || a.posicao - b.posicao)[0];
  const antigo = uso.tipo === "postCorpo" ? altAproveitavelDoSiteAntigo(imagem.altNoSiteAntigo) : null;
  if (antigo) return { alt: antigo, regra: "postCorpoAltAntigo", semDadoNoMapa: false, provisorio: false };
  return { ...altPorRegra(uso, mapa, imagensPorProduto), provisorio: true };
}

function altPorRegra(uso: UsoDeOrigem, mapa: MapaParaAlt, imagensPorProduto: Map<string, number>): { alt: string; regra: RegraDoAlt; semDadoNoMapa: boolean } {
  const chave = uso.chaveDeOrigem;
  const doMapa = (lista: Map<string, string>) => lista.get(chave);
  switch (uso.tipo) {
    case "profissional":
      return { alt: limitar(`Foto de ${uso.rotulo}`), regra: "profissional", semDadoNoMapa: false };
    case "diretoria": {
      const nome = doMapa(mapa.diretoria);
      const cargo = CARGOS[chave] ?? chave.replaceAll("-", " ");
      return { alt: limitar(`Foto de ${nome ?? uso.rotulo}, ${cargo}`), regra: "diretoria", semDadoNoMapa: !nome };
    }
    case "produto": {
      const nome = doMapa(mapa.produtos);
      const total = imagensPorProduto.get(chave) ?? uso.posicao;
      return { alt: limitar(`${nome ?? uso.rotulo}, imagem ${uso.posicao} de ${total}`), regra: "produto", semDadoNoMapa: !nome };
    }
    case "post": {
      const titulo = doMapa(mapa.posts);
      return { alt: limitar(`Capa do post: ${titulo ?? uso.rotulo}`), regra: "post", semDadoNoMapa: !titulo };
    }
    case "postCorpo": {
      const titulo = doMapa(mapa.posts);
      return { alt: limitar(`Imagem do post: ${titulo ?? uso.rotulo}`), regra: "postCorpo", semDadoNoMapa: !titulo };
    }
    case "artigo":
      // O título real está dentro da imagem e do PDF: não é inventado.
      return { alt: limitar(`Imagem do artigo: título a confirmar (${chave.replaceAll("-", " ")})`), regra: "artigo", semDadoNoMapa: false };
    case "categoriaDeProduto": {
      const nome = doMapa(mapa.categorias);
      return { alt: limitar(`Imagem da categoria ${nome ?? uso.rotulo}`), regra: "categoriaDeProduto", semDadoNoMapa: !nome };
    }
    case "pagina":
      return PAGINAS[chave]
        ? { alt: PAGINAS[chave], regra: "pagina", semDadoNoMapa: false }
        : { alt: "Imagem do site, a descrever", regra: "paginaGenerica", semDadoNoMapa: false };
  }
}
