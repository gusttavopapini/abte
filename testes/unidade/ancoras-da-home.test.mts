// Link do banner para uma seção da home (30/10/2026, src/lib/site/ancoras.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ANCORAS_DA_HOME, ancoraDoLink, ehAncoraDaHome } from "../../src/lib/site/ancoras.ts";
import { linkDoSlide } from "../../src/lib/site/banners.ts";
import { lerBannerDoFormulario, validarLinkDoBanner } from "../../src/lib/site/home.ts";

describe("Âncoras da home", () => {
  test("lista estável, com faca-parte", () => {
    assert.deepEqual(ANCORAS_DA_HOME.map((ancora) => ancora.id), ["o-que-fazemos", "mutiroes", "produtos", "quem-somos", "faca-parte"]);
    assert.equal(ehAncoraDaHome("faca-parte"), true);
    assert.equal(ehAncoraDaHome("contato"), false);
  });

  test("cada âncora existe na home, numa seção com o título focável", () => {
    const codigo = readFileSync("src/app/page.tsx", "utf8");
    for (const { id } of ANCORAS_DA_HOME) assert.match(codigo, new RegExp(`<section id="${id}"`), id);
    assert.equal((codigo.match(/<h2[^>]*tabIndex=\{-1\}/g) ?? []).length, ANCORAS_DA_HOME.length);
  });

  test("validador: #âncora só da lista; recusa javascript:, data:, // e inválidos", () => {
    assert.deepEqual(validarLinkDoBanner("#faca-parte"), { ok: true, href: "#faca-parte" });
    for (const href of ["#nao-existe", "#", "javascript:alert(1)", "data:text/html,x", "//exemplo.invalid", "http://exemplo.invalid"]) assert.equal(validarLinkDoBanner(href).ok, false, href);
    const recusado = validarLinkDoBanner("#nao-existe");
    assert.ok(!recusado.ok && recusado.mensagem.includes("seções da home"));
    assert.ok(lerBannerDoFormulario({ chave: "banner-aaaa1111", midiaId: "m1", alt: "A", href: "#mutiroes", ativo: "sim", posicao: "1" }).ok);
  });

  test("link do slide: \"#âncora\" vira \"/#âncora\" (funciona de qualquer página)", () => {
    assert.deepEqual(linkDoSlide({ href: "#faca-parte", rotulo: "", alt: "Faça parte" }), { href: "/#faca-parte", nome: "Faça parte" });
    assert.equal(ancoraDoLink("/#faca-parte"), "faca-parte");
    assert.equal(ancoraDoLink("#outra"), null);
    assert.equal(ancoraDoLink("/loja"), null);
  });
});
