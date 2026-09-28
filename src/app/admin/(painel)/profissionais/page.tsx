import type { Metadata } from "next";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { ProfissionaisAdminClient } from "./ProfissionaisAdminClient";

export const metadata: Metadata = { title: "Profissionais | Painel" };

export default async function PaginaAdminProfissionais() {
  const db = firestoreAdmin();
  const snapshot = await db.collection("profissionais").orderBy("criadoEm", "desc").get();
  
  const profissionais = snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
    criadoEm: undefined, // Remover ou mapear o Timestamp pra serializar
    atualizadoEm: undefined,
  }));

  return <ProfissionaisAdminClient profissionaisIniciais={profissionais} />;
}
