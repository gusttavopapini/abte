// Testes das partes puras da migração da diretoria (npm run test:unidade):
// leitura do mapa, cargo, nome normalizado e ligação ao profissional só pelo
// nome exato. Só nomes fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { lerDiretoriaDoMapa, nomeNormalizado, profissionalPeloNome } from "../../src/lib/migracao/diretoria.ts";
import { cargoDaDiretoria } from "../../src/lib/migracao/imagensOrigem.ts";

const hex = (n: number) => n.toString(16).padStart(32, "0");
const FOTO = `7dce06_${hex(1)}~mv2.jpg`;

describe("Migração da diretoria: partes puras", () => {
  test("lê os membros na ordem do mapa, com período e foto", () => {
    const lido = lerDiretoriaDoMapa(
      [
        JSON.stringify({ tipo: "diretoria", cargo: "presidente", nome: " Pessoa   Fictícia ", foto: FOTO, periodo: "2025-2027" }),
        JSON.stringify({ tipo: "diretoria", cargo: "vice-presidente", nome: "Outra Pessoa", foto: "https://exemplo.invalid/a.jpg", periodo: "2025-2027" }),
        JSON.stringify({ tipo: "post", slug: "x" }),
      ].join("\n"),
    );
    assert.ok(lido.ok);
    assert.deepEqual(lido.membros, [
      { chave: "presidente", nome: "Pessoa Fictícia", periodo: "2025-2027", fotoNoMapa: FOTO, ordem: 1 },
      { chave: "vice-presidente", nome: "Outra Pessoa", periodo: "2025-2027", fotoNoMapa: null, ordem: 2 },
    ]);
  });

  test("recusa cargo fora do formato, cargo repetido, nome vazio e período fora do formato", () => {
    const linha = (extra: Record<string, unknown>) => JSON.stringify({ tipo: "diretoria", cargo: "presidente", nome: "Pessoa Fictícia", periodo: "2025-2027", ...extra });
    for (const ruim of [linha({ cargo: "Presidente!" }), linha({ nome: "" }), linha({ periodo: "2025" }), [linha({}), linha({})].join("\n"), "{quebrado"]) {
      assert.equal(lerDiretoriaDoMapa(ruim).ok, false, ruim);
    }
  });

  test("cargo pelo nome conhecido, com a primeira letra maiúscula; desconhecido fica null", () => {
    assert.equal(cargoDaDiretoria("secretaria-geral"), "Secretária-geral");
    assert.equal(cargoDaDiretoria("diretora-de-comunicacao-e-marketing"), "Diretora de comunicação e marketing");
    assert.equal(cargoDaDiretoria("tesoureiro"), null);
  });

  test("profissional só pelo nome exato (sem acento, maiúsculas e espaços extras) e único", () => {
    assert.equal(nomeNormalizado("  Ána  CLARA Fictícia "), "ana clara ficticia");
    const lista = [
      { id: "a", nome: "Ana Clara Fictícia" },
      { id: "b", nome: "Bruno Teste" },
      { id: "c", nome: "Bruno  teste" },
    ];
    assert.deepEqual(profissionalPeloNome("ana clara ficticia", lista), { id: "a", casamentos: 1 });
    assert.deepEqual(profissionalPeloNome("Bruno Teste", lista), { id: null, casamentos: 2 }, "dois iguais: nenhuma ligação");
    assert.deepEqual(profissionalPeloNome("Ana Fictícia", lista), { id: null, casamentos: 0 }, "nome parecido não casa");
    assert.deepEqual(profissionalPeloNome("Dra. Ana Clara Fictícia", lista), { id: null, casamentos: 0 }, "nada de tirar títulos");
  });
});
