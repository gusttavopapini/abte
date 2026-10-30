// Configurações do site (30/10/2026, src/lib/site/configuracoes.ts):
// leitura tolerante, Artigos fora do site (menu, rodapé e links), formulário
// e permissão (só administrador).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import {
  CONFIGURACAO_PADRAO_DO_SITE,
  camposAlteradosDoPix,
  lerPixDoFormulario,
  validarChavePix,
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
const INATIVO = { artigosAtivo: false, pix: null };

describe("Configurações do site", () => {
  test("sem documento ou com valor estranho: Artigos no site (padrão de antes)", () => {
    assert.deepEqual(lerConfiguracaoDoSite(undefined), CONFIGURACAO_PADRAO_DO_SITE);
    assert.deepEqual(lerConfiguracaoDoSite({ artigosAtivo: "não" }), { artigosAtivo: true, pix: null });
    assert.deepEqual(lerConfiguracaoDoSite({ artigosAtivo: false }), { artigosAtivo: false, pix: null });
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

describe("Doações por Pix (estático)", () => {
  test("CNPJ: 14 números, com ou sem pontuação; gravado só com os dígitos", () => {
    assert.deepEqual(validarChavePix("cnpj", "12.345.678/0001-95"), { ok: true, chave: "12345678000195" });
    assert.equal(validarChavePix("cnpj", "1234567800019").ok, false);
    assert.equal(validarChavePix("cnpj", "12a45678000195").ok, false);
  });

  test("e-mail, telefone e chave aleatória", () => {
    assert.deepEqual(validarChavePix("email", " Doacoes@Exemplo.invalid "), { ok: true, chave: "doacoes@exemplo.invalid" });
    assert.equal(validarChavePix("email", "sem-arroba").ok, false);
    assert.equal(validarChavePix("email", `${"a".repeat(70)}@exemplo.invalid`).ok, false, "e-mail acima de 77 caracteres");
    assert.deepEqual(validarChavePix("telefone", "(11) 91234-5678"), { ok: true, chave: "+5511912345678" });
    assert.deepEqual(validarChavePix("telefone", "+55 11 91234-5678"), { ok: true, chave: "+5511912345678" });
    assert.equal(validarChavePix("telefone", "1234").ok, false);
    assert.deepEqual(validarChavePix("aleatoria", "123E4567-E89B-12D3-A456-426614174000"), { ok: true, chave: "123e4567-e89b-12d3-a456-426614174000" });
    assert.equal(validarChavePix("aleatoria", "123e4567").ok, false);
  });

  test("formulário: chave vazia remove o Pix; erros por campo em português; tamanhos máximos", () => {
    assert.deepEqual(lerPixDoFormulario({ tipo: "cnpj", chave: "  ", favorecido: "x", orientacao: "" }), { ok: true, pix: null });
    const semTipo = lerPixDoFormulario({ tipo: "pix", chave: "12345678000195", favorecido: "", orientacao: "" });
    assert.ok(!semTipo.ok && semTipo.erros.tipo);
    const longo = lerPixDoFormulario({ tipo: "cnpj", chave: "12345678000195", favorecido: "x".repeat(101), orientacao: "y".repeat(301) });
    assert.ok(!longo.ok && longo.erros.favorecido && longo.erros.orientacao);
    assert.deepEqual(lerPixDoFormulario({ tipo: "cnpj", chave: "12.345.678/0001-95", favorecido: " Associação  de teste ", orientacao: "" }), {
      ok: true,
      pix: { tipo: "cnpj", chave: "12345678000195", favorecido: "Associação de teste", orientacao: "" },
    });
  });

  test("leitura: Pix estranho no documento vale sem Pix", () => {
    assert.equal(lerConfiguracaoDoSite({ pix: { tipo: "cnpj", chave: "123" } }).pix, null);
    assert.equal(lerConfiguracaoDoSite({ pix: { tipo: "outro", chave: "12345678000195" } }).pix, null);
    assert.equal(lerConfiguracaoDoSite({ pix: { tipo: "cnpj", chave: "12345678000195" } }).pix?.chave, "12345678000195");
  });

  test("registro: só os nomes do que mudou, nunca a chave", () => {
    const pix = { tipo: "cnpj" as const, chave: "12345678000195", favorecido: "", orientacao: "" };
    assert.deepEqual(camposAlteradosDoPix(null, pix), ["chave Pix alterada"]);
    assert.deepEqual(camposAlteradosDoPix(pix, { ...pix, orientacao: "Obrigado" }), ["orientação"]);
    assert.deepEqual(camposAlteradosDoPix(pix, null), ["chave Pix removida"]);
    assert.deepEqual(camposAlteradosDoPix(pix, pix), []);
  });
});
