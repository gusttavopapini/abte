// Páginas institucionais editáveis (30/10/2026, src/lib/site/paginas.ts):
// leitura, formulário, regra de publicação, registro e permissão.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import {
  PAGINAS_INSTITUCIONAIS,
  camposAlteradosDaPagina,
  conteudoDaPagina,
  dataDaAtualizacao,
  ehSlugDePagina,
  lerPaginaDoFormulario,
  lerPaginaInstitucional,
  paginaNoSite,
} from "../../src/lib/site/paginas.ts";

describe("Páginas institucionais", () => {
  test("três slugs fixos", () => {
    assert.deepEqual(PAGINAS_INSTITUCIONAIS.map((pagina) => pagina.slug), ["acessibilidade", "politica-de-privacidade", "termos-de-uso"]);
    assert.equal(ehSlugDePagina("contato"), false);
  });

  test("sem documento: rascunho vazio, com o título padrão, fora do site", () => {
    const pagina = lerPaginaInstitucional("termos-de-uso", undefined);
    assert.deepEqual(pagina, { slug: "termos-de-uso", titulo: "Termos de uso", corpo: "", publicada: false, atualizadaEm: null });
    assert.equal(paginaNoSite(pagina), false);
    assert.equal(paginaNoSite(undefined), false);
  });

  test("publicada com corpo: texto do painel; publicada sem corpo: texto preliminar do código", () => {
    const comCorpo = lerPaginaInstitucional("acessibilidade", { titulo: "T", corpo: "## Seção\n\nTexto.", publicada: true });
    assert.equal(paginaNoSite(comCorpo), true);
    assert.equal(conteudoDaPagina(comCorpo), "painel");
    const semCorpo = lerPaginaInstitucional("acessibilidade", { titulo: "T", corpo: "  ", publicada: true });
    assert.equal(paginaNoSite(semCorpo), true);
    assert.equal(conteudoDaPagina(semCorpo), "preliminar");
    assert.equal(paginaNoSite(lerPaginaInstitucional("acessibilidade", { publicada: "sim" })), false, "só true publica");
  });

  test("formulário: título obrigatório e limitado; publicada só com \"sim\"; slug desconhecido recusado", () => {
    assert.deepEqual(lerPaginaDoFormulario({ slug: "termos-de-uso", titulo: "  Termos  de uso ", corpo: "Texto\r\n", publicada: "sim" }), {
      ok: true,
      slug: "termos-de-uso",
      dados: { titulo: "Termos de uso", corpo: "Texto", publicada: true },
    });
    assert.equal((lerPaginaDoFormulario({ slug: "termos-de-uso", titulo: "T", corpo: "", publicada: null }) as { dados: { publicada: boolean } }).dados.publicada, false);
    const semTitulo = lerPaginaDoFormulario({ slug: "termos-de-uso", titulo: " ", corpo: "", publicada: null });
    assert.ok(!semTitulo.ok && semTitulo.erros.titulo);
    const longo = lerPaginaDoFormulario({ slug: "termos-de-uso", titulo: "x".repeat(121), corpo: "", publicada: null });
    assert.ok(!longo.ok && longo.erros.titulo);
    assert.equal(lerPaginaDoFormulario({ slug: "outra", titulo: "T", corpo: "", publicada: null }).ok, false);
    assert.equal(lerPaginaDoFormulario({ slug: "termos-de-uso", titulo: "T", corpo: "", publicada: "true" }).ok, false);
  });

  test("registro só com os nomes dos campos", () => {
    const antes = lerPaginaInstitucional("termos-de-uso", { titulo: "T", corpo: "A", publicada: false });
    assert.deepEqual(camposAlteradosDaPagina(antes, { titulo: "T", corpo: "B", publicada: true }), ["corpo", "publicada"]);
    assert.deepEqual(camposAlteradosDaPagina(null, { titulo: "T", corpo: "", publicada: false }), ["titulo"]);
  });

  test("data de atualização em português", () => {
    assert.equal(dataDaAtualizacao("2026-10-30T15:00:00.000Z"), "30/10/2026");
    assert.equal(dataDaAtualizacao(null), null);
  });

  test("permissão: só administrador; a ação começa por exigirPapelDoPainel(\"paginas.editar\")", () => {
    assert.equal(papelPodeExecutar("administrador", "paginas.editar"), true);
    assert.equal(papelPodeExecutar("editor", "paginas.editar"), false);
    assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }, "paginas.editar"), { permitido: false, motivo: "sem-permissao" });
    const codigo = readFileSync("src/app/admin/acoes-paginas.ts", "utf8");
    const acoes = [...codigo.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\s*([^\n]*)/g)];
    assert.ok(acoes.length >= 1);
    for (const [, nome, primeira] of acoes) assert.match(primeira, /^const usuario = await exigirPapelDoPainel\("paginas\.editar"\);$/, nome);
  });
});
