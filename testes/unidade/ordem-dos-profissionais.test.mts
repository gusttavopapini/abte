// Ordem dos profissionais no site e no painel (10/11/2026).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { nomeParaOrdenar, ordenarParaOsFiltros, ordenarPeloNome, ordenarPorTipoENome, posicaoDoTipo } from "../../src/lib/ordemDosProfissionais.ts";

const p = (id: string, tipo: string, nome: string) => ({ id, tipo, nome });

describe("nome para ordenar", () => {
  test("tira acento, maiúsculas e espaços extras", () => {
    assert.equal(nomeParaOrdenar("  Ângela   Exemplo "), "angela exemplo");
    assert.equal(nomeParaOrdenar("Juçara Exemplo"), "jucara exemplo");
  });

  test("tira o tratamento do início, com ou sem ponto", () => {
    assert.equal(nomeParaOrdenar("Dra. Ana"), "ana");
    assert.equal(nomeParaOrdenar("Dr Mário"), "mario");
    assert.equal(nomeParaOrdenar("Ft. Carla"), "carla");
    assert.equal(nomeParaOrdenar("Prof. Dr. Roberto"), "roberto");
    assert.equal(nomeParaOrdenar("Licenciada Clara"), "clara");
  });

  test("não corta nomes que só começam com as mesmas letras", () => {
    assert.equal(nomeParaOrdenar("Drummond Silva"), "drummond silva");
    assert.equal(nomeParaOrdenar("Licia Souza"), "licia souza");
    assert.equal(nomeParaOrdenar("Francisco"), "francisco");
  });
});

describe("posição do tipo", () => {
  test("segue a ordem do menu; fora da lista vale a de Outros", () => {
    assert.ok(posicaoDoTipo("Fisioterapeutas") < posicaoDoTipo("Médicos"));
    assert.ok(posicaoDoTipo("Médicos") < posicaoDoTipo("Ortesistas"));
    assert.ok(posicaoDoTipo("Ortesistas") < posicaoDoTipo("Psicólogos"));
    assert.ok(posicaoDoTipo("Psicólogos") < posicaoDoTipo("Outros"));
    assert.equal(posicaoDoTipo("Nutricionistas"), posicaoDoTipo("Outros"));
    assert.equal(posicaoDoTipo(""), posicaoDoTipo("Outros"));
  });
});

const LISTA = [
  p("1", "Outros", "Bruno"),
  p("2", "Médicos", "Zélia"),
  p("3", "Fisioterapeutas", "Óscar"),
  p("4", "Psicólogos", "Ana"),
  p("5", "Fisioterapeutas", "André"),
  p("6", "Médicos", "Álvaro"),
  p("7", "Ortesistas", "Caio"),
  p("8", "Fisioterapeutas", "beatriz"),
];

describe("ordem de /profissionais", () => {
  test("Todos: grupos na ordem do menu e nome sem acento dentro do grupo", () => {
    assert.deepEqual(
      ordenarPorTipoENome(LISTA).map((x) => x.id),
      ["5", "8", "3", "6", "2", "7", "4", "1"],
    );
  });

  test("com filtro: só a ordem alfabética, sem grupos", () => {
    assert.deepEqual(
      ordenarPeloNome(LISTA).map((x) => x.nome),
      ["Álvaro", "Ana", "André", "beatriz", "Bruno", "Caio", "Óscar", "Zélia"],
    );
    assert.deepEqual(ordenarParaOsFiltros(LISTA, true), ordenarPeloNome(LISTA));
    assert.deepEqual(ordenarParaOsFiltros(LISTA, false), ordenarPorTipoENome(LISTA));
  });

  test("tipo desconhecido entra no grupo de Outros", () => {
    const lista = [p("x", "Nutricionistas", "Abel"), p("y", "Outros", "Zeca"), p("z", "Médicos", "Mara")];
    assert.deepEqual(ordenarPorTipoENome(lista).map((x) => x.id), ["z", "x", "y"]);
  });

  test("ignora o campo ordem e não muda a lista recebida", () => {
    const lista = [{ ...p("a", "Médicos", "Bia"), ordem: 1 }, { ...p("b", "Médicos", "Ana"), ordem: 9 }];
    const copia = structuredClone(lista);
    assert.deepEqual(ordenarPorTipoENome(lista).map((x) => x.id), ["b", "a"]);
    assert.deepEqual(lista, copia);
  });

  test("nomes iguais desempatam pelo id (ordem estável)", () => {
    const lista = [p("b", "Médicos", "Ana Lima"), p("a", "Médicos", "Ána Lima")];
    assert.deepEqual(ordenarPeloNome(lista).map((x) => x.id), ["a", "b"]);
  });
});
