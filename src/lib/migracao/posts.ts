// Importação dos posts do blog do site antigo (etapa 6, degrau 4b), a partir
// do Markdown restrito já convertido (npm run migracao:converter-posts). Todos
// entram como rascunho e com revisarMigracao = true (o resumo é sempre
// conferido por uma pessoa). Idempotente por origem.chave (slug antigo).
//
// Decisões de 22/10/2026: o slug novo é o antigo sem acento (gerarSlug do slug
// do Wix, nunca regerado do título), e colisão impede a gravação; o resumo é
// a meta description escrita à mão na página antiga ou, sem ela (ou com a
// automática do Wix, que é só o começo do texto), o primeiro parágrafo até
// cerca de 160 caracteres; as imagens midia:wix:<id> viram midia:<id do
// documento em midias> (origem.midiaId); imagem ainda não importada (ou na
// lixeira) fica como está, sem aparecer no site, e marca o post; a sugestão
// de autor vem da foto do autor no site antigo, quando ela é a foto de um
// profissional já importado, ou, sem ela, da assinatura (nome completo de um
// profissional no fim do texto, antes das referências; 23/10/2026). Só
// revisão, nunca aparece no site.
//
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/migrar-posts.mts) e nos testes no emulador. As partes puras são
// testadas em testes/unidade/migracao-posts-importacao.test.mts.
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { COLECAO_POSTS } from "../gravacao/posts.ts";
import { COLECAO_PROFISSIONAIS } from "../gravacao/profissionais.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { lerMarkdownRestrito, textoDoMarkdown } from "../markdownRestrito.ts";
import { gerarSlug } from "../slug.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { SISTEMA_DE_ORIGEM, imagensImportadas } from "./imagens.ts";
import { previstoComoRecusado, type ImagemDeOrigem } from "./imagensOrigem.ts";
import type { Redirecionamento } from "./produtos.ts";
import { idiomaDoPost, type PostDoMapa } from "./postsConversao.ts";

export const MENSAGEM_SEM_IMAGENS_DOS_POSTS = "Nenhuma imagem importada do site antigo no projeto: rode antes a migração das imagens (npm run migracao:imagens). Nada foi gravado.";

// Tamanho de referência do resumo tirado do primeiro parágrafo.
export const TAMANHO_DO_RESUMO = 160;
// Palavras por minuto do tempo de leitura (texto corrido em português).
export const PALAVRAS_POR_MINUTO = 200;

// O que a conversão deixou para a importação (posts-convertidos/indice.json).
export type PostConvertido = {
  doMapa: PostDoMapa;
  markdown: string;
  descricaoMeta: string | null;
  fotoDoAutorWix: string | null;
  capaRemovidaDoCorpo: boolean;
  paraRevisar: string[];
};

// Slug novo: o antigo sem acento, sempre o mesmo para o mesmo post.
export function slugNovoDoPost(slugAntigo: string): string {
  return gerarSlug(slugAntigo) || "post";
}

// Texto sem espaços e em minúsculas, para comparar a meta description com o
// corpo: o Wix junta os parágrafos sem espaço ao gerar a meta automática.
function compacto(texto: string): string {
  return texto.normalize("NFC").toLowerCase().replace(/\s+/g, "");
}

// Meta description automática do Wix (resposta 1 de 22/10/2026): é só o
// começo do texto do post (muitas vezes cortado em 500 caracteres, no meio da
// palavra). Vale como inexistente; a escrita à mão fica.
export function ehMetaAutomaticaDoWix(descricaoMeta: string, markdown: string): boolean {
  const meta = compacto(descricaoMeta.replace(/(\.\.\.|…)\s*$/, ""));
  return meta !== "" && compacto(textoDoMarkdown(lerMarkdownRestrito(markdown)).join("")).startsWith(meta);
}

