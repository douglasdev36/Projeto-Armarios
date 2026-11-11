import type { TurmaItem } from "@/lib/api";

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function detectCursoFromText(raw: string): string {
  const texto = normalizeText(raw);
  if (!texto) return "outros";
  if (texto.includes("admin") || /(?:^|[^a-z])adm/.test(texto)) return "administracao";
  if (texto.includes("eletro") || /(?:^|[^a-z])[123]?el\b/.test(texto)) return "eletromecanica";
  if (texto.includes("info") || /(?:^|[^a-z])[123]?inf/.test(texto)) return "informatica";
  return "outros";
}

export function getTurmaCursoKey(turma: TurmaItem): string {
  const detected = detectCursoFromText(`${turma.curso || ""} ${turma.nome || ""}`);
  if (detected !== "outros") return detected;
  const cursoLimpo = turma.curso?.trim();
  if (cursoLimpo && normalizeText(cursoLimpo) !== "ensino regular") {
    return normalizeText(cursoLimpo);
  }
  return "outros";
}

export function detectSerieInText(raw: string): "1" | "2" | "3" | null {
  const texto = normalizeText(raw);
  if (!texto) return null;

  // Remove anos letivos de 4 dígitos (ex: 2024, 2025, 2026) para não confundir
  const semAnoLetivo = texto.replace(/\b20\d{2}\b/g, " ");

  if (
    semAnoLetivo.includes("primeiro") ||
    /(?:^|[^0-9])1(?![0-9])/.test(semAnoLetivo) ||
    /(?:^|\s)1\d{2}(?:\s|$|-)/.test(semAnoLetivo) ||
    /\bi\b/.test(semAnoLetivo)
  ) {
    return "1";
  }

  if (
    semAnoLetivo.includes("segundo") ||
    /(?:^|[^0-9])2(?![0-9])/.test(semAnoLetivo) ||
    /(?:^|\s)2\d{2}(?:\s|$|-)/.test(semAnoLetivo) ||
    /\bii\b/.test(semAnoLetivo)
  ) {
    return "2";
  }

  if (
    semAnoLetivo.includes("terceiro") ||
    /(?:^|[^0-9])3(?![0-9])/.test(semAnoLetivo) ||
    /(?:^|\s)3\d{2}(?:\s|$|-)/.test(semAnoLetivo) ||
    /\biii\b/.test(semAnoLetivo)
  ) {
    return "3";
  }

  return null;
}

export function getTurmaSerieKey(turma: TurmaItem): "1" | "2" | "3" | "outra" {
  return detectSerieInText(turma.nome || "") || detectSerieInText(turma.serie || "") || "outra";
}

export function getCursoLabel(key: string): string {
  if (key === "administracao") return "Administração";
  if (key === "eletromecanica") return "Eletromecânica";
  if (key === "informatica") return "Informática";
  if (key === "outros") return "Outros";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

