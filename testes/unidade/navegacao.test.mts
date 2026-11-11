// Menu principal e rodapé (11/11/2026): "Quem Somos" como primeiro item,
// apontando para a âncora da seção da home.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MENU_PRINCIPAL, RODAPE_MENU, itemEstaAtivo, linkEstaAtivo } from "../../src/config/navegacao.ts";
import { ancoraDoLink } from "../../src/lib/site/ancoras.ts";
import { itensDoMenu, linksDisponiveis } from "../../src/lib/site/configuracoes.ts";

test("menu principal: Quem Somos primeiro, antes de Profissionais", () => {
  assert.deepEqual(
    MENU_PRINCIPAL.map((item) => [item.rotulo, item.href]),
    [
      ["Quem Somos", "/#quem-somos"],
      ["Profissionais", "/profissionais"],
      ["Blog", "/blog"],
      ["Artigos", "/artigos"],
      ["Loja", "/loja"],
      ["Contato", "/contato"],
    ],
  );
  assert.equal(MENU_PRINCIPAL[0].submenu, undefined);
});

test("coluna Menu do rodapé: Quem Somos primeiro", () => {
  assert.deepEqual(
    RODAPE_MENU.map((link) => link.rotulo),
    ["Quem Somos", "Profissionais", "Blog", "Artigos", "Loja", "Contato"],
  );
  assert.equal(RODAPE_MENU[0].href, "/#quem-somos");
});

test("o endereço de Quem Somos é uma âncora válida da home", () => {
  assert.equal(ancoraDoLink(MENU_PRINCIPAL[0].href ?? ""), "quem-somos");
  assert.equal(ancoraDoLink(RODAPE_MENU[0].href), "quem-somos");
});

test("Quem Somos não fica ativo só por estar na home nem em outra página", () => {
  for (const caminho of ["/", "/blog", "/profissionais"]) {
    assert.equal(itemEstaAtivo(caminho, MENU_PRINCIPAL[0]), false, caminho);
    assert.equal(linkEstaAtivo(caminho, "/#quem-somos"), false, caminho);
  }
  // Os outros itens continuam como antes.
  assert.equal(linkEstaAtivo("/blog", "/blog"), true);
  assert.equal(linkEstaAtivo("/blog/um-post", "/blog"), true);
  assert.equal(linkEstaAtivo("/blogger", "/blog"), false);
});

test("Quem Somos continua no menu e no rodapé com Artigos desligado", () => {
  const configuracao = { artigosAtivo: false } as Parameters<typeof itensDoMenu>[1];
  assert.equal(itensDoMenu(MENU_PRINCIPAL, configuracao)[0].rotulo, "Quem Somos");
  assert.equal(linksDisponiveis(RODAPE_MENU, configuracao)[0].rotulo, "Quem Somos");
  assert.ok(!itensDoMenu(MENU_PRINCIPAL, configuracao).some((item) => item.href === "/artigos"));
});
