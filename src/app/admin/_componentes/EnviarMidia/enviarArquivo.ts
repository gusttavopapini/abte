// Envio de uma imagem do navegador (29/10/2026): reduz no navegador
// (reduzirImagem) e manda pela ação enviarMidia, que processa tudo no
// servidor pelo mesmo caminho da biblioteca (lib/midia/biblioteca.ts). Comum
// ao envio da biblioteca (EnviarMidia) e ao campo de imagem de cada item
// (ImagemDoItem, GaleriaDeMidia, texto do post, home).
import { enviarMidia, type RespostaDaMidia } from "@/app/admin/acoes-midia";
import type { DonoDaMidia } from "@/lib/midia/dono";
import { reduzirImagem } from "./reduzirImagem";

export type PedidoDeEnvio = {
  arquivo: File;
  alt: string;
  indicaMenor: boolean;
  autorizacao: boolean;
  dono?: DonoDaMidia | null;
};

export type EtapaDoEnvio = "preparando" | "enviando";

export async function enviarArquivo(pedido: PedidoDeEnvio, aoMudarEtapa?: (etapa: EtapaDoEnvio) => void): Promise<RespostaDaMidia> {
  aoMudarEtapa?.("preparando");
  const reduzida = await reduzirImagem(pedido.arquivo);
  if (!reduzida.ok) return { ok: false, mensagem: reduzida.mensagem, erros: { arquivo: reduzida.mensagem } };
  const dados = new FormData();
  dados.set("arquivo", reduzida.arquivo);
  dados.set("alt", pedido.alt);
  if (pedido.indicaMenor) dados.set("indicaMenor", "sim");
  if (pedido.indicaMenor && pedido.autorizacao) dados.set("autorizacao", "sim");
  if (pedido.dono) {
    dados.set("donoTipo", pedido.dono.tipo);
    dados.set("donoId", pedido.dono.id ?? "");
    dados.set("donoCampo", pedido.dono.campo);
  }
  aoMudarEtapa?.("enviando");
  return enviarMidia(dados);
}
