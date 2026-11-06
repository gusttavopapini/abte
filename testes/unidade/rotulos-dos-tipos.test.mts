// Rótulos visíveis dos tipos de profissional (06/11/2026): ortesistas e
// psicólogos aparecem como parceiros; o valor gravado e o ?tag= não mudam.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ROTULOS_DOS_TIPOS, TAGS_DE_PROFISSIONAIS, rotuloDoTipo } from "../../src/config/profissionais.ts";
import { MENU_PRINCIPAL } from "../../src/config/navegacao.ts";
import { filtrarProfissionais, tipoDoEndereco } from "../../src/lib/filtroDeProfissionais.ts";

describe("Rótulos dos tipos de profissional", () => {
  test("os cinco tipos têm o rótulo certo", () => {
    assert.deepEqual(TAGS_DE_PROFISSIONAIS.map(rotuloDoTipo), [
      "Fisioterapeutas",
      "Médicos",
      "Ortesistas parceiros",
      "Psicólogos parceiros",
      "Outros",
    ]);
    assert.deepEqual(Object.keys(ROTULOS_DOS_TIPOS).sort(), [...TAGS_DE_PROFISSIONAIS].sort());
  });

  test("os valores gravados continuam os mesmos", () => {
    assert.deepEqual([...TAGS_DE_PROFISSIONAIS], ["Fisioterapeutas", "Médicos", "Ortesistas", "Psicólogos", "Outros"]);
  });

  test("valor fora da lista volta como veio", () => {
    assert.equal(rotuloDoTipo("Todos"), "Todos");
    assert.equal(rotuloDoTipo(""), "");
  });

  test("?tag=Ortesistas e ?tag=Psicólogos continuam filtrando pelo valor gravado", () => {
    const lista = [
      { id: "a", tipo: "Fisioterapeutas", pais: "BR", uf: "SP" },
      { id: "b", tipo: "Ortesistas", pais: "BR", uf: "SP" },
      { id: "c", tipo: "Psicólogos", pais: "BR", uf: "RJ" },
    ];
    const todos = { tipo: "todos" } as const;
    const ortesistas = tipoDoEndereco(new URLSearchParams("tag=Ortesistas"));
    const psicologos = tipoDoEndereco(new URLSearchParams("tag=Psic%C3%B3logos"));
    assert.equal(ortesistas, "Ortesistas");
    assert.equal(psicologos, "Psicólogos");
    assert.deepEqual(filtrarProfissionais(lista, ortesistas, todos).map((p) => p.id), ["b"]);
    assert.deepEqual(filtrarProfissionais(lista, psicologos, todos).map((p) => p.id), ["c"]);
    // O rótulo não é um valor de filtro.
    assert.equal(tipoDoEndereco(new URLSearchParams("tag=Ortesistas parceiros")), "Todos");
  });

  test("submenu de Profissionais com os rótulos novos e os mesmos endereços", () => {
    const submenu = MENU_PRINCIPAL.find((item) => item.href === "/profissionais")?.submenu ?? [];
    assert.deepEqual(submenu.map((link) => link.rotulo), [
      "Fisioterapeutas",
      "Médicos",
      "Ortesistas parceiros",
      "Psicólogos parceiros",
      "Outros",
    ]);
    assert.deepEqual(submenu.map((link) => link.href), [
      "/profissionais?tag=Fisioterapeutas",
      "/profissionais?tag=Médicos",
      "/profissionais?tag=Ortesistas",
      "/profissionais?tag=Psicólogos",
      "/profissionais?tag=Outros",
    ]);
  });
});
