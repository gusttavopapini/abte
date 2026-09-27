import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";

// Home PROVISÓRIA: o conteúdo real chega na etapa 2.
export default function PaginaInicial() {
  return (
    <LayoutPublico header="transparente">
      <Hero titulo="ABTE" sobHeaderFixo />
    </LayoutPublico>
  );
}
