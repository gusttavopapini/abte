import { Suspense } from "react";
import { lerProfissionais } from "@/lib/dados/colecoes";
import { ProfissionaisClient } from "./ProfissionaisClient";

export const metadata = { title: "Profissionais" };
export const dynamic = "force-dynamic";

export default async function PaginaProfissionais() {
  const snapshot = await lerProfissionais().where("status", "==", "publicado").get();

  const profissionais = snapshot.docs.map((documento) => {
    const profissional = documento.data();
    return {
      nome: profissional.nome,
      especialidade: profissional.especialidade,
      tag: profissional.tag || "Outros",
      linkedinUrl: profissional.linkedinUrl,
      imagemUrl: profissional.imagemUrl,
    };
  });

  return (
    <Suspense>
      <ProfissionaisClient profissionaisIniciais={profissionais} />
    </Suspense>
  );
}
