import Link from "next/link";
import { EMAIL_CONTATO, REDES_SOCIAIS, RODAPE_LEGAL, RODAPE_MENU, type LinkDeNavegacao } from "@/config/navegacao";
import { IconeInstagram } from "@/components/Icones/Icones";
import { Logo } from "@/components/Logo/Logo";
import estilos from "./Rodape.module.css";

function Coluna({ titulo, links }: { titulo: string; links: LinkDeNavegacao[] }) {
  return (
    <div className={estilos.coluna}>
      <h2 className={estilos.tituloColuna}>{titulo}</h2>
      <ul role="list" className={estilos.lista}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={`realce ${estilos.link}`}>
              {link.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Rodapé (design-system.md seção 8.9 e ABTE_design_redesign.md seção 4.3).
// Desde 30/10/2026, as listas chegam filtradas pelo layout público (sem
// "Artigos" quando eles estão fora do site; só as páginas legais publicadas).
export function Rodape({ menu = RODAPE_MENU, legal = RODAPE_LEGAL }: { menu?: LinkDeNavegacao[]; legal?: LinkDeNavegacao[] }) {
  const ano = new Date().getFullYear();
  return (
    <footer className={estilos.rodape}>
      <div className={estilos.colunas}>
        <Coluna titulo="Menu" links={menu} />
        {legal.length > 0 && <Coluna titulo="Legal" links={legal} />}
        <div className={estilos.coluna}>
          <h2 className={estilos.tituloColuna}>Contato</h2>
          <a href={`mailto:${EMAIL_CONTATO}`} className={`realce ${estilos.link}`}>
            {EMAIL_CONTATO}
          </a>
          {/* Um link só, com o ícone e o texto (30/10/2026); o aviso de nova
              aba vai como descrição, para o nome continuar "Siga nosso Instagram". */}
          <a href={REDES_SOCIAIS.instagram} target="_blank" rel="noopener noreferrer" className={`realce ${estilos.rede}`} aria-describedby="rodape-nova-aba">
            <IconeInstagram className={estilos.icone} />
            <span>Siga nosso Instagram</span>
          </a>
          <span id="rodape-nova-aba" className="somente-leitor">
            Abre em nova aba
          </span>
        </div>
      </div>

      <div className={estilos.pe}>
        <Logo className={estilos.logoFooter} />
        <p className={estilos.copyright}>
          © {ano} ABTE, Associação Brasileira de Tratamento da Escoliose. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
