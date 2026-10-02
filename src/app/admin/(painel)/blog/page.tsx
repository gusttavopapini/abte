import type { Metadata } from "next";
import Link from "next/link";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPosts } from "@/lib/dados/colecoes";
import { Botao } from "@/components/Botao/Botao";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { TabelaPainel, classeDaCelula, estiloLinha } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";

export const metadata: Metadata = { title: "Blog" };

export default async function PaginaAdminBlog() {
  await exigirPapelDoPainel();
  const snapshot = await lerPosts().orderBy("criadoEm", "desc").get();
  const posts = snapshot.docs.map((documento) => documento.data());

  return (
    <div>
      <CabecalhoDoPainel
        titulo="Blog"
        descricao="Gerencie os posts publicados e rascunhos."
        acao={<Botao href="/admin/blog/novo">Adicionar Novo Post</Botao>}
      />
      
      <TabelaPainel colunas={["Título", "Status", "Data", "Ações"]} vazia={posts.length === 0} mensagemVazia="Nenhum post encontrado.">
        {posts.map((post) => (
          <tr key={post.id} style={estiloLinha}>
            <td className={classeDaCelula} style={{ fontWeight: 500 }}>{post.titulo}</td>
            <td className={classeDaCelula}>
              <SeloStatus status={post.status} />
            </td>
            <td className={classeDaCelula} style={{ opacity: 0.8 }}>
              {post.criadoEm ? post.criadoEm.toLocaleDateString("pt-BR") : "N/A"}
            </td>
            <td className={classeDaCelula}>
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
