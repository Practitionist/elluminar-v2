import { z } from "zod";
import type { ArtifactPlugin } from "./contracts";

export const UniverCellSchema = z.object({
  v: z.union([z.number(), z.string(), z.boolean(), z.null()]).optional(),
  f: z.string().optional(),
});

export const UniverWorkbookSchema = z.object({
  id: z.string(),
  sheets: z.record(
    z.string(),
    z.object({
      name: z.string(),
      cellData: z.record(
        z.string(),
        z.record(z.string(), UniverCellSchema)
      ),
    })
  ),
});

export type UniverWorkbookPayload = z.infer<typeof UniverWorkbookSchema>;

export interface SpreadsheetFormulaCellAst {
  sheetName: string;
  cellRef: string;
  classification: "DYNAMIC_FORMULA" | "HARDCODED_VALUE";
  rawFormula: string | null;
  functionsUsed: string[];
  referencedRanges: string[];
  literalValue: number | string | boolean | null;
}

export interface SpreadsheetAstSummary {
  totalPopulatedCells: number;
  dynamicFormulaCells: number;
  hardcodedNumericCells: number;
  dynamicFormulaRatioBps: number;
  cells: SpreadsheetFormulaCellAst[];
}

const FORMULA_FN_REGEX = /\b([A-Z][A-Z0-9_.]*)\s*\(/g;
const RANGE_REF_REGEX = /\b([A-Z]{1,3}[0-9]{1,6}(?::[A-Z]{1,3}[0-9]{1,6})?)\b/g;

function colIndexToLetter(colIdx: number): string {
  let n = colIdx;
  let result = "";
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/**
 * Extracts a structured Formula AST from a Univer spreadsheet payload,
 * distinguishing dynamic formulas (`=SUM(...)`, `=NPV(...)`) from hardcoded literals.
 */
export function extractSpreadsheetFormulaAst(
  workbook: UniverWorkbookPayload
): SpreadsheetAstSummary {
  const cells: SpreadsheetFormulaCellAst[] = [];
  let dynamicFormulaCells = 0;
  let hardcodedNumericCells = 0;

  for (const sheet of Object.values(workbook.sheets)) {
    for (const [rowKey, rowMap] of Object.entries(sheet.cellData)) {
      const rowNum = Number(rowKey) + 1;
      for (const [colKey, cell] of Object.entries(rowMap)) {
        const colLetter = colIndexToLetter(Number(colKey));
        const cellRef = `${colLetter}${rowNum}`;

        if (cell.f && cell.f.trim().startsWith("=")) {
          const formulaBody = cell.f.trim();
          const functionsUsed = Array.from(
            formulaBody.matchAll(FORMULA_FN_REGEX),
            (m) => m[1] ?? ""
          ).filter(Boolean);
          const referencedRanges = Array.from(
            formulaBody.matchAll(RANGE_REF_REGEX),
            (m) => m[1] ?? ""
          ).filter(Boolean);

          dynamicFormulaCells += 1;
          cells.push({
            sheetName: sheet.name,
            cellRef,
            classification: "DYNAMIC_FORMULA",
            rawFormula: formulaBody,
            functionsUsed,
            referencedRanges,
            literalValue: cell.v ?? null,
          });
        } else if (cell.v !== undefined && cell.v !== null && cell.v !== "") {
          if (typeof cell.v === "number") {
            hardcodedNumericCells += 1;
          }
          cells.push({
            sheetName: sheet.name,
            cellRef,
            classification: "HARDCODED_VALUE",
            rawFormula: null,
            functionsUsed: [],
            referencedRanges: [],
            literalValue: cell.v,
          });
        }
      }
    }
  }

  const totalPopulatedCells = cells.length;
  const dynamicFormulaRatioBps =
    totalPopulatedCells > 0
      ? Math.round((dynamicFormulaCells * 10000) / totalPopulatedCells)
      : 0;

  return {
    totalPopulatedCells,
    dynamicFormulaCells,
    hardcodedNumericCells,
    dynamicFormulaRatioBps,
    cells,
  };
}

export const UniverSpreadsheetPlugin: ArtifactPlugin<
  UniverWorkbookPayload,
  SpreadsheetAstSummary
> = {
  kind: "SPREADSHEET_GRID",
  validateRawPayload(raw: unknown): UniverWorkbookPayload {
    return UniverWorkbookSchema.parse(raw);
  },
  extractTopology(payload: UniverWorkbookPayload): SpreadsheetAstSummary {
    return extractSpreadsheetFormulaAst(payload);
  },
  summarizeForMultimodalPrompt(ast: SpreadsheetAstSummary): string {
    return `Univer Spreadsheet AST (${ast.totalPopulatedCells} populated cells, ${ast.dynamicFormulaCells} formulas [${(ast.dynamicFormulaRatioBps / 100).toFixed(2)}%], ${ast.hardcodedNumericCells} hardcoded numbers)`;
  },
};
