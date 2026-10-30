// Link do banner (30/10/2026): uma função só para o navegador e o servidor.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MENSAGEM_TEXTO_DO_BOTAO_COM_ENDERECO, PAGINAS_DO_SITE, lerBannerDoFormulario, textoDoBotaoPareceEndereco, validarLinkDoBanner } from "../../src/lib/site/home.ts";

describe("Link do banner", () => {
  test("caminhos internos aceitos", () => {
    for (const href of ["/blog", "/loja", "/artigos", "/profissionais", "/diretoria", "/contato", "/doe", "/seja-associado", "/blog/um-post", "/loja?categoria=produtos-abte", "/blog/um-post#comentarios"]) {
      assert.deepEqual(validarLinkDoBanner(href), { ok: true, href }, href);
    }
    for (const { href } of PAGINAS_DO_SITE) assert.equal(validarLinkDoBanner(href).ok, true, href);
  });

  test("âncoras da home, com e sem a barra", () => {
    assert.deepEqual(validarLinkDoBanner("#faca-parte"), { ok: true, href: "#faca-parte" });
    assert.deepEqual(validarLinkDoBanner("/#faca-parte"), { ok: true, href: "/#faca-parte" });
    assert.equal(validarLinkDoBanner("#nao-existe").ok, false);
    assert.equal(validarLinkDoBanner("/#nao-existe").ok, false);
  });

  test("https externo aceito; endereço do próprio site vira caminho interno", () => {
    assert.deepEqual(validarLinkDoBanner("https://www.exemplo.org/pagina?x=1"), { ok: true, href: "https://www.exemplo.org/pagina?x=1" });
    assert.deepEqual(validarLinkDoBanner("https://abte-lovat.vercel.app/blog"), { ok: true, href: "/blog", convertido: true });
    assert.deepEqual(validarLinkDoBanner("https://abte-lovat.vercel.app/#faca-parte"), { ok: true, href: "/#faca-parte", convertido: true });
    assert.deepEqual(validarLinkDoBanner("https://site.exemplo.invalid/loja", ["site.exemplo.invalid"]), { ok: true, href: "/loja", convertido: true });
  });

  test("recusados, com mensagem em português", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "//exemplo.invalid", "http://exemplo.invalid", "blog", "/ blog", "/blog\\\\x", "/blog<script>", "https://", "https://usuario:senha@exemplo.org", "ftp://exemplo.org"]) {
      const lido = validarLinkDoBanner(href);
      assert.equal(lido.ok, false, href);
      if (!lido.ok) assert.ok(/caminho do site|seções da home/.test(lido.mensagem), href);
    }
  });

  test("texto do botão com endereço é recusado", () => {
    assert.equal(textoDoBotaoPareceEndereco("https://www.exemplo.org"), true);
    assert.equal(textoDoBotaoPareceEndereco("www://x"), true);
    assert.equal(textoDoBotaoPareceEndereco("Acesse nosso blog"), false);
    const lido = lerBannerDoFormulario({ chave: "banner-aaaa1111", midiaId: "m1", alt: "A", href: "/blog", ativo: "sim", posicao: "1", textoDoBotao: "https://www.exemplo.org/blog" });
    assert.ok(!lido.ok);
    assert.equal(lido.erros.textoDoBotao, MENSAGEM_TEXTO_DO_BOTAO_COM_ENDERECO);
    assert.equal(lido.erros.href, undefined, "o erro fica no campo certo");
  });
});


test("recusa https malformado e escapes incompletos", () => {
  for (const link of ["https:/exemplo.org", "https:exemplo.org", "https:///exemplo.org", "/blog%zz", "/blog%", "https://exemplo.org/%zz"]) {
    assert.equal(validarLinkDoBanner(link).ok, false, link);
  }
});