// Resumo: a meta description escrita à mão na página antiga ou, sem ela (ou
// com a automática do Wix), o primeiro parágrafo até cerca de 160
// caracteres, cortado no fim de uma palavra (com "..." quando cortado; nunca
// no meio da palavra).
export function resumoDoPost(
  markdown: string,
  descricaoMeta: string | null,
): { resumo: string; fonte: "meta" | "primeiroParagrafo" | "vazio"; metaAutomaticaIgnorada: boolean } {
  const meta = descricaoMeta?.replace(/\s+/g, " ").trim() ?? "";
  const automatica = meta !== "" && ehMetaAutomaticaDoWix(meta, markdown);
  if (meta && !automatica) return { resumo: meta, fonte: "meta", metaAutomaticaIgnorada: false };
  const primeiro = lerMarkdownRestrito(markdown).find((bloco) => bloco.tipo === "paragrafo");
  const texto = primeiro ? textoDoMarkdown([primeiro])[0].replace(/\s+/g, " ").trim() : "";
  if (!texto) return { resumo: "", fonte: "vazio", metaAutomaticaIgnorada: automatica };
  if (texto.length <= TAMANHO_DO_RESUMO) return { resumo: texto, fonte: "primeiroParagrafo", metaAutomaticaIgnorada: automatica };
  // Último espaço até 160; sem nenhum (uma palavra enorme), o primeiro depois.
  const antes = texto.lastIndexOf(" ", TAMANHO_DO_RESUMO);
  const depois = texto.indexOf(" ", TAMANHO_DO_RESUMO);
  const corte = antes > 0 ? antes : depois;
  if (corte < 0) return { resumo: texto, fonte: "primeiroParagrafo", metaAutomaticaIgnorada: automatica };
  const inicio = texto.slice(0, corte).replace(/[\s,;:.!?…-]+$/, "");
  return { resumo: `${inicio}...`, fonte: "primeiroParagrafo", metaAutomaticaIgnorada: automatica };
}

// Minutos de leitura do texto (sem as imagens), no mínimo 1.
export function tempoDeLeitura(markdown: string): number {
  const palavras = textoDoMarkdown(lerMarkdownRestrito(markdown)).join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palavras / PALAVRAS_POR_MINUTO));
}

// Troca midia:wix:<id> pelo id do documento em midias, quando a imagem já foi
// importada; as outras ficam como estão (não aparecem no site) e são listadas.
export function trocarImagens(markdown: string, idDaImagem: (midiaIdWix: string) => string | null): { conteudo: string; ligadas: number; pendentes: string[] } {
  let ligadas = 0;
  const pendentes: string[] = [];
  const conteudo = markdown.replace(/^(!\[(?:\\.|[^\]\\])*\]\(midia:)wix:([^)\s]+)\)$/gm, (todo, inicio: string, midiaIdWix: string) => {
    const id = idDaImagem(midiaIdWix);
    if (!id) {
      pendentes.push(midiaIdWix);
      return todo;
    }
    ligadas++;
    return `${inicio}${id})`;
  });
  return { conteudo, ligadas, pendentes };
}

// Redirecionamentos do blog antigo para o novo, para a etapa 9 (NADA é
// ativado aqui). O slug antigo com acento entra decodificado e codificado.
export function redirecionamentosDoBlog(posts: { slugAntigo: string; slugNovo: string }[]): Redirecionamento[] {
  const lista: Redirecionamento[] = [];
  for (const { slugAntigo, slugNovo } of posts) {
    const para = `/blog/${slugNovo}`;
    lista.push({ de: `/post/${slugAntigo}`, para, tipo: "post" });
    const codificado = `/post/${encodeURIComponent(slugAntigo)}`;
    if (codificado !== `/post/${slugAntigo}`) lista.push({ de: codificado, para, tipo: "post" });
  }
  lista.push({ de: "/blogtratandoescoliose", para: "/blog", tipo: "blog" });
  return lista;
}

// Posts cuja foto do autor no site antigo é só a de alguém da diretoria
// (resposta 3 de 22/10/2026): a sugestão de autor fica vazia (o campo aceita
// só profissional) e estes pares (slug do post e cargo, que é a chave da
// diretoria no mapa) vão para docs/dados-privados/, para religar depois.
export function sugestoesPelaDiretoria(posts: PostConvertido[], imagensDeOrigem: ImagemDeOrigem[]): { slugAntigo: string; slugNovo: string; cargos: string[] }[] {
  return posts.flatMap((post) => {
    const usos = imagensDeOrigem.find((imagem) => imagem.midiaIdWix === post.fotoDoAutorWix)?.usos ?? [];
    if (!post.fotoDoAutorWix || usos.some((uso) => uso.tipo === "profissional")) return [];
    const cargos = [...new Set(usos.filter((uso) => uso.tipo === "diretoria").map((uso) => uso.chaveDeOrigem))];
    return cargos.length ? [{ slugAntigo: post.doMapa.slug, slugNovo: slugNovoDoPost(post.doMapa.slug), cargos }] : [];
  });
}

