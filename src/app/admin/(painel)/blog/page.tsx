import type { Metadata } from "next";
import Link from "next/link";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPosts } from "@/lib/dados/colecoes";
import { Botao } from "@/components/Botao/Botao";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { TabelaPainel, estiloCelula, estiloLinha } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";

export const metadata: Metadata = { title: "Blog" };

export default async function PaginaAdminBlog() {
  await exigirPapelDoPainel();
  const snapshot = await lerPosts().orderBy("criadoEm", "desc").get();
  const posts = snapshot.docs.map((documento) => documento.data());

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-32)" }}>
        <div>
          <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Blog</h1>
          <p className="tipo-texto">Gerencie os posts publicados e rascunhos.</p>
        </div>
        <Botao href="/admin/blog/novo">Adicionar Novo Post</Botao>
      </header>
      
      <TabelaPainel colunas={["Título", "Status", "Data", "Ações"]} vazia={posts.length === 0} mensagemVazia="Nenhum post encontrado.">
        {posts.map((post) => (
          <tr key={post.id} style={estiloLinha}>
            <td style={{ ...estiloCelula, fontWeight: 500 }}>{post.titulo}</td>
            <td style={estiloCelula}>
              <SeloStatus status={post.status} />
            </td>
            <td style={{ ...estiloCelula, opacity: 0.8 }}>
              {post.criadoEm ? post.criadoEm.toLocaleDateString("pt-BR") : "N/A"}
            </td>
            <td style={estiloCelula}>
              <Link href={`/admin/blog/editar/${post.id}`} style={{ fontSize: "14px", textDecoration: "underline", color: "var(--color-primary)" }}>
                Editar
              </Link>
            </td>
          </tr>
        ))}
      </TabelaPainel>
    </div>
  );
}
