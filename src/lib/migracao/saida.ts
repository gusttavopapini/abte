// Arquivos locais dos scripts de migração (etapa 6): trava contra duas
// execuções ao mesmo tempo na mesma máquina e gravação dos relatórios em
// tmp-migracao/ (fora do Git). Os relatórios identificam os itens só por id
// ou slug de origem; nomes e textos alternativos nunca entram.
import { mkdirSync, openSync, closeSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PASTA_DA_SAIDA = "tmp-migracao";

// Cria a trava (arquivo exclusivo). Se já existe, outra execução está em
// andamento ou parou no meio: quem chama mostra o caminho e para.
export function adquirirTrava(pasta: string, nome: string): { ok: true; liberar: () => void } | { ok: false; caminho: string } {
  mkdirSync(pasta, { recursive: true });
  const caminho = join(pasta, `.trava-${nome}`);
  try {
    closeSync(openSync(caminho, "wx"));
  } catch {
    return { ok: false, caminho };
  }
  let liberada = false;
  return {
    ok: true,
    liberar: () => {
      if (!liberada) rmSync(caminho, { force: true });
      liberada = true;
    },
  };
}

// Grava o relatório em JSON e em Markdown e devolve os caminhos.
export function gravarRelatorio(pasta: string, nome: string, dados: unknown, markdown: string): { json: string; md: string } {
  mkdirSync(pasta, { recursive: true });
  const json = join(pasta, `${nome}.json`);
  const md = join(pasta, `${nome}.md`);
  writeFileSync(json, `${JSON.stringify(dados, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(md, markdown, { mode: 0o600 });
  return { json, md };
}
