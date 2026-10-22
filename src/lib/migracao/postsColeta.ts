// Leitura da página de um post do blog do site antigo (etapa 6, degrau 4),
// pura: recebe o HTML já baixado e devolve só o artigo (article
// data-hook="post"), o título e a data de publicação. Usa o parse5 (só nos
// scripts de coleta). Nada aqui baixa, segue links nem executa conteúdo.
// Testado em testes/unidade/migracao-posts.test.mts.
import { parse, serializeOuter } from "parse5";

export type No = { nodeName: string; tagName?: string; attrs?: { name: string; value: string }[]; childNodes?: No[]; value?: string; content?: No };

export function atributo(no: No, nome: string): string | null {
  return no.attrs?.find((item) => item.name === nome)?.value ?? null;
}

export function* percorrer(no: No): Generator<No> {
  yield no;
  for (const filho of no.childNodes ?? []) yield* percorrer(filho);
  if (no.content) yield* percorrer(no.content);
}

export function textoCru(no: No): string {
  if (no.nodeName === "#text") return no.value ?? "";
  return (no.childNodes ?? []).map(textoCru).join("");
}

export type PostLido = {
  artigoHtml: string | null;
  titulo: string | null;
  // Do ld+json (BlogPosting) ou, sem ele, da meta article:published_time.
  publicadoEm: string | null;
  atualizadoEm: string | null;
  fonteDaData: "ldJson" | "meta" | null;
};

export function lerPaginaDePost(html: string): PostLido {
  const documento = parse(html) as unknown as No;
  let artigo: No | null = null;
  let publicadoEm: string | null = null;
  let atualizadoEm: string | null = null;
  let fonteDaData: PostLido["fonteDaData"] = null;
  let meta: string | null = null;
  for (const no of percorrer(documento)) {
    if (!artigo && no.tagName === "article" && atributo(no, "data-hook") === "post") artigo = no;
    if (no.tagName === "meta" && atributo(no, "property") === "article:published_time") meta = atributo(no, "content");
    if (no.tagName === "script" && (atributo(no, "type") ?? "").includes("ld+json")) {
      try {
        const dados = JSON.parse(textoCru(no));
        for (const item of Array.isArray(dados) ? dados : [dados]) {
          if (item && typeof item === "object" && /BlogPosting|Article/.test(String(item["@type"])) && typeof item.datePublished === "string") {
            publicadoEm = item.datePublished;
            atualizadoEm = typeof item.dateModified === "string" ? item.dateModified : null;
            fonteDaData = "ldJson";
          }
        }
      } catch {
        // JSON quebrado na página: ignora.
      }
    }
  }
  if (!publicadoEm && meta) {
    publicadoEm = meta;
    fonteDaData = "meta";
  }
  const tituloNo = artigo ? [...percorrer(artigo)].find((no) => atributo(no, "data-hook") === "post-title" && no.tagName && /^h[1-6]$/.test(no.tagName)) : undefined;
  return {
    artigoHtml: artigo ? serializeOuter(artigo as never) : null,
    titulo: tituloNo ? textoCru(tituloNo).replace(/\s+/g, " ").trim() || null : null,
    publicadoEm,
    atualizadoEm,
    fonteDaData,
  };
}
