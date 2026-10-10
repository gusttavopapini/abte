// Testes da validação dos contatos dos profissionais (npm run test:unidade).
// Números e nomes abaixo são formatos de exemplo, não contatos reais.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validarEmailDeContato, validarFacebook, validarInstagram, validarWhatsapp } from "../../src/lib/contatos.ts";

const valor = (resultado: { ok: boolean; valor?: string; erro?: string }) => {
  assert.equal(resultado.ok, true, resultado.erro);
  return resultado.valor;
};
const erro = (resultado: { ok: boolean; erro?: string }) => {
  assert.equal(resultado.ok, false, "deveria recusar");
  return resultado.erro ?? "";
};

describe("WhatsApp", () => {
  test("vazio é aceito (contato opcional)", () => {
    assert.equal(valor(validarWhatsapp("  ", "BR")), "");
  });

  test("número brasileiro em vários formatos vira só dígitos com 55", () => {
    for (const entrada of ["(11) 91234-5678", "11 912345678", "011 91234-5678", "+55 11 91234-5678", "0055 11 91234 5678", "https://wa.me/5511912345678", "api.whatsapp.com/send?phone=5511912345678"]) {
      assert.equal(valor(validarWhatsapp(entrada, "BR")), "5511912345678", entrada);
    }
  });

  test("fixo com 8 dígitos e DDD 55 (RS) não é confundido com o código do país", () => {
    assert.equal(valor(validarWhatsapp("(55) 3222-1234", "BR")), "555532221234");
    assert.equal(valor(validarWhatsapp("55 91234-5678", "BR")), "5555912345678");
  });

  test("Paraguai e Bolívia usam o código do país do profissional", () => {
    assert.equal(valor(validarWhatsapp("0981 123 456", "PY")), "595981123456");
    assert.equal(valor(validarWhatsapp("7123 4567", "BO")), "59171234567");
    assert.equal(valor(validarWhatsapp("+595 981 123456", "BR")), "595981123456");
  });

  test("recusa números curtos, longos, celular sem 9 e DDD com zero", () => {
    for (const entrada of ["1234", "(11) 81234-56789", "(11) 81234-5678", "(10) 91234-5678", "+1 202 555 0100"]) {
      assert.match(erro(validarWhatsapp(entrada, "BR")), /WhatsApp inválido/, entrada);
    }
  });

  test("recusa letras e aponta contato trocado", () => {
    assert.match(erro(validarWhatsapp("11 9abc-5678", "BR")), /Use só números/);
    assert.match(erro(validarWhatsapp("contato@exemplo.com.br", "BR")), /parece um e-mail/);
    assert.match(erro(validarWhatsapp("instagram.com/perfil", "BR")), /campo Instagram/);
    assert.match(erro(validarWhatsapp("https://www.facebook.com/pagina", "BR")), /campo Facebook/);
  });
});

describe("Instagram", () => {
  test("aceita @usuario, usuario e link do perfil, e guarda em minúsculas sem @", () => {
    for (const entrada of ["@Perfil.Exemplo", "perfil.exemplo", "https://www.instagram.com/perfil.exemplo/", "instagram.com/perfil.exemplo?igsh=abc"]) {
      assert.equal(valor(validarInstagram(entrada)), "perfil.exemplo", entrada);
    }
  });

  test("recusa link de publicação, outro site e nome inválido", () => {
    assert.match(erro(validarInstagram("https://www.instagram.com/p/AbC123/")), /publicação/);
    assert.match(erro(validarInstagram("https://exemplo.com/perfil")), /não é um perfil/);
    assert.match(erro(validarInstagram("perfil..exemplo")), /inválido/);
    assert.match(erro(validarInstagram("perfil.")), /inválido/);
    assert.match(erro(validarInstagram("a".repeat(31))), /inválido/);
  });

  test("aponta contato trocado", () => {
    assert.match(erro(validarInstagram("contato@exemplo.com.br")), /campo E-mail/);
    assert.match(erro(validarInstagram("facebook.com/pagina.exemplo")), /campo Facebook/);
    assert.match(erro(validarInstagram("(11) 91234-5678")), /campo WhatsApp/);
  });
});

describe("Facebook", () => {
  test("aceita link do perfil ou da página e só o nome, guardando o link padrão", () => {
    for (const entrada of ["https://www.facebook.com/pagina.exemplo", "facebook.com/pagina.exemplo/", "m.facebook.com/pagina.exemplo?ref=x", "fb.com/pagina.exemplo", "pagina.exemplo"]) {
      assert.equal(valor(validarFacebook(entrada)), "https://www.facebook.com/pagina.exemplo", entrada);
    }
    assert.equal(valor(validarFacebook("https://www.facebook.com/profile.php?id=100012345678")), "https://www.facebook.com/profile.php?id=100012345678");
  });

  test("recusa publicação, grupo, compartilhamento e link sem perfil", () => {
    for (const entrada of ["https://www.facebook.com/pagina/posts/123", "https://www.facebook.com/groups/abc", "https://www.facebook.com/sharer/sharer.php?u=x", "https://www.facebook.com/", "facebook.com/profile.php"]) {
      assert.equal(validarFacebook(entrada).ok, false, entrada);
    }
  });

  test("aponta contato trocado e recusa outro site", () => {
    assert.match(erro(validarFacebook("@perfil.exemplo/")), /não é um link do Facebook/);
    assert.match(erro(validarFacebook("https://instagram.com/perfil")), /campo Instagram/);
    assert.match(erro(validarFacebook("contato@exemplo.com.br")), /campo E-mail/);
    assert.match(erro(validarFacebook("+55 11 91234-5678")), /campo WhatsApp/);
  });
});

describe("E-mail de contato", () => {
  test("aceita e guarda em minúsculas, sem espaços nas pontas", () => {
    assert.equal(valor(validarEmailDeContato("  Contato@Exemplo.com.br ")), "contato@exemplo.com.br");
    assert.equal(valor(validarEmailDeContato("contato@mail.facebook.com")), "contato@mail.facebook.com");
  });

  test("recusa formato inválido e aponta contato trocado", () => {
    assert.match(erro(validarEmailDeContato("contato@exemplo")), /E-mail inválido/);
    assert.match(erro(validarEmailDeContato("instagram.com/perfil")), /campo Instagram/);
    assert.match(erro(validarEmailDeContato("(11) 91234-5678")), /campo WhatsApp/);
  });
});