// Foto do autor no site antigo: vale só a foto de um profissional (uma chave só).
export type FotoDoAutor = { tipo: "profissional"; chave: string } | { tipo: "ambigua" | "soDiretoria" | "semCorrespondencia" | "semFoto" };

export function fotoDoAutorNaOrigem(midiaIdWix: string | null, imagensDeOrigem: ImagemDeOrigem[]): FotoDoAutor {
  if (!midiaIdWix) return { tipo: "semFoto" };
  const usos = imagensDeOrigem.find((imagem) => imagem.midiaIdWix === midiaIdWix)?.usos ?? [];
  const chaves = [...new Set(usos.filter((uso) => uso.tipo === "profissional").map((uso) => uso.chaveDeOrigem))];
  if (chaves.length === 1) return { tipo: "profissional", chave: chaves[0] };
  if (chaves.length > 1) return { tipo: "ambigua" };
  return usos.some((uso) => uso.tipo === "diretoria") ? { tipo: "soDiretoria" } : { tipo: "semCorrespondencia" };
}

// Profissional do arquivo privado profissionais.json: a chave (origem.chave
// do documento depois da migração) e o nome completo.
export type ProfissionalDoArquivo = { chave: string; nome: string };

const SECAO_DE_REFERENCIAS = /^(refer[eê]ncias|referencias|bibliografia|references)\b/i;
// Blocos de texto do fim do post em que a assinatura é procurada.
export const BLOCOS_DA_ASSINATURA = 3;

// Texto para comparar nomes: sem acento, minúsculo, só letras e números
// separados por um espaço, com espaço nas pontas (para casar palavras inteiras).
function paraBusca(texto: string): string {
  return ` ${texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\d]+/gu, " ").trim()} `;
}

// Sugestão de autor pela assinatura (resposta de 23/10/2026, variante
// conservadora): o nome COMPLETO de um profissional do arquivo nos 3 últimos
// blocos de texto ANTES da seção de referências. Nome parcial não conta; nome
// só nas referências não conta; dois profissionais diferentes (ou dois com o
// mesmo nome) no fim: nenhuma sugestão. Só vai para sugestaoDeAutor, com
// revisão.
export function sugestaoPelaAssinatura(markdown: string, profissionais: ProfissionalDoArquivo[]): string | null {
  const blocos = textoDoMarkdown(lerMarkdownRestrito(markdown));
  const corte = blocos.findIndex((bloco) => SECAO_DE_REFERENCIAS.test(bloco.trim()));
  const fim = paraBusca((corte >= 0 ? blocos.slice(0, corte) : blocos).slice(-BLOCOS_DA_ASSINATURA).join(" "));
  const achados = profissionais.filter((profissional) => {
    const nome = paraBusca(profissional.nome);
    return nome.trim().split(" ").length >= 2 && fim.includes(nome);
  });
  return achados.length === 1 ? achados[0].chave : null;
}

// Posts que ganham sugestão pela assinatura: os que não têm sugestão pela foto
// (foto institucional ou sem foto). Só para o arquivo privado
// docs/dados-privados/sugestao-autor-assinatura.md (com o nome).
export function sugestoesPelaAssinatura(posts: PostConvertido[], imagensDeOrigem: ImagemDeOrigem[], profissionais: ProfissionalDoArquivo[]): { slugAntigo: string; slugNovo: string; chave: string; nome: string }[] {
  return posts.flatMap((post) => {
    const foto = fotoDoAutorNaOrigem(post.fotoDoAutorWix, imagensDeOrigem);
    if (foto.tipo !== "semCorrespondencia" && foto.tipo !== "semFoto") return [];
    const chave = sugestaoPelaAssinatura(post.markdown, profissionais);
    const profissional = profissionais.find((item) => item.chave === chave);
    return profissional ? [{ slugAntigo: post.doMapa.slug, slugNovo: slugNovoDoPost(post.doMapa.slug), chave: profissional.chave, nome: profissional.nome }] : [];
  });
}

export const MOTIVOS_DE_REVISAO = [
  // Sempre: o resumo é conferido por uma pessoa.
  "resumo",
  "semCapa",
  "capaPendente",
  "imagemDoCorpoPendente",
  "imagemRecusadaPeloTipo",
  "pontoDaConversao",
  "dataInvalida",
  "sugestaoPelaAssinatura",
] as const;
export type MotivoDeRevisao = (typeof MOTIVOS_DE_REVISAO)[number];

