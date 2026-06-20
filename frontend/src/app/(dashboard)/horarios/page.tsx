import { getComisionesCursables } from "@/lib/api";
import type { MateriaCursableOut } from "@/lib/types";
import { HorariosBuilder } from "@/features/horarios/HorariosBuilder";

// Carga ambos cuatrimestres en paralelo → el switch de cuatrimestre es instantáneo (client-side)
export default async function HorariosPage() {
  const [materias1, materias2] = await Promise.all([
    getComisionesCursables(1, 2025, 1).catch((): MateriaCursableOut[] => []),
    getComisionesCursables(1, 2025, 2).catch((): MateriaCursableOut[] => []),
  ]);

  return <HorariosBuilder materias1={materias1} materias2={materias2} />;
}
