/**
 * Asigna un ícono de Material Symbols a una materia según su nombre.
 * El primer patrón que matchea gana, así que el orden importa
 * (reglas más específicas primero).
 */

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const ICON_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/red(es)? de datos|redes/, "lan"],
  [/simulaci/, "monitoring"],
  [/investigacion operativa/, "analytics"],
  [/administracion de sistemas|sistemas de informacion/, "desktop_windows"],
  [/legislaci|derecho|legal/, "balance"],
  [/analisis matem|calculo|matematic/, "functions"],
  [/algebra|geometria/, "calculate"],
  [/fisica/, "bolt"],
  [/quimica/, "science"],
  [/base de datos|datos/, "database"],
  [/ingles/, "translate"],
  [/econom|contabil|costos/, "payments"],
  [/ingenieria y sociedad|sociedad/, "groups"],
  [/comunicaci/, "forum"],
  [/arquitectura|sistemas operativos|hardware/, "memory"],
  [/calidad de software|ingenieria de software|ingenieria y calidad|proyecto final|gestion (de|gerencial) de proyecto/, "deployed_code"],
  [/seguridad/, "security"],
  [/inteligencia artificial|redes neuronales/, "neurology"],
  [/estadistica|probabilidad/, "bar_chart"],
  [/entornos graficos|grafic|visual/, "draw"],
  [/programaci|algoritmo|paradigma|java|lenguaje/, "code"],
  [/practica profesional|seminario|pasant/, "work"],
  [/automatizaci/, "precision_manufacturing"],
  [/soporte/, "support_agent"],
  [/metodologia/, "biotech"],
  [/infraestructura/, "dns"],
];

export function materiaIcon(nombre: string): string {
  const n = norm(nombre);
  for (const [re, icon] of ICON_RULES) {
    if (re.test(n)) return icon;
  }
  return "menu_book";
}
