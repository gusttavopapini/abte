import type { Metadata } from "next";
import Link from "next/link";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerArtigos } from "@/lib/dados/colecoes";
import { Botao } from "@/components/Botao/Botao";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { TabelaPainel, estiloCelula, estiloLinha } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";

export const metadata: Metadata = { title: "Artigos" };

export default async function PaginaAdminArtigos() {
  await exigirPapelDoPainel();
  const snapshot = await lerArtigos().orderBy("criadoEm", "desc").get();
  const artigos = snapshot.docs.map((documento) => documento.data());

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-32)" }}>
        <div>
          <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Artigos Científicos</h1>
          <p className="tipo-texto">Gerencie os artigos publicados e rascunhos.</p>
        </div>
        <Botao href="/admin/artigos/novo">Adicionar Novo Artigo</Botao>
      </header>
      
      <TabelaPainel colunas={["Título", "Categoria", "Status", "Ações"]} vazia={artigos.length === 0} mensagemVazia="Nenhum artigo encontrado.">
        {artigos.map((artigo) => (
          <tr key={artigo.id} style={estiloLinha}>
            <td style={{ ...estiloCelula, fontWeight: 500 }}>{artigo.titulo}</td>
            <td style={{ ...estiloCelula, opacity: 0.8, textTransform: "capitalize" }}>{artigo.categoria.replace("-", " ")}</td>
            <td style={estiloCelula}>
              <SeloStatus status={artigo.status} />
            </td>
            <td style={estiloCelula}>
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
