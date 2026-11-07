import assert from "node:assert/strict";
import { test } from "node:test";
import { conteudoPublicadoVisivel } from "../../src/lib/lixeira.ts";

test("conteúdo publicado aparece só quando está fora da lixeira", () => {
  assert.equal(conteudoPublicadoVisivel({ status: "publicado", excluidoEm: null }), true);
  assert.equal(conteudoPublicadoVisivel({ status: "publicado" }), true);
  assert.equal(conteudoPublicadoVisivel({ status: "publicado", excluidoEm: new Date() }), false);
  assert.equal(conteudoPublicadoVisivel({ status: "rascunho", excluidoEm: null }), false);
  assert.equal(conteudoPublicadoVisivel(null), false);
  assert.equal(conteudoPublicadoVisivel(undefined), false);
});
