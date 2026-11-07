import { IconeEmail, IconeInstagram, IconeTelefone, IconeWhatsapp } from "@/components/Icones/Icones";
import { telefoneParaLeitura } from "@/lib/contatos";
import estilos from "./ContatosProfissional.module.css";

type Props = {
  nomeCompleto: string;
  whatsapp: string;
  telefones: string[];
  instagram: string;
  email: string;
};

// Botões de contato do profissional (card e popup), com os mesmos destinos,
// textos e área mínima de toque de 44px. Sem nenhum contato, não mostra nada.
// WhatsApp, telefones (06/11/2026), Instagram e e-mail: o Facebook saiu do
// site em 04/11/2026 (o dado continua no cadastro do painel). O telefone abre
// a ligação (tel:); o número vai no nome acessível e, com mais de um, o
// rótulo visível ganha a ordem ("Telefone 2").
export function ContatosProfissional({ nomeCompleto, whatsapp, telefones, instagram, email }: Props) {
  if (!whatsapp && telefones.length === 0 && !instagram && !email) return null;
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
      {telefones.map((telefone, indice) => (
        <li key={telefone}>
          <a href={`tel:+${telefone}`} className={`${estilos.contato} ${estilos.telefone}`}>
            <IconeTelefone className={estilos.iconeContato} />
            {telefones.length > 1 ? `Telefone ${indice + 1}` : "Telefone"}
            <span className="somente-leitor">: {telefoneParaLeitura(telefone)}</span>
          </a>
        </li>
      ))}
      {instagram && (
        <li>
          <a href={`https://www.instagram.com/${instagram}/`} {...novaAba} className={`${estilos.contato} ${estilos.instagram}`}>
            <IconeInstagram className={estilos.iconeContato} />
            Instagram<span className="somente-leitor"> (abre em nova aba)</span>
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
