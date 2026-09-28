import { Suspense } from "react";
import { ProfissionaisClient } from "./ProfissionaisClient";

import { firestoreAdmin } from "@/lib/firebase/servidor";

export const metadata = { title: "Profissionais | ABTE" };
export const dynamic = "force-dynamic";

export default async function PaginaProfissionais() {
  const db = firestoreAdmin();
  const snapshot = await db.collection("profissionais")
    .where("status", "==", "publicado")
    .get();

  const profissionais = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      nome: data.nome || "",
      especialidade: data.especialidade || "",
      tag: data.tag || "Outros",
      linkedinUrl: data.linkedinUrl || "",
      imagemUrl: data.imagemUrl || "",
    };
  });

  return (
    <Suspense>
      <ProfissionaisClient profissionaisIniciais={profissionais} />
    </Suspense>
  );
}
