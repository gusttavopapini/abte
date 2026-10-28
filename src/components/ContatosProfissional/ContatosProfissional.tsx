import { IconeEmail, IconeFacebook, IconeInstagram, IconeWhatsapp } from "@/components/Icones/Icones";
import estilos from "./ContatosProfissional.module.css";

type Props = {
  nomeCompleto: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
};

// Botões de contato do profissional (card e popup), com os mesmos destinos,
// textos e área mínima de toque de 44px. Sem nenhum contato, não mostra nada.
export function ContatosProfissional({ nomeCompleto, whatsapp, instagram, facebook, email }: Props) {
  if (!whatsapp && !instagram && !facebook && !email) return null;
  const novaAba = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <ul role="list" aria-label={`Contatos de ${nomeCompleto}`} className={estilos.contatos}>
      {whatsapp && (
        <li>
          <a href={`https://wa.me/${whatsapp}`} {...novaAba} className={`${estilos.contato} ${estilos.whatsapp}`}>
            <IconeWhatsapp className={estilos.iconeContato} />
            WhatsApp<span className="somente-leitor"> (abre em nova aba)</span>
          </a>
        </li>
      )}
      {instagram && (
        <li>
          <a href={`https://www.instagram.com/${instagram}/`} {...novaAba} className={`${estilos.contato} ${estilos.instagram}`}>
            <IconeInstagram className={estilos.iconeContato} />
            Instagram<span className="somente-leitor"> (abre em nova aba)</span>
          </a>
        </li>
      )}
      {facebook && (
        <li>
          <a href={facebook} {...novaAba} className={`${estilos.contato} ${estilos.facebook}`}>
            <IconeFacebook className={estilos.iconeContato} />
            Facebook<span className="somente-leitor"> (abre em nova aba)</span>
          </a>
        </li>
      )}
      {email && (
        <li>
          <a href={`mailto:${email}`} className={`${estilos.contato} ${estilos.email}`}>
            <IconeEmail className={estilos.iconeContato} />
            E-mail
          </a>
        </li>
      )}
    </ul>
  );
}
