// Hover do site e do painel (29/10/2026): nenhum hover, foco ou estado
// (página atual, item ativo) sublinha. O sublinhado só existe em repouso nos
// links de texto corrido (.texto-corrido a, globals.css). Este teste lê todo
// o CSS de src/ e os estilos em linha dos componentes.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

function arquivos(pasta: string, extensoes: string[]): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho, extensoes);
    return extensoes.some((extensao) => nome.endsWith(extensao)) ? [caminho] : [];
  });
}

// Regras CSS como pares seletor e declarações (sem comentários; os blocos
// @media entram pelo seletor de dentro).
function regras(css: string): { seletor: string; corpo: string }[] {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({ seletor: seletor.trim(), corpo }));
}

const ESTADO = /:hover|:focus|:active|aria-current|aria-selected|aria-pressed|data-demonstrar|Ativ[oa]\b|Atual\b/;
const SUBLINHADO = /text-decoration(-line)?\s*:[^;]*underline/;

describe("Hover sem sublinhado", () => {
  test("nenhuma regra de hover, foco ou estado sublinha", () => {
    const achados = arquivos("src", [".css"]).flatMap((arquivo) =>
      regras(readFileSync(arquivo, "utf8"))
        .filter(({ seletor, corpo }) => ESTADO.test(seletor) && SUBLINHADO.test(corpo))
        .map(({ seletor }) => `${arquivo}: ${seletor}`),
    );
    assert.deepEqual(achados, []);
  });

  test("o único sublinhado em repouso é o dos links de texto corrido", () => {
    const achados = arquivos("src", [".css"]).flatMap((arquivo) =>
      regras(readFileSync(arquivo, "utf8"))
        .filter(({ seletor, corpo }) => SUBLINHADO.test(corpo) && seletor !== ".texto-corrido a")
        .map(({ seletor }) => `${arquivo}: ${seletor}`),
    );
    assert.deepEqual(achados, []);
  });

  test("nenhum estilo em linha sublinha", () => {
    const achados = arquivos("src", [".tsx", ".ts"]).filter((arquivo) => /textDecoration\s*:\s*["'][^"']*underline/.test(readFileSync(arquivo, "utf8")));
    assert.deepEqual(achados, []);
  });

  test("o hover do sistema só vale com mouse ou trackpad", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const bloco = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine)"));
    assert.match(bloco, /\.realce:hover::before/);
    assert.match(bloco, /\.texto-corrido a:hover/);
    assert.doesNotMatch(css.slice(0, css.indexOf("@media (hover: hover) and (pointer: fine)")), /\.realce:hover|\.texto-corrido a:hover/);
  });
});
