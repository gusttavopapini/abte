import assert from "node:assert/strict";
import { test } from "node:test";
import { enderecoDoBlog, filtrarPostsPorBusca, lerTermoDeBusca } from "../../src/lib/buscaBlog.ts";

const posts = [
  { id: "exercicios", titulo: "Exercícios e reabilitação", resumo: "Cuidado conservador", conteudo: `${"Texto inicial. ".repeat(30)}Ângulo de Cobb e colete.`, formatoConteudo: "texto" as const },
  { id: "adultos", titulo: "Escoliose em adultos", resumo: "Qualidade de vida", conteudo: "## Reabilitação\n\n**Schroth** e [exercícios](https://exemplo.invalid/endereco-oculto).", formatoConteudo: "markdown" as const },
  { id: "literal", titulo: "C++ e [teste]", resumo: "", conteudo: "Texto com símbolos.", formatoConteudo: "texto" as const },
];

test("busca ignora acentos e caixa e exige todos os termos, mantendo a ordem", () => {
  assert.deepEqual(filtrarPostsPorBusca(posts, "EXERCICIOS REABILITACAO").map(x => x.id), ["exercicios", "adultos"]);
  assert.deepEqual(filtrarPostsPorBusca(posts, "adultos colete"), []);
});

test("busca alcança o texto completo, inclusive além da prévia curta", () => {
  assert.deepEqual(filtrarPostsPorBusca(posts, "angulo cobb").map(x => x.id), ["exercicios"]);
  assert.deepEqual(filtrarPostsPorBusca(posts, "qualidade vida").map(x => x.id), ["adultos"]);
});

test("Markdown usa o texto visível sem pesquisar endereços ocultos dos links", () => {
  assert.deepEqual(filtrarPostsPorBusca(posts, "schroth exercicios").map(x => x.id), ["adultos"]);
  assert.deepEqual(filtrarPostsPorBusca(posts, "endereco-oculto"), []);
});

test("símbolos são texto literal e uma busca vazia mantém os resultados", () => {
  assert.deepEqual(filtrarPostsPorBusca(posts, "[teste]").map(x => x.id), ["literal"]);
  assert.deepEqual(filtrarPostsPorBusca(posts, "C++").map(x => x.id), ["literal"]);
  assert.equal(filtrarPostsPorBusca(posts, "  ").length, 3);
});

test("normalização de parâmetros repetidos, espaços e limite sem dupla decodificação", () => {
  assert.equal(lerTermoDeBusca(["  exercícios\n  colete ", "ignorado"]), "exercícios colete");
  assert.equal(lerTermoDeBusca(undefined), "");
  assert.equal(lerTermoDeBusca("x".repeat(150)).length, 100);
  assert.equal(lerTermoDeBusca("100% + C++"), "100% + C++");
});

test("links preservam busca/categoria e codificam caracteres especiais", () => {
  const url = new URL(enderecoDoBlog("colete-e-ortese", "órtese & C++ #1 100%"), "https://exemplo.invalid");
  assert.equal(url.searchParams.get("categoria"), "colete-e-ortese");
  assert.equal(url.searchParams.get("busca"), "órtese & C++ #1 100%");
  assert.equal(enderecoDoBlog("colete-e-ortese"), "/blog?categoria=colete-e-ortese");
  assert.equal(new URL(enderecoDoBlog(undefined, "colete"), url).searchParams.has("categoria"), false);
  assert.equal(enderecoDoBlog(), "/blog");
});
