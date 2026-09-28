import { Suspense } from "react";
import { ProfissionaisClient } from "./ProfissionaisClient";

export const metadata = { title: "Profissionais | ABTE" };

export default function PaginaProfissionais() {
  return (
    <Suspense>
      <ProfissionaisClient />
    </Suspense>
  );
}
