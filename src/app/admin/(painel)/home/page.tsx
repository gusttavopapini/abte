import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerImagensDaHome } from "@/lib/dados/home";
import { lerConfiguracaoDoSiteAgora } from "@/lib/dados/site";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { ESPACOS_DA_HOME, midiasDaHome, nomeDoBanner, ordenarBanners } from "@/lib/site/home";
import { HomeAdminClient, type BannerNaTela, type EspacoNaTela } from "./HomeAdminClient";

export const metadata: Metadata = { title: "Home" };

// Imagens da home (29/10/2026): banners do carrossel e as imagens fixas das
// sections, lidas de configuracoes/home. Sem o documento, a lista de banners
// fica vazia e a home mostra o padrão de antes.
export default async function PaginaAdminHome() {
  await exigirPapelDoPainel("home.editar");
  const configuracao = await lerImagensDaHome();
  const imagens = await imagensAtivasPorId(midiasDaHome(configuracao));

  const banners: BannerNaTela[] = ordenarBanners(configuracao?.banners ?? []).map((banner) => ({
    ...banner,
    nome: nomeDoBanner(banner.ordem),
    imagem: banner.midiaId ? imagens.get(banner.midiaId) ?? null : null,
    imagemCelular: banner.midiaMobileId ? imagens.get(banner.midiaMobileId) ?? null : null,
    imagemTablet: banner.midiaTabletId ? imagens.get(banner.midiaTabletId) ?? null : null,
  }));
  const espacos: EspacoNaTela[] = ESPACOS_DA_HOME.map((espaco) => {
    const escolhida = configuracao?.imagens[espaco.identificador];
    return {
      identificador: espaco.identificador,
      nome: espaco.nome,
      onde: espaco.onde,
      proporcoes: espaco.proporcoes,
      midiaId: escolhida?.midiaId ?? null,
      midiaMobileId: escolhida?.midiaMobileId ?? null,
      alt: escolhida?.alt ?? "",
      imagem: escolhida?.midiaId ? imagens.get(escolhida.midiaId) ?? null : null,
      imagemCelular: escolhida?.midiaMobileId ? imagens.get(escolhida.midiaMobileId) ?? null : null,
    };
  });

  const { artigosAtivo } = await lerConfiguracaoDoSiteAgora().catch(() => ({ artigosAtivo: true }));
  const video = configuracao?.video ?? null;
  const capaDoVideo = video?.capaMidiaId ? imagens.get(video.capaMidiaId) ?? null : null;
  return <HomeAdminClient banners={banners} espacos={espacos} artigosAtivo={artigosAtivo} video={video} capaDoVideo={capaDoVideo} />;
}
