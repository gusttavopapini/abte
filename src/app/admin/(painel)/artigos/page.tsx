import type { Metadata } from "next";
import Link from "next/link";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerArtigos } from "@/lib/dados/colecoes";
import { Botao } from "@/components/Botao/Botao";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { TabelaPainel, classeDaCelula, estiloLinha } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";

export const metadata: Metadata = { title: "Artigos" };

export default async function PaginaAdminArtigos() {
  await exigirPapelDoPainel();
  const snapshot = await lerArtigos().orderBy("criadoEm", "desc").get();
  const artigos = snapshot.docs.map((documento) => documento.data());

  return (
    <div>
      <CabecalhoDoPainel
        titulo="Artigos Científicos"
        descricao="Gerencie os artigos publicados e rascunhos."
        acao={<Botao href="/admin/artigos/novo">Adicionar Novo Artigo</Botao>}
      />
      
      <TabelaPainel colunas={["Título", "Categoria", "Status", "Ações"]} vazia={artigos.length === 0} mensagemVazia="Nenhum artigo encontrado.">
        {artigos.map((artigo) => (
          <tr key={artigo.id} style={estiloLinha}>
            <td className={classeDaCelula} style={{ fontWeight: 500 }}>{artigo.titulo}</td>
            <td className={classeDaCelula} style={{ opacity: 0.8, textTransform: "capitalize" }}>{artigo.categoria.replace("-", " ")}</td>
            <td className={classeDaCelula}>
              <SeloStatus status={artigo.status} />
            </td>
            <td className={classeDaCelula}>
              <Link href={`/admin/artigos/editar/${artigo.id}`} style={{ fontSize: "14px", textDecoration: "underline", color: "var(--color-primary)" }}>
                Editar
              </Link>
            </td>
          </tr>
        ))}
      </TabelaPainel>
    </div>
  );
}
