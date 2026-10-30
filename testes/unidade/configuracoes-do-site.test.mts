// Configurações do site (30/10/2026, src/lib/site/configuracoes.ts):
// leitura tolerante, Artigos fora do site (menu, rodapé e links), formulário
// e permissão (só administrador).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import {
  CONFIGURACAO_PADRAO_DO_SITE,
  ehCaminhoDosArtigos,
  itensDoMenu,
  lerArtigosAtivoDoFormulario,
  lerConfiguracaoDoSite,
  linkDisponivel,
  linksDisponiveis,
} from "../../src/lib/site/configuracoes.ts";
import { slidesDaHome, lerConfiguracaoDaHome } from "../../src/lib/site/home.ts";

const MENU = [
  { rotulo: "Profissionais", href: "/profissionais", submenu: [{ rotulo: "Médicos", href: "/profissionais?tag=Médicos" }] },
  { rotulo: "Blog", href: "/blog" },
  { rotulo: "Artigos", href: "/artigos" },
];
const INATIVO = { artigosAtivo: false };

describe("Configurações do site", () => {
  test("sem documento ou com valor estranho: Artigos no site (padrão de antes)", () => {
    assert.deepEqual(lerConfiguracaoDoSite(undefined), CONFIGURACAO_PADRAO_DO_SITE);
    assert.deepEqual(lerConfiguracaoDoSite({ artigosAtivo: "não" }), { artigosAtivo: true });
    assert.deepEqual(lerConfiguracaoDoSite({ artigosAtivo: false }), { artigosAtivo: false });
  });

  test("caminhos dos Artigos públicos; o painel não conta", () => {
    for (const href of ["/artigos", "/artigos/abc", "/artigos?x=1", "/artigos#topo", "/artigos/categoria/x"]) assert.equal(ehCaminhoDosArtigos(href), true, href);
    for (const href of ["/artigosx", "/admin/artigos", "/blog", "https://exemplo.invalid/artigos"]) assert.equal(ehCaminhoDosArtigos(href), false, href);
  });

  test("Artigos inativo: some do menu, do rodapé e dos links; ativo: tudo como antes", () => {
    assert.deepEqual(itensDoMenu(MENU, INATIVO).map((item) => item.rotulo), ["Profissionais", "Blog"]);
    assert.equal(itensDoMenu(MENU, CONFIGURACAO_PADRAO_DO_SITE).length, 3);
    assert.deepEqual(linksDisponiveis([{ rotulo: "Artigos", href: "/artigos" }, { rotulo: "Loja", href: "/loja" }], INATIVO).map((link) => link.href), ["/loja"]);
    assert.equal(linkDisponivel("/artigos/x", INATIVO), false);
    assert.equal(linkDisponivel("/loja", INATIVO), true);
  });

  test("banner com link para /artigos fica sem link quando os Artigos estão fora do site", () => {
    const imagem = { alt: "x", largura: 1920, altura: 1080, variantes: [{ largura: 960, url: "https://exemplo.invalid/a.webp" }] };
    const configuracao = lerConfiguracaoDaHome({ banners: [{ chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "/artigos", ativo: true }] });
    assert.equal(slidesDaHome(configuracao, new Map([["m1", imagem]]), false)[0].href, "");
    assert.equal(slidesDaHome(configuracao, new Map([["m1", imagem]]), true)[0].href, "/artigos");
  });

  test("formulário: só \"sim\" ou \"nao\"", () => {
    assert.deepEqual(lerArtigosAtivoDoFormulario("sim"), { ok: true, artigosAtivo: true });
    assert.deepEqual(lerArtigosAtivoDoFormulario("nao"), { ok: true, artigosAtivo: false });
    assert.equal(lerArtigosAtivoDoFormulario("true").ok, false);
    assert.equal(lerArtigosAtivoDoFormulario(null).ok, false);
  });

  test("permissão: só administrador altera as configurações", () => {
    assert.equal(papelPodeExecutar("administrador", "configuracoes.editar"), true);
    assert.equal(papelPodeExecutar("editor", "configuracoes.editar"), false);
    assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }, "configuracoes.editar"), { permitido: false, motivo: "sem-permissao" });
    assert.deepEqual(decidirAcessoAoPainel(null, "configuracoes.editar"), { permitido: false, motivo: "sem-sessao" });
  });

  test("toda ação de acoes-configuracoes começa por exigirPapelDoPainel(\"configuracoes.editar\")", () => {
    const codigo = readFileSync("src/app/admin/acoes-configuracoes.ts", "utf8");
    const acoes = [...codigo.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\s*([^\n]*)/g)];
    assert.ok(acoes.length >= 1);
    for (const [, nome, primeira] of acoes) assert.match(primeira, /^const usuario = await exigirPapelDoPainel\("configuracoes\.editar"\);$/, nome);
  });
});
