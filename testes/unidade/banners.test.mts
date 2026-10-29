import assert from "node:assert/strict";
import { test } from "node:test";
import { linkDoSlide, SLIDES_DO_BANNER } from "../../src/lib/site/banners.ts";

test("os slides do banner começam sem destino (nenhum link inventado)", () => {
  assert.ok(SLIDES_DO_BANNER.length > 0);
  for (const slide of SLIDES_DO_BANNER) assert.equal(linkDoSlide(slide), null);
});

test("caminho interno e https viram link, com o rótulo como nome", () => {
  assert.deepEqual(linkDoSlide({ href: "/loja", rotulo: "Conheça a loja", alt: "Slide 1" }), { href: "/loja", nome: "Conheça a loja" });
  assert.deepEqual(linkDoSlide({ href: " https://exemplo.invalid/a ", rotulo: "", alt: "Slide 2" }), { href: "https://exemplo.invalid/a", nome: "Slide 2" });
});

test("endereço perigoso ou de outro esquema não vira link", () => {
  for (const href of ["javascript:alert(1)", "//exemplo.invalid", "/\\exemplo.invalid", "http://exemplo.invalid", "data:text/html,oi", "loja"]) {
    assert.equal(linkDoSlide({ href, rotulo: "x", alt: "x" }), null, href);
  }
});
