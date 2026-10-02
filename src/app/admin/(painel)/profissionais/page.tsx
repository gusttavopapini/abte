import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { ProfissionaisAdminClient } from "./ProfissionaisAdminClient";

export const metadata: Metadata = { title: "Profissionais" };

export default async function PaginaAdminProfissionais() {
  await exigirPapelDoPainel();
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
