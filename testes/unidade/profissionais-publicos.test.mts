import assert from "node:assert/strict";
import { test } from "node:test";
import type { Profissional } from "../../src/lib/dados/tipos.ts";
import { CAMPOS_PUBLICOS_DO_PROFISSIONAL, localDoProfissional, paraProfissionalPublico } from "../../src/lib/profissionaisPublicos.ts";
import { normalizarEspacos, paragrafosDoTexto, resumirTexto } from "../../src/lib/texto.ts";

const tamanho = (texto: string) => Array.from(new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(texto)).length;

test("resumo: texto que cabe volta igual, sem reticências, só com os espaços normalizados", () => {
  assert.equal(resumirTexto("Atende adolescentes.", 140), "Atende adolescentes.");
  assert.equal(resumirTexto("  Linha um\n\nlinha   dois\t ", 140), "Linha um linha dois");
  assert.equal(resumirTexto("a".repeat(140), 140), "a".repeat(140));
});

test("resumo: texto vazio, só espaços ou ausente vira texto vazio", () => {
  assert.equal(resumirTexto("", 140), "");
  assert.equal(resumirTexto(" \n\t ", 140), "");
  assert.equal(resumirTexto(undefined as unknown as string, 140), "");
});

test("resumo: corta sempre no fim de uma palavra e termina com o caractere de reticências", () => {
  const texto = "Fisioterapeuta com formação em métodos de exercícios específicos para escoliose, atendimento de crianças, adolescentes e adultos em consultório próprio desde muitos anos.";
  const resumo = resumirTexto(texto, 140);
  assert.ok(resumo.endsWith("…"));
  assert.ok(!resumo.includes("..."));
  assert.ok(tamanho(resumo) <= 140);
  const semReticencias = resumo.slice(0, -1);
  assert.ok(texto.startsWith(semReticencias));
  // O caractere seguinte no original é espaço: a palavra não foi partida.
  assert.equal(texto[semReticencias.length], " ");
  assert.ok(!/[,\s]$/u.test(semReticencias));
});

test("resumo: corte exato no limite mantém a palavra inteira que termina nele", () => {
  assert.equal(resumirTexto("abc def ghi", 8), "abc def…");
  assert.equal(resumirTexto("abc defgh ij", 8), "abc…");
});

test("resumo: tira a pontuação solta antes das reticências", () => {
  assert.equal(resumirTexto("Primeira frase, segunda parte e mais", 17), "Primeira frase…");
  assert.equal(resumirTexto("Uma frase. Outra frase longa", 13), "Uma frase…");
});

test("resumo: acentos contam como um caractere e não são separados", () => {
  const resumo = resumirTexto("Atenção à reabilitação ortopédica conservadora", 25);
  assert.equal(resumo, "Atenção à reabilitação…");
  assert.equal(resumirTexto("Atenção", 7), "Atenção");
  // Acento combinado (e + acento agudo) conta como um caractere.
  assert.equal(resumirTexto("café café", 9), "café café");
});

test("resumo: nunca corta um emoji (par substituto ou sequência) ao meio", () => {
  const texto = `${"x".repeat(8)} 👩‍⚕️👍🏽 fim`;
  const resumo = resumirTexto(texto, 12);
  assert.ok(resumo.endsWith("…"));
  assert.ok(!/[\uD800-\uDBFF]…$/u.test(resumo));
  const palavraLonga = "😀".repeat(10);
  const cortada = resumirTexto(palavraLonga, 5);
  assert.equal(cortada, `${"😀".repeat(4)}…`);
  assert.ok(cortada.isWellFormed());
});

test("resumo: palavra única maior que o limite é cortada no limite", () => {
  assert.equal(resumirTexto("a".repeat(20), 10), `${"a".repeat(9)}…`);
});

test("parágrafos: cada linha com conteúdo vira um parágrafo, sem linhas vazias", () => {
  assert.deepEqual(paragrafosDoTexto("Primeiro.\n\n  Segundo   parágrafo.\r\nTerceiro.\n \n"), ["Primeiro.", "Segundo parágrafo.", "Terceiro."]);
  assert.deepEqual(paragrafosDoTexto(""), []);
  assert.deepEqual(paragrafosDoTexto("<b>texto</b>"), ["<b>texto</b>"]);
  assert.equal(normalizarEspacos(" a \n b "), "a b");
});

// Documento com campos internos e campos que a migração grava no Firestore
// (fora do tipo), para conferir que nada além da lista pública sai.
const documento = {
  id: "abc123",
  tipo: "Fisioterapeutas",
  tratamento: "Dra.",
  nome: "Pessoa Exemplo",
  registro: "Conselho 0000",
  metodos: ["SEAS", "Lyon"],
  pais: "BR",
  uf: "SP",
  cidades: ["Cidade Um", "Cidade Dois"],
  telerreabilitacao: true,
  whatsapp: "5500000000000",
  instagram: "perfil.exemplo",
  facebook: "https://www.facebook.com/exemplo",
  email: "contato@exemplo.invalid",
  bio: "Linha um.\nLinha dois.",
  ativo: true,
  ordem: 3,
  fotoMidiaId: "midia1",
  criadoEm: new Date(0),
  atualizadoEm: new Date(0),
  excluidoEm: null,
  revisarMigracao: true,
  pontosDeRevisao: 4,
  origem: { sistema: "wix", chave: "chave-privada", execucao: "x" },
  conferenciaDeMenor: "pendente",
} as unknown as Profissional;

const foto = { alt: "Foto de exemplo", largura: 800, altura: 800, variantes: [{ largura: 480, url: "https://exemplo.invalid/480.webp" }], conferenciaDeMenor: "pendente", indicaMenor: false } as unknown as Parameters<typeof paraProfissionalPublico>[1];

test("navegador recebe só os campos públicos, nunca os internos, de revisão ou da migração", () => {
  const publico = paraProfissionalPublico(documento, foto);
  assert.deepEqual(Object.keys(publico).sort(), [...CAMPOS_PUBLICOS_DO_PROFISSIONAL].sort());
  const serializado = JSON.stringify(publico);
  for (const proibido of ["revisarMigracao", "pontosDeRevisao", "origem", "chave-privada", "conferenciaDeMenor", "indicaMenor", "ativo", "ordem", "fotoMidiaId", "criadoEm", "atualizadoEm", "excluidoEm", "midia1"]) {
    assert.ok(!serializado.includes(proibido), `vazou: ${proibido}`);
  }
  assert.deepEqual(Object.keys(publico.foto ?? {}).sort(), ["altura", "alt", "largura", "variantes"].sort());
  assert.deepEqual(Object.keys(publico.foto?.variantes[0] ?? {}).sort(), ["largura", "url"]);
});

test("campos públicos chegam com os mesmos valores do documento", () => {
  const publico = paraProfissionalPublico(documento, null);
  assert.equal(publico.local, "Cidade Um, Cidade Dois / SP");
  assert.equal(publico.bio, "Linha um.\nLinha dois.");
  assert.deepEqual(publico.metodos, ["SEAS", "Lyon"]);
  assert.equal(publico.whatsapp, "5500000000000");
  assert.equal(publico.foto, null);
});

test("tipo fora da lista vira a tag sem classificação; país estrangeiro mostra o nome", () => {
  const outro = paraProfissionalPublico({ ...documento, tipo: "Desconhecido" }, null);
  assert.notEqual(outro.tipo, "Desconhecido");
  assert.equal(localDoProfissional({ cidades: [], pais: "PY", uf: "" }), "Paraguai");
});
