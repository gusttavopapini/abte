// Legenda (.vtt) do vídeo de "Quem Somos" servida pelo próprio site
// (08/11/2026). O Storage não manda CORS, e o navegador só carrega <track>
// de outro domínio com crossOrigin no <video>, o que faria o próprio vídeo
// falhar. Aqui o servidor lê o arquivo pelo Admin SDK e devolve como
// text/vtt, do mesmo domínio da página.
//
// Segurança: só o id da pasta (20 letras e números) entra; o caminho é
// sempre publico/videos/{id}/legenda.vtt, o mesmo do envio pelo painel.
// Nada de caminho arbitrário. O arquivo precisa ter o tipo text/vtt, até
// 200 KB e começar com WEBVTT (as mesmas conferências do envio).
import "server-only";

import { getStorage } from "firebase-admin/storage";
import { obterApp } from "@/lib/firebase/servidor";
import { nomeDoBucket } from "@/lib/midia/servicos";
import { LIMITE_DA_LEGENDA_EM_BYTES, TIPO_DA_LEGENDA, caminhoDaLegendaPeloId, legendaValida } from "@/lib/site/videoQuemSomos";

export const runtime = "nodejs";

// Algumas horas em cache: cada envio pelo painel ganha um id novo, então o
// mesmo endereço nunca muda de conteúdo.
const CACHE_DA_LEGENDA = "public, max-age=14400, s-maxage=14400, stale-while-revalidate=86400";

function naoEncontrada(): Response {
  return new Response("Legenda não encontrada.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(_requisicao: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const caminho = caminhoDaLegendaPeloId(id);
  if (!caminho) return naoEncontrada();
  try {
    const arquivo = getStorage(obterApp()).bucket(nomeDoBucket()).file(caminho);
    const [existe] = await arquivo.exists();
    if (!existe) return naoEncontrada();
    const [metadados] = await arquivo.getMetadata();
    const tamanho = Number(metadados.size ?? 0);
    if (metadados.contentType !== TIPO_DA_LEGENDA || !(tamanho > 0) || tamanho > LIMITE_DA_LEGENDA_EM_BYTES) return naoEncontrada();
    const [conteudo] = await arquivo.download();
    const texto = conteudo.toString("utf8");
    if (!legendaValida(texto)) return naoEncontrada();
    return new Response(texto, {
      status: 200,
      headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": CACHE_DA_LEGENDA, "X-Content-Type-Options": "nosniff" },
    });
  } catch (erro) {
    console.error(`Legenda ${id}: falha ao ler do armazenamento.`, erro);
    return new Response("Legenda indisponível no momento.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