function contar(valores: string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const valor of valores) contagem[valor] = (contagem[valor] ?? 0) + 1;
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

const ENDERECO_DO_WIX = /wixstatic|wixmp|static\.wix|usrfiles/i;

const DESCRICAO_DA_FOTO: Record<Exclude<FotoDoAutor["tipo"], "profissional">, string> = {
  ambigua: "foto de mais de um profissional",
  soDiretoria: "foto só da diretoria",
  semCorrespondencia: "foto sem profissional (institucional ou outra)",
  semFoto: "sem foto do autor",
};

export type RelatorioDosPosts = Extract<Awaited<ReturnType<typeof migrarPosts>>, { ok: true }>;

// profissionaisDoArquivo: nomes e chaves do profissionais.json, só para a
// sugestão pela assinatura (nunca vão para o relatório).
export async function migrarPosts(opcoes: {
  db: Firestore;
  posts: PostConvertido[];
  imagensDeOrigem: ImagemDeOrigem[];
  profissionaisDoArquivo?: ProfissionalDoArquivo[];
  modo: Modo;
  execucao: string;
  limite: number | null;
}) {
  const { db, posts, imagensDeOrigem, profissionaisDoArquivo = [], modo, execucao, limite } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const imagens = await imagensImportadas(db);
  if (modo === "executar" && imagens.size === 0) return { ok: false as const, mensagem: MENSAGEM_SEM_IMAGENS_DOS_POSTS };
  const idDaImagem = (midiaIdWix: string) => {
    const imagem = imagens.get(midiaIdWix);
    return imagem && !imagem.naLixeira ? imagem.id : null;
  };
  const capaDe = (slug: string) => imagensDeOrigem.find((imagem) => imagem.usos.some((uso) => uso.tipo === "post" && uso.chaveDeOrigem === slug))?.midiaIdWix ?? null;

  const existentes = (await db.collection(COLECAO_POSTS).select("slug", "origem").get()).docs.map((documento) => ({
    id: documento.id,
    slug: String(documento.get("slug") ?? ""),
    chave: documento.get("origem.sistema") === SISTEMA_DE_ORIGEM && typeof documento.get("origem.chave") === "string" ? (documento.get("origem.chave") as string) : null,
  }));
  const profissionais = new Map<string, string>();
  for (const documento of (await db.collection(COLECAO_PROFISSIONAIS).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).select("origem").get()).docs) {
    const chave = documento.get("origem.chave");
    if (typeof chave === "string") profissionais.set(chave, documento.id);
  }

  // Slugs novos: determinísticos; colisão entre os posts do mapa ou com um
  // post que já existe (fora deste mesmo post importado) impede a gravação.
  const porSlugNovo = new Map<string, string[]>();
  for (const post of posts) {
    const slug = slugNovoDoPost(post.doMapa.slug);
    porSlugNovo.set(slug, [...(porSlugNovo.get(slug) ?? []), post.doMapa.slug]);
  }
  const colisoes: { slugNovo: string; motivo: string }[] = [];
  for (const [slug, antigos] of porSlugNovo) {
    if (antigos.length > 1) colisoes.push({ slugNovo: slug, motivo: `${antigos.length} posts do site antigo dariam o mesmo slug (${antigos.join(", ")})` });
    const ocupado = existentes.find((existente) => existente.slug === slug && !(existente.chave && antigos.includes(existente.chave)));
    if (ocupado) colisoes.push({ slugNovo: slug, motivo: `já usado pelo post ${ocupado.id}${ocupado.chave ? " (importado de outro slug)" : " (criado no painel)"}` });
  }

  const planos = posts.map((post, i) => {
    const { doMapa } = post;
    const existente = existentes.find((item) => item.chave === doMapa.slug);
    const motivos = new Set<MotivoDeRevisao>(["resumo"]);
    const imagensDoCorpo = trocarImagens(post.markdown, idDaImagem);
    if (imagensDoCorpo.pendentes.length) motivos.add("imagemDoCorpoPendente");
    const capaWix = capaDe(doMapa.slug);
    const capaMidiaId = capaWix ? idDaImagem(capaWix) : null;
    if (!capaWix) motivos.add("semCapa");
    else if (!capaMidiaId) motivos.add("capaPendente");
    const recusadas = [capaWix, ...imagensDoCorpo.pendentes].filter((id): id is string => Boolean(id) && previstoComoRecusado(id as string));
    if (recusadas.length) motivos.add("imagemRecusadaPeloTipo");
    if (post.paraRevisar.length) motivos.add("pontoDaConversao");
    const data = new Date(doMapa.publicadoEm);
    if (Number.isNaN(data.getTime())) motivos.add("dataInvalida");
    const resumo = resumoDoPost(post.markdown, post.descricaoMeta);
    const autor = fotoDoAutorNaOrigem(post.fotoDoAutorWix, imagensDeOrigem);
    // Sem profissional pela foto (institucional ou sem foto): a assinatura.
    const pelaAssinatura = autor.tipo === "semCorrespondencia" || autor.tipo === "semFoto" ? sugestaoPelaAssinatura(post.markdown, profissionaisDoArquivo) : null;
    if (pelaAssinatura) motivos.add("sugestaoPelaAssinatura");
    const chaveDoAutor = autor.tipo === "profissional" ? autor.chave : pelaAssinatura;
    const sugestaoDeAutor = chaveDoAutor ? profissionais.get(chaveDoAutor) ?? null : null;
    const dados = {
      titulo: doMapa.titulo,
      slug: slugNovoDoPost(doMapa.slug),
      conteudo: imagensDoCorpo.conteudo,
      formatoConteudo: "markdown" as const,
      idioma: idiomaDoPost(doMapa),
      publicadoEm: Number.isNaN(data.getTime()) ? null : data,
      capaMidiaId,
      resumo: resumo.resumo,
      tempoLeitura: tempoDeLeitura(post.markdown),
      sugestaoDeAutor,
      status: "rascunho" as const,
    };
    return {
      posicao: i + 1,
      post,
      existente: existente ?? null,
      dados,
      motivos: MOTIVOS_DE_REVISAO.filter((motivo) => motivos.has(motivo)),
      capaWix,
      imagensDoCorpo,
      recusadas,
      fonteDoResumo: resumo.fonte,
      metaAutomaticaIgnorada: resumo.metaAutomaticaIgnorada,
      autor: autor.tipo === "profissional" ? (sugestaoDeAutor ? "profissional ligado" : "profissional ainda não importado") : pelaAssinatura ? (sugestaoDeAutor ? "pela assinatura, profissional ligado" : "pela assinatura, profissional ainda não importado") : DESCRICAO_DA_FOTO[autor.tipo],
      // Na linha de cada post do relatório, a sugestão pela assinatura não
      // aparece: quais posts a ganharam fica só na lista privada (só a contagem vai).
      autorNaLinha: autor.tipo === "profissional" ? (sugestaoDeAutor ? "profissional ligado" : "profissional ainda não importado") : DESCRICAO_DA_FOTO[autor.tipo],
    };
  });
  const candidatos = planos.filter((plano) => !plano.existente);
  const nestaExecucao = limite === null ? candidatos : candidatos.slice(0, limite);

  // Nenhum campo gravado pode ter endereço do Wix (as imagens vão por id).
  const comEnderecoDoWix = planos.filter((plano) => ENDERECO_DO_WIX.test([plano.dados.titulo, plano.dados.conteudo, plano.dados.resumo].join(" "))).map((plano) => plano.post.doMapa.slug);
  if (modo === "executar" && colisoes.length > 0) return { ok: false as const, mensagem: `Colisão de slug: ${colisoes.map((colisao) => `${colisao.slugNovo} (${colisao.motivo})`).join("; ")}. Nada foi gravado.` };
  if (modo === "executar" && comEnderecoDoWix.length > 0) return { ok: false as const, mensagem: `Endereço do Wix no conteúdo de ${comEnderecoDoWix.length} post(s): ${comEnderecoDoWix.join(", ")}. Nada foi gravado.` };

  const criados: { chave: string; id: string }[] = [];
  if (modo === "executar") {
    for (const plano of nestaExecucao) {
      const referencia = db.collection(COLECAO_POSTS).doc();
      const momento = new Date();
      const lote = db.batch();
      lote.create(referencia, {
        ...plano.dados,
        origem: { sistema: SISTEMA_DE_ORIGEM, chave: plano.post.doMapa.slug, execucao },
        revisarMigracao: true,
        criadoEm: momento,
        atualizadoEm: momento,
      });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_POSTS,
        documentoId: referencia.id,
        acao: "criar",
        campos: [...Object.keys(plano.dados), "origem", "revisarMigracao"],
        resumo: "Post importado do site antigo (rascunho).",
        origem: "migracao",
        execucao,
      });
      await lote.commit();
      criados.push({ chave: plano.post.doMapa.slug, id: referencia.id });
    }
  }

  const maior = planos.reduce<(typeof planos)[number] | null>((atual, plano) => (!atual || plano.dados.conteudo.length > atual.dados.conteudo.length ? plano : atual), null);
  const comMotivo = (motivo: MotivoDeRevisao) => planos.filter((plano) => plano.motivos.includes(motivo)).map((plano) => plano.post.doMapa.slug);
  return {
    ok: true as const,
    script: "migrar-posts",
    execucao,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    limite,
    contagens: {
      previstos: posts.length,
      jaExistentes: planos.filter((plano) => plano.existente).length,
      candidatos: candidatos.length,
      nestaExecucao: nestaExecucao.length,
      criados: criados.length,
      porIdioma: contar(planos.map((plano) => plano.dados.idioma)),
      // Status com que os novos entram (os já existentes ficam como estão).
      porStatus: contar(candidatos.map((plano) => plano.dados.status)),
      porMotivo: Object.fromEntries(MOTIVOS_DE_REVISAO.map((motivo) => [motivo, comMotivo(motivo).length])),
      resumoPorFonte: contar(planos.map((plano) => plano.fonteDoResumo)),
      metaAutomaticaIgnorada: planos.filter((plano) => plano.metaAutomaticaIgnorada).length,
      sugestaoDeAutor: contar(planos.map((plano) => plano.autor)),
      imagensDoCorpo: {
        noMarkdown: planos.reduce((soma, plano) => soma + plano.imagensDoCorpo.ligadas + plano.imagensDoCorpo.pendentes.length, 0),
        ligaveisAgora: planos.reduce((soma, plano) => soma + plano.imagensDoCorpo.ligadas, 0),
        pendentes: planos.reduce((soma, plano) => soma + plano.imagensDoCorpo.pendentes.length, 0),
        removidasPorDuplicarACapa: planos.filter((plano) => plano.post.capaRemovidaDoCorpo).length,
      },
      capas: { noArquivo: planos.filter((plano) => plano.capaWix).length, ligaveisAgora: planos.filter((plano) => plano.dados.capaMidiaId).length },
      colisoesDeSlug: colisoes.length,
      slugsQueMudam: planos.filter((plano) => plano.dados.slug !== plano.post.doMapa.slug).length,
      comEnderecoDoWix: comEnderecoDoWix.length,
      maiorPost: maior ? { slug: maior.post.doMapa.slug, caracteres: maior.dados.conteudo.length } : null,
      tempoLeitura: { minimo: Math.min(...planos.map((plano) => plano.dados.tempoLeitura)), maximo: Math.max(...planos.map((plano) => plano.dados.tempoLeitura)) },
    },
    colisoes,
    comEnderecoDoWix,
    listas: {
      semCapa: comMotivo("semCapa"),
      capaPendente: comMotivo("capaPendente"),
      imagemDoCorpoPendente: comMotivo("imagemDoCorpoPendente"),
      imagemRecusadaPeloTipo: planos.filter((plano) => plano.recusadas.length).map((plano) => `${plano.post.doMapa.slug} (${plano.recusadas.map((id) => (id === plano.capaWix ? "capa" : "corpo")).join(", ")})`),
      capaRemovidaDoCorpo: planos.filter((plano) => plano.post.capaRemovidaDoCorpo).map((plano) => plano.post.doMapa.slug),
      pontoDaConversao: planos.filter((plano) => plano.post.paraRevisar.length).map((plano) => `${plano.post.doMapa.slug}: ${plano.post.paraRevisar.join("; ")}`),
    },
    posts: planos.map((plano) => ({
      posicao: plano.posicao,
      slugAntigo: plano.post.doMapa.slug,
      slugNovo: plano.dados.slug,
      idioma: plano.dados.idioma,
      publicadoEm: plano.dados.publicadoEm?.toISOString() ?? null,
      capa: plano.capaWix === null ? "sem capa no arquivo" : plano.dados.capaMidiaId ? "ligada" : "pendente",
      imagensDoCorpo: `${plano.imagensDoCorpo.ligadas} de ${plano.imagensDoCorpo.ligadas + plano.imagensDoCorpo.pendentes.length}`,
      resumo: `${plano.fonteDoResumo}, ${plano.dados.resumo.length} caracteres`,
      tempoLeitura: plano.dados.tempoLeitura,
      caracteres: plano.dados.conteudo.length,
      autor: plano.autorNaLinha,
      motivos: plano.motivos.filter((motivo) => motivo !== "sugestaoPelaAssinatura"),
      jaExistente: Boolean(plano.existente),
    })),
    redirecionamentos: redirecionamentosDoBlog(planos.map((plano) => ({ slugAntigo: plano.post.doMapa.slug, slugNovo: plano.existente?.slug || plano.dados.slug }))),
    criados,
  };
}

