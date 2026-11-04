// Filtro de /profissionais por tipo e por estado (04/11/2026).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { filtrarProfissionais, opcoesDeRegiao, regiaoDoEndereco, textoDaQuantidade, tipoDoEndereco, valorDaRegiao } from "../../src/lib/filtroDeProfissionais.ts";

const p = (id: string, tipo: string, pais: string, uf: string) => ({ id, tipo, pais, uf });
const LISTA = [
  p("a", "Fisioterapeutas", "BR", "SP"),
  p("b", "Médicos", "BR", "SP"),
  p("c", "Fisioterapeutas", "BR", "MS"),
  p("d", "Fisioterapeutas", "BR", "AL"),
  p("e", "Fisioterapeutas", "BR", "DF"),
  p("f", "Fisioterapeutas", "BO", ""),
  p("g", "Fisioterapeutas", "BR", ""),
  p("h", "Psicólogos", "PY", ""),
  p("i", "Ortesistas", "BR", "XX"),
];
const params = (consulta: string) => new URLSearchParams(consulta);

describe("Opções do filtro por estado", () => {
  test("nascem dos dados: estados pelo nome, depois os países de fora, sem inventar UF", () => {
    const opcoes = opcoesDeRegiao(LISTA);
    assert.deepEqual(opcoes.map((opcao) => opcao.rotulo), ["Todos os estados", "Alagoas (AL)", "Distrito Federal (DF)", "Mato Grosso do Sul (MS)", "São Paulo (SP)", "Bolívia", "Paraguai"]);
    assert.deepEqual(opcoes.map((opcao) => opcao.valor), ["", "uf:AL", "uf:DF", "uf:MS", "uf:SP", "pais:BO", "pais:PY"]);
  });

  test("sem profissionais, só Todos os estados", () => {
    assert.deepEqual(opcoesDeRegiao([]).map((opcao) => opcao.rotulo), ["Todos os estados"]);
  });
});

describe("Endereço do filtro", () => {
  const opcoes = opcoesDeRegiao(LISTA);
  test("UF e país válidos, também em minúsculas; com os dois, vale a UF", () => {
    assert.deepEqual(regiaoDoEndereco(params("uf=SP"), opcoes), { tipo: "uf", uf: "SP" });
    assert.deepEqual(regiaoDoEndereco(params("uf=ms"), opcoes), { tipo: "uf", uf: "MS" });
    assert.deepEqual(regiaoDoEndereco(params("pais=BO"), opcoes), { tipo: "pais", pais: "BO" });
    assert.deepEqual(regiaoDoEndereco(params("uf=DF&pais=BO"), opcoes), { tipo: "uf", uf: "DF" });
  });

  test("valor inválido ou sem profissional cai em Todos os estados", () => {
    for (const consulta of ["uf=RJ", "uf=XX", "uf=", "pais=BR", "pais=AR", "uf=<script>", ""]) {
      assert.deepEqual(regiaoDoEndereco(params(consulta), opcoes), { tipo: "todos" }, consulta);
    }
    assert.equal(tipoDoEndereco(params("tag=Inventado")), "Todos");
    assert.equal(tipoDoEndereco(params("tag=Médicos")), "Médicos");
  });

  test("valor da opção selecionada", () => {
    assert.equal(valorDaRegiao({ tipo: "todos" }), "");
    assert.equal(valorDaRegiao({ tipo: "uf", uf: "SP" }), "uf:SP");
    assert.equal(valorDaRegiao({ tipo: "pais", pais: "BO" }), "pais:BO");
  });
});

describe("Filtragem combinada", () => {
  const ids = (lista: { id: string }[]) => lista.map((item) => item.id);
  test("interseção do tipo com o estado", () => {
    assert.deepEqual(ids(filtrarProfissionais(LISTA, "Todos", { tipo: "uf", uf: "SP" })), ["a", "b"]);
    assert.deepEqual(ids(filtrarProfissionais(LISTA, "Médicos", { tipo: "uf", uf: "SP" })), ["b"]);
    assert.deepEqual(ids(filtrarProfissionais(LISTA, "Fisioterapeutas", { tipo: "pais", pais: "BO" })), ["f"]);
    assert.deepEqual(ids(filtrarProfissionais(LISTA, "Médicos", { tipo: "uf", uf: "MS" })), []);
  });

  test("Brasil sem UF só aparece em Todos os estados", () => {
    assert.ok(ids(filtrarProfissionais(LISTA, "Todos", { tipo: "todos" })).includes("g"));
    for (const uf of ["SP", "MS", "AL", "DF"]) assert.ok(!ids(filtrarProfissionais(LISTA, "Todos", { tipo: "uf", uf })).includes("g"));
    assert.equal(filtrarProfissionais(LISTA, "Todos", { tipo: "todos" }).length, LISTA.length);
  });

  test("texto da quantidade", () => {
    assert.equal(textoDaQuantidade(0), "Nenhum profissional encontrado com esses filtros.");
    assert.equal(textoDaQuantidade(1), "1 profissional encontrado.");
    assert.equal(textoDaQuantidade(12), "12 profissionais encontrados.");
  });
});
