// Coleta das páginas institucionais do site antigo (etapa 6, degrau 6),
// pura: lista das páginas do mapa (as que são lidas e as que só entram no
// relatório), regras do robots.txt e leitura da página já baixada (só o
// conteúdo principal, sem cabeçalho nem rodapé do Wix). Usa o parse5. Nada
// aqui baixa, segue links nem executa conteúdo. Testado em
// testes/unidade/migracao-paginas.test.mts.
import { parse, serializeOuter } from "parse5";
import { atributo, percorrer, textoCru, type No } from "./postsColeta.ts";

// Páginas que NÃO são lidas (pedido de 22/10/2026): home, doação, contato,
// cartilha e agendamento só entram no relatório, pelo que o mapa diz delas.
export const PAGINAS_SO_NO_RELATORIO = ["/", "/doação", "/contato", "/cartilha", "/agendamento"] as const;

export type PaginaDoMapa = { caminho: string; tituloSite: string; caracteres: number | null; imagens: number | null; links: number | null; lida: boolean };

const CAMINHO = /^\/[\p{L}\d-]*$/u;

const quantidade = (valor: unknown) => (Array.isArray(valor) ? valor.length : typeof valor === "number" ? valor : null);

export function lerPaginasDoMapa(conteudo: string): { ok: true; paginas: PaginaDoMapa[] } | { ok: false; erros: string[] } {
  const paginas: PaginaDoMapa[] = [];
  const erros: string[] = [];
  conteudo.split("\n").forEach((linha, i) => {
    if (!linha.trim()) return;
    let registro: Record<string, unknown>;
    try {
      registro = JSON.parse(linha);
    } catch {
      erros.push(`Linha ${i + 1} do mapa não é JSON.`);
      return;
    }
    if (registro.tipo !== "pagina") return;
    const caminho = typeof registro.caminho === "string" ? registro.caminho.normalize("NFC").trim() : "";
    if (!CAMINHO.test(caminho)) {
      erros.push(`Linha ${i + 1}: caminho de página fora do formato.`);
      return;
    }
    if (paginas.some((pagina) => pagina.caminho === caminho)) {
      erros.push(`Linha ${i + 1}: página repetida (${caminho}).`);
      return;
    }
    paginas.push({
      caminho,
      tituloSite: typeof registro.tituloSite === "string" ? registro.tituloSite.trim() : "",
      caracteres: quantidade(registro.caracteres),
      imagens: quantidade(registro.imagens),
      links: quantidade(registro.links),
      lida: !(PAGINAS_SO_NO_RELATORIO as readonly string[]).includes(caminho),
    });
  });
  return erros.length ? { ok: false, erros } : { ok: true, paginas };
}

// Nome do arquivo da página em docs/dados-privados/paginas/ ("/nossa-historia"
// vira "nossa-historia"; a home, que não é lida, viraria "inicio").
export function nomeDoArquivoDaPagina(caminho: string): string {
  return caminho.slice(1) || "inicio";
}

// O robots.txt permite o caminho para qualquer robô (User-agent: *)? Regras
// Disallow e Allow por prefixo, valendo a mais longa (como os buscadores).
// Sem robots.txt, ou sem grupo "*", tudo é permitido.
export function permitidoPeloRobots(robots: string, caminho: string): boolean {
  const regras: { permitir: boolean; prefixo: string }[] = [];
  let noGrupo = false;
  let lendoAgentes = false;
  for (const bruta of robots.split(/\r?\n/)) {
    const linha = bruta.replace(/#.*$/, "").trim();
    const separador = linha.indexOf(":");
    if (separador < 0) continue;
    const campo = linha.slice(0, separador).trim().toLowerCase();
    const valor = linha.slice(separador + 1).trim();
    if (campo === "user-agent") {
      if (!lendoAgentes) noGrupo = false;
      lendoAgentes = true;
      if (valor === "*") noGrupo = true;
      continue;
    }
    lendoAgentes = false;
    if (!noGrupo || !valor) continue;
    if (campo === "disallow") regras.push({ permitir: false, prefixo: valor });
    if (campo === "allow") regras.push({ permitir: true, prefixo: valor });
  }
  const codificado = encodeURI(caminho);
  const valendo = regras
    .filter((regra) => caminho.startsWith(regra.prefixo) || codificado.startsWith(regra.prefixo))
    .sort((a, b) => b.prefixo.length - a.prefixo.length || Number(b.permitir) - Number(a.permitir))[0];
  return valendo ? valendo.permitir : true;
}

export type PaginaLida = { conteudoHtml: string | null; titulo: string | null; descricao: string | null };

// Conteúdo principal da página do Wix: o elemento <main> (sem o cabeçalho e
// o rodapé do site, que se repetem em todas as páginas).
export function lerPaginaDoSite(html: string): PaginaLida {
  const documento = parse(html) as unknown as No;
  let principal: No | null = null;
  let titulo: string | null = null;
  let descricao: string | null = null;
  for (const no of percorrer(documento)) {
    if (!principal && no.tagName === "main") principal = no;
    if (!titulo && no.tagName === "title") titulo = textoCru(no).replace(/\s+/g, " ").trim() || null;
    if (no.tagName === "meta" && atributo(no, "name") === "description") descricao = atributo(no, "content")?.replace(/\s+/g, " ").trim() || null;
  }
  return { conteudoHtml: principal ? serializeOuter(principal as never) : null, titulo, descricao };
}