// Desfaz uma execução: os posts com origem.execucao igual à indicada. Pula o
// que uma pessoa alterou depois (com incluirEditados e a segunda confirmação,
// também saem). Como o painel ainda não registra as edições de posts em
// logAlteracoes (etapa 3), também conta como alterado o post com atualizadoEm
// diferente de criadoEm. Primeiro decide tudo; só depois apaga.
export async function desfazerPosts(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo; incluirEditados: boolean; confirmacaoDeEditados?: number | null }) {
  const { db, execucaoAlvo, execucao, modo, incluirEditados, confirmacaoDeEditados = null } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const pulados: { id: string; motivo: string }[] = [];
  const aDesfazer: { referencia: DocumentReference; editadoPorPessoa: boolean }[] = [];
  const posts = await db.collection(COLECAO_POSTS).where("origem.execucao", "==", execucaoAlvo).get();
  for (const documento of posts.docs) {
    const criado = documento.get("criadoEm")?.toMillis?.();
    const atualizado = documento.get("atualizadoEm")?.toMillis?.();
    const noRegistro = (await db.collection(COLECAO_LOG).where("documentoId", "==", documento.id).get()).docs.some((registro) => registro.get("origem") !== "migracao");
    const editado = noRegistro || criado !== atualizado;
    if (editado && !incluirEditados) {
      pulados.push({ id: documento.id, motivo: "alterado por uma pessoa depois da importação" });
      continue;
    }
    aDesfazer.push({ referencia: documento.ref, editadoPorPessoa: editado });
  }
  const editadosQueSairiam = aDesfazer.filter((item) => item.editadoPorPessoa).length;
  const bloqueado =
    modo === "executar" && incluirEditados && confirmacaoDeEditados !== editadosQueSairiam
      ? `Nada foi apagado: ${editadosQueSairiam} post(s) alterado(s) por uma pessoa sairiam. Para confirmar, repita com --confirmo-apagar-editadas=${editadosQueSairiam}.`
      : null;
  if (modo === "executar" && !bloqueado) {
    for (const item of aDesfazer) {
      const lote = db.batch();
      lote.delete(item.referencia);
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_POSTS,
        documentoId: item.referencia.id,
        acao: "excluir_definitivo",
        campos: [],
        resumo: `Importação desfeita (execução ${execucaoAlvo}).`,
        origem: "migracao",
        execucao,
      });
      await lote.commit();
    }
  }
  const desfeitos = bloqueado ? [] : aDesfazer.map((item) => item.referencia.id);
  return {
    script: "migrar-posts (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    bloqueado,
    contagens: { encontrados: posts.size, desfeitos: desfeitos.length, pulados: pulados.length, editadosPorPessoaQueSairiam: editadosQueSairiam },
    desfeitos,
    pulados,
  };
}

