// Componentes "use client" não podem importar código de servidor que não usa
// "server-only" (npm run test:unidade). Esses módulos ficam sem "server-only"
// para serem usados por scripts e testes, e importá-los no navegador quebraria
// o build (ou levaria código de servidor para o navegador).
//
// Este teste olha só as importações DIRETAS dos arquivos "use client". Uma
// importação indireta (componente que importa um arquivo que importa a
// biblioteca) é barrada pelo build: o Next.js não consegue empacotar sharp e
// firebase-admin para o navegador ("Can't resolve 'child_process'").
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, test } from "node:test";

const RAIZ = resolve(import.meta.dirname, "../..");
const SRC = join(RAIZ, "src");

const PACOTES_PROIBIDOS = [/^firebase-admin(\/|$)/, /^sharp$/];
const MODULOS_PROIBIDOS = ["src/lib/midia/biblioteca", "src/lib/loja/contas", "src/lib/log/alteracoes"];
const PASTAS_PROIBIDAS = ["src/lib/gravacao/"];

// O arquivo começa pela diretiva "use client" (depois de comentários).
export function ehDeCliente(texto: string): boolean {
  const semComentarios = texto.replace(/^(\s*(\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, "");
  return /^["']use client["']/.test(semComentarios);
}

// Importações que levam código (as "import type" e as só com especificadores
// "type" ficam de fora: somem no build).
export function importacoesComCodigo(texto: string): string[] {
  const modulos: string[] = [];
  for (const [, clausula, modulo] of texto.matchAll(/(?:^|\n)\s*(?:import|export)\s+([^;"']*?)\s+from\s+["']([^"']+)["']/g)) {
    const limpa = clausula.trim();
    if (limpa.startsWith("type ")) continue;
    const chaves = limpa.match(/^\{([\s\S]*)\}$/);
    if (chaves && chaves[1].split(",").map((item) => item.trim()).filter(Boolean).every((item) => item.startsWith("type "))) continue;
    modulos.push(modulo);
  }
  for (const [, modulo] of texto.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) modulos.push(modulo);
  for (const [, modulo] of texto.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) modulos.push(modulo);
  return modulos;
}

// Caminho do módulo a partir da raiz do projeto, sem extensão (ou o nome do pacote).
function resolverModulo(arquivo: string, modulo: string): string {
  let caminho: string;
  if (modulo.startsWith("@/")) caminho = join(SRC, modulo.slice(2));
  else if (modulo.startsWith(".")) caminho = resolve(dirname(arquivo), modulo);
  else return modulo;
  return relative(RAIZ, caminho).replace(/\.(ts|tsx|mts)$/, "").replaceAll("\\", "/");
}

export function ehProibido(arquivo: string, modulo: string): boolean {
  const alvo = resolverModulo(arquivo, modulo);
  return (
    PACOTES_PROIBIDOS.some((padrao) => padrao.test(alvo)) ||
    MODULOS_PROIBIDOS.includes(alvo) ||
    PASTAS_PROIBIDAS.some((pasta) => alvo.startsWith(pasta))
  );
}

function arquivosDoProjeto(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDoProjeto(caminho);
    return /\.(ts|tsx|mts)$/.test(nome) ? [caminho] : [];
  });
}

describe("Fronteira entre navegador e servidor", () => {
  test("o verificador reconhece diretiva, importação proibida e importação só de tipo", () => {
    const arquivo = join(SRC, "app/admin/_componentes/Exemplo/Exemplo.tsx");
    const cliente = `// comentário\n"use client";\n\nimport { enviarImagem } from "@/lib/midia/biblioteca";\nimport type { AutorDaAlteracao } from "@/lib/log/alteracoes";\nimport { type Firestore } from "firebase-admin/firestore";\nimport sharp from "sharp";\nimport { gravarProfissional } from "../../../../lib/gravacao/profissionais.ts";`;
    assert.equal(ehDeCliente(cliente), true);
    assert.equal(ehDeCliente(`import "server-only";\nexport const a = 1;`), false);
    const proibidas = importacoesComCodigo(cliente).filter((modulo) => ehProibido(arquivo, modulo));
    assert.deepEqual(proibidas, ["@/lib/midia/biblioteca", "sharp", "../../../../lib/gravacao/profissionais.ts"]);
    assert.equal(ehProibido(arquivo, "@/lib/midia/regras"), false);
    assert.equal(ehProibido(arquivo, "@/app/admin/acoes-midia"), false, "ação de servidor pode ser importada");
  });

  test('nenhum arquivo "use client" importa código de servidor', () => {
    const arquivos = arquivosDoProjeto(SRC);
    const deCliente = arquivos.filter((arquivo) => ehDeCliente(readFileSync(arquivo, "utf8")));
    assert.ok(deCliente.length > 10, "encontrou os componentes de cliente");
    const problemas = deCliente.flatMap((arquivo) =>
      importacoesComCodigo(readFileSync(arquivo, "utf8"))
        .filter((modulo) => ehProibido(arquivo, modulo))
        .map((modulo) => `${relative(RAIZ, arquivo)} importa ${modulo}`),
    );
    assert.deepEqual(problemas, []);
  });
});
