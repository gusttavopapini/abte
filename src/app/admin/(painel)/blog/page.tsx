import type { Metadata } from "next";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { Botao } from "@/components/Botao/Botao";

export const metadata: Metadata = { title: "Blog | Painel" };

type PostBlog = {
  id: string;
  titulo: string;
  status: string;
  criadoEm?: { toDate?: () => Date };
};

export default async function PaginaAdminBlog() {
  const db = firestoreAdmin();
  const snapshot = await db.collection("posts").orderBy("criadoEm", "desc").get();
  
  const posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-32)" }}>
        <div>
          <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Blog</h1>
          <p className="tipo-texto">Gerencie os posts publicados e rascunhos.</p>
        </div>
        <Botao href="/admin/blog/novo">Adicionar Novo Post</Botao>
      </header>
      
      <div style={{ background: "var(--color-surface-soft)", padding: "var(--space-24)", borderRadius: "5px" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Título</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Status</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Data</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ paddingTop: "var(--space-24)", textAlign: "center", opacity: 0.7 }}>
                  Nenhum post encontrado.
                </td>
              </tr>
            ) : (
              posts.map((post: PostBlog) => (
                <tr key={post.id} style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 5%, transparent)" }}>
                  <td style={{ padding: "var(--space-16) 0", fontWeight: 500 }}>{post.titulo}</td>
                  <td style={{ padding: "var(--space-16) 0" }}>
                    <span style={{ 
                      display: "inline-block", 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      background: post.status === "publicado" ? "rgba(46, 204, 113, 0.2)" : "rgba(241, 196, 15, 0.2)",
                      color: post.status === "publicado" ? "#27ae60" : "#d35400"
                    }}>
                      {post.status}
                    </span>
                  </td>
                  <td style={{ padding: "var(--space-16) 0", opacity: 0.8 }}>
                    {post.criadoEm?.toDate ? post.criadoEm.toDate().toLocaleDateString("pt-BR") : "N/A"}
                  </td>
                  <td style={{ padding: "var(--space-16) 0" }}>
                    <span style={{ opacity: 0.5, fontSize: "14px" }}>Editar (em breve)</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