function tabela(titulo: string, contagem: Record<string, number>): string {
  return [`| ${titulo} | Quantidade |`, "|---|---|", ...Object.entries(contagem).map(([chave, valor]) => `| ${chave} | ${valor} |`)].join("\n");
}

const DESCRICAO_DOS_MOTIVOS: Record<MotivoDeRevisao, string> = {
  resumo: "resumo a conferir (todos)",
  semCapa: "sem capa no arquivo",
  capaPendente: "capa ainda não importada (ou na lixeira)",
  imagemDoCorpoPendente: "imagem do corpo ainda não importada (não aparece no site)",
  imagemRecusadaPeloTipo: "imagem prevista como recusada pelo tipo (GIF ou AVIF)",
  pontoDaConversao: "ponto da conversão (nota em sup ou título h4 a h6)",
  dataInvalida: "data de publicação inválida",
  sugestaoPelaAssinatura: "sugestão de autor pela assinatura (conferir)",
};

export function relatorioDosPostsEmMarkdown(relatorio: RelatorioDosPosts, projeto: string): string {
  const c = relatorio.contagens;
  const lista = (itens: string[]) => (itens.length ? itens.map((item) => `- ${item}`).join("\n") : "Nenhum.");
  return [
    `# Importação dos posts: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `- Execução: ${relatorio.execucao}`,
    `- Projeto: ${projeto}`,
    `- Início: ${relatorio.iniciadoEm}; fim: ${relatorio.terminadoEm}`,
    `- Limite: ${relatorio.limite ?? "nenhum"}`,
    "- Todos entram como rascunho, com revisarMigracao = true e formatoConteudo \"markdown\". Slug novo: o antigo sem acento.",
    "",
    "## Contagens",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Previstos | ${c.previstos} (já existentes ${c.jaExistentes}, nesta execução ${c.nestaExecucao}, criados ${c.criados}) |`,
    `| Capas | ${c.capas.noArquivo} no arquivo; ${c.capas.ligaveisAgora} ligáveis agora |`,
    `| Imagens do corpo no Markdown | ${c.imagensDoCorpo.noMarkdown} (${c.imagensDoCorpo.ligaveisAgora} ligáveis agora, ${c.imagensDoCorpo.pendentes} pendentes) |`,
    `| Posts com a 1ª imagem do corpo removida por ser a capa | ${c.imagensDoCorpo.removidasPorDuplicarACapa} |`,
    `| Slugs que mudam (perdem acento) | ${c.slugsQueMudam} |`,
    `| Colisões de slug | ${c.colisoesDeSlug} |`,
    `| Posts com endereço do Wix no conteúdo | ${c.comEnderecoDoWix} |`,
    `| Maior post | ${c.maiorPost ? `${c.maiorPost.caracteres} caracteres (${c.maiorPost.slug})` : "-"} |`,
    `| Tempo de leitura | ${c.tempoLeitura.minimo} a ${c.tempoLeitura.maximo} min (${PALAVRAS_POR_MINUTO} palavras por minuto) |`,
    "",
    tabela("Idioma", c.porIdioma),
    "",
    tabela("Status dos novos", c.porStatus),
    "",
    tabela("Resumo vindo de", c.resumoPorFonte),
    "",
    `Meta descriptions automáticas do Wix (só o começo do texto) tratadas como inexistentes: ${c.metaAutomaticaIgnorada}.`,
    "",
    tabela("Sugestão de autor (pela foto do autor ou, sem ela, pela assinatura)", c.sugestaoDeAutor),
    "",
    tabela("Motivo de revisão", Object.fromEntries(Object.entries(c.porMotivo).map(([motivo, n]) => [DESCRICAO_DOS_MOTIVOS[motivo as MotivoDeRevisao], n]))),
    "",
    "## Colisões de slug",
    "",
    relatorio.colisoes.length ? relatorio.colisoes.map((colisao) => `- ${colisao.slugNovo}: ${colisao.motivo}`).join("\n") : "Nenhuma.",
    "",
    "## Posts sem capa no arquivo",
    "",
    lista(relatorio.listas.semCapa),
    "",
    "## Posts com capa pendente",
    "",
    lista(relatorio.listas.capaPendente),
    "",
    "## Posts com imagem do corpo pendente",
    "",
    lista(relatorio.listas.imagemDoCorpoPendente),
    "",
    "## Posts com imagem prevista como recusada pelo tipo",
    "",
    lista(relatorio.listas.imagemRecusadaPeloTipo),
    "",
    "## Primeira imagem do corpo removida por ser igual à capa",
    "",
    lista(relatorio.listas.capaRemovidaDoCorpo),
    "",
    "## Pontos da conversão para revisão",
    "",
    lista(relatorio.listas.pontoDaConversao),
    "",
    "## Posts",
    "",
    "| Pos. | Slug antigo | Slug novo | Idioma | Publicado em | Capa | Imagens do corpo | Resumo | Leitura (min) | Caracteres | Autor | Revisão |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...relatorio.posts.map(
      (post) =>
        `| ${post.posicao} | ${post.slugAntigo} | ${post.slugNovo}${post.jaExistente ? " (já existe)" : ""} | ${post.idioma} | ${post.publicadoEm ?? "inválida"} | ${post.capa} | ${post.imagensDoCorpo} | ${post.resumo} | ${post.tempoLeitura} | ${post.caracteres} | ${post.autor} | ${post.motivos.join(", ")} |`,
    ),
    "",
    `Redirecionamentos propostos (NÃO ativados): ${relatorio.redirecionamentos.length}, em tmp-migracao/redirects.json.`,
    "",
  ].join("\n");
}
