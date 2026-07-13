"use client";

import type { AdminQuestion, AdminQuizQuestionBankImportQuestionPayload } from "@/features/admin/api/master-api";

const QUESTION_BANK_SHEET_NAME = "bank_soal";
const GUIDE_SHEET_NAME = "petunjuk";
const MIN_CHOICE_COLUMNS = 4;
const ANSWER_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const TRUE_VALUES = new Set(["1", "true", "yes", "y", "ya", "aktif", "benar"]);
const FALSE_VALUES = new Set(["0", "false", "no", "n", "tidak", "nonaktif", "salah"]);

type QuestionType = AdminQuizQuestionBankImportQuestionPayload["type"];

interface QuestionBankFilePayload {
  blob: Blob;
  fileName: string;
}

interface ChoiceColumn {
  choiceNumber: number;
  index: number;
}

interface LegacyCorrectColumn {
  choiceNumber: number;
  index: number;
}

function choiceHeader(choiceNumber: number): string {
  return `choice_${choiceNumber}`;
}

function slugifyFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeCellString(value).toLowerCase();
}

function buildQuestionName(questionText: string, index: number): string {
  const compact = questionText.replace(/\s+/g, " ").trim();
  if (!compact) return `Question ${index + 1}`;
  return compact.length <= 60 ? compact : `${compact.slice(0, 57)}...`;
}

function parseBooleanCell(value: unknown, fallbackValue: boolean): boolean {
  if (value === null || value === undefined || value === "") {
    return fallbackValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = normalizeCellString(value).toLowerCase();
  if (normalized === "") return fallbackValue;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  throw new Error(`Nilai boolean tidak valid: "${normalizeCellString(value)}"`);
}

function parseQuestionType(value: unknown): QuestionType {
  const normalized = normalizeCellString(value).toLowerCase();

  if (["multiple_choice", "multiple choice", "mcq"].includes(normalized)) {
    return "multiple_choice";
  }

  if (["true_false", "true false", "true/false", "boolean"].includes(normalized)) {
    return "true_false";
  }

  throw new Error(`Tipe question tidak valid: "${normalizeCellString(value)}"`);
}

function buildChoiceColumns(choiceCount: number): string[] {
  return Array.from({ length: choiceCount }, (_, index) => choiceHeader(index + 1));
}

function extractChoiceColumns(headers: string[]): ChoiceColumn[] {
  return headers
    .map((header, index) => {
      const directMatch = header.match(/^choice_(\d+)$/);
      if (directMatch) {
        return {
          choiceNumber: Number(directMatch[1]),
          index,
        };
      }

      const legacyMatch = header.match(/^option_(\d+)_text$/);
      if (legacyMatch) {
        return {
          choiceNumber: Number(legacyMatch[1]),
          index,
        };
      }

      return null;
    })
    .filter((column): column is ChoiceColumn => column !== null)
    .sort((left, right) => left.choiceNumber - right.choiceNumber);
}

function extractLegacyCorrectColumns(headers: string[]): LegacyCorrectColumn[] {
  return headers
    .map((header, index) => {
      const match = header.match(/^option_(\d+)_is_correct$/);
      if (!match) return null;

      return {
        choiceNumber: Number(match[1]),
        index,
      };
    })
    .filter((column): column is LegacyCorrectColumn => column !== null)
    .sort((left, right) => left.choiceNumber - right.choiceNumber);
}

function getChoiceLabel(choiceIndex: number): string {
  return ANSWER_LABELS[choiceIndex] ?? String(choiceIndex + 1);
}

function parseCorrectAnswerCell(
  rawValue: unknown,
  options: { option_text: string; is_correct: boolean }[],
  rowNumber: number,
): { option_text: string; is_correct: boolean }[] {
  const normalizedValue = normalizeCellString(rawValue);
  if (!normalizedValue) {
    throw new Error(`Baris ${rowNumber}: correct_answer wajib diisi.`);
  }

  const normalizedUpper = normalizedValue.toUpperCase();
  let selectedIndex = -1;

  if (normalizedUpper.length === 1) {
    const labelIndex = ANSWER_LABELS.indexOf(normalizedUpper);
    if (labelIndex >= 0) {
      selectedIndex = labelIndex;
    }
  }

  if (selectedIndex < 0 && /^\d+$/.test(normalizedValue)) {
    selectedIndex = Number(normalizedValue) - 1;
  }

  if (selectedIndex < 0) {
    selectedIndex = options.findIndex(
      (option) => option.option_text.trim().toLowerCase() === normalizedValue.toLowerCase(),
    );
  }

  if (selectedIndex < 0 || selectedIndex >= options.length) {
    throw new Error(`Baris ${rowNumber}: correct_answer harus berisi A/B/C..., nomor pilihan, atau teks pilihan yang sesuai.`);
  }

  return options.map((option, index) => ({
    ...option,
    is_correct: index === selectedIndex,
  }));
}

function applyLegacyCorrectColumns(
  rawRow: unknown[],
  options: { choiceNumber: number; option_text: string; is_correct: boolean }[],
  legacyCorrectColumns: LegacyCorrectColumn[],
  rowNumber: number,
): { option_text: string; is_correct: boolean }[] {
  const correctIndexMap = new Map(legacyCorrectColumns.map((column) => [column.choiceNumber, column.index]));
  const resolvedOptions = options.map((option) => {
    const columnIndex = correctIndexMap.get(option.choiceNumber);

    if (columnIndex === undefined) {
      return {
        option_text: option.option_text,
        is_correct: false,
      };
    }

    let isCorrect = false;
    try {
      isCorrect = parseBooleanCell(rawRow[columnIndex], false);
    } catch {
      throw new Error(`Baris ${rowNumber}: option_${option.choiceNumber}_is_correct harus 1 atau 0.`);
    }

    return {
      option_text: option.option_text,
      is_correct: isCorrect,
    };
  });

  const correctCount = resolvedOptions.filter((option) => option.is_correct).length;
  if (correctCount !== 1) {
    throw new Error(`Baris ${rowNumber}: harus ada tepat 1 jawaban benar.`);
  }

  return resolvedOptions;
}

function validateTrueFalseOptions(rowNumber: number, optionTexts: string[]): void {
  if (optionTexts.length !== 2) {
    throw new Error(`Baris ${rowNumber}: question true_false harus punya tepat 2 opsi.`);
  }

  const normalizedOptions = optionTexts
    .map((optionText) => optionText.trim().toLowerCase())
    .sort();

  const isEnglishPair = normalizedOptions[0] === "false" && normalizedOptions[1] === "true";
  const isIndonesianPair = normalizedOptions[0] === "benar" && normalizedOptions[1] === "salah";

  if (!isEnglishPair && !isIndonesianPair) {
    throw new Error(`Baris ${rowNumber}: opsi true_false harus bernilai True/False atau Benar/Salah.`);
  }
}

async function createWorkbook(
  rows: Record<string, string | number>[],
  fileName: string,
): Promise<QuestionBankFilePayload> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const bankSheet = XLSX.utils.json_to_sheet(rows, {
    header: Object.keys(rows[0] ?? {}),
  });
  bankSheet["!cols"] = Object.keys(rows[0] ?? {}).map((header) => ({
    wch: header.includes("question") ? 32 : header === "correct_answer" ? 18 : 24,
  }));
  XLSX.utils.book_append_sheet(workbook, bankSheet, QUESTION_BANK_SHEET_NAME);

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["kolom", "keterangan", "contoh"],
    ["question_name", "Nama singkat question, opsional", "Penjumlahan Dasar"],
    ["question_text", "Teks pertanyaan", "2 + 2 = ?"],
    ["question_type", "Isi dengan multiple_choice atau true_false", "multiple_choice"],
    ["choice_1", "Pilihan jawaban pertama", "4"],
    ["choice_2", "Pilihan jawaban kedua", "5"],
    ["choice_3", "Pilihan jawaban ketiga, opsional", "6"],
    ["choice_4", "Pilihan jawaban keempat, opsional", "7"],
    ["correct_answer", "Isi A/B/C/D..., nomor pilihan, atau teks pilihan yang benar", "A"],
  ]);
  guideSheet["!cols"] = [{ wch: 24 }, { wch: 56 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, guideSheet, GUIDE_SHEET_NAME);

  const workbookBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return {
    blob: new Blob([workbookBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName,
  };
}

export async function createQuizQuestionBankTemplateExcelFile(): Promise<QuestionBankFilePayload> {
  const rows = [
    {
      question_name: "Penjumlahan Dasar",
      question_text: "2 + 2 = ?",
      question_type: "multiple_choice",
      choice_1: "4",
      choice_2: "5",
      choice_3: "6",
      choice_4: "7",
      correct_answer: "A",
    },
    {
      question_name: "Laravel Benar Salah",
      question_text: "Laravel adalah framework PHP.",
      question_type: "true_false",
      choice_1: "True",
      choice_2: "False",
      choice_3: "",
      choice_4: "",
      correct_answer: "A",
    },
  ];

  return createWorkbook(rows, "template-bank-soal.xlsx");
}

export async function createQuizQuestionBankExportExcelFile(
  quizTitle: string,
  questions: AdminQuestion[],
): Promise<QuestionBankFilePayload> {
  const choiceCount = Math.max(
    MIN_CHOICE_COLUMNS,
    ...questions.map((question) => Math.max(question.options.length, 2)),
  );
  const headers = ["question_name", "question_text", "question_type", ...buildChoiceColumns(choiceCount), "correct_answer"];

  const rows = questions.map((question, index) => {
    const row = Object.fromEntries(headers.map((header) => [header, ""])) as Record<string, string | number>;
    const orderedOptions = [...question.options].sort((left, right) => left.id - right.id);
    const correctIndex = orderedOptions.findIndex((option) => option.is_correct);

    row.question_name = buildQuestionName(question.question_text, index);
    row.question_text = question.question_text;
    row.question_type = question.type === "true_false" ? "true_false" : "multiple_choice";
    row.correct_answer = correctIndex >= 0 ? getChoiceLabel(correctIndex) : "";

    orderedOptions.forEach((option, optionIndex) => {
      row[choiceHeader(optionIndex + 1)] = option.option_text;
    });

    return row;
  });

  if (rows.length === 0) {
    rows.push(
      Object.fromEntries(headers.map((header) => [header, ""])) as Record<string, string | number>,
    );
  }

  const baseFileName = slugifyFileName(quizTitle) || "quiz";
  return createWorkbook(rows, `bank-soal-${baseFileName}.xlsx`);
}

export async function parseQuizQuestionBankExcelFile(
  file: File,
): Promise<AdminQuizQuestionBankImportQuestionPayload[]> {
  const XLSX = await import("xlsx");
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetName =
    workbook.SheetNames.find((name) => name.trim().toLowerCase() === QUESTION_BANK_SHEET_NAME) ??
    workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("File Excel tidak memiliki sheet bank soal.");
  }

  const sheet = workbook.Sheets[sheetName];
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (sheetRows.length < 2) {
    throw new Error("File Excel bank soal kosong.");
  }

  const [headerRow, ...dataRows] = sheetRows;
  if (!Array.isArray(headerRow)) {
    throw new Error("Header file Excel tidak valid.");
  }

  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const questionTextIndex = headers.indexOf("question_text");
  const questionTypeIndex = headers.indexOf("question_type");
  const correctAnswerIndex = headers.indexOf("correct_answer");
  const choiceColumns = extractChoiceColumns(headers);
  const legacyCorrectColumns = extractLegacyCorrectColumns(headers);

  if (questionTextIndex === -1 || questionTypeIndex === -1 || choiceColumns.length < 2) {
    throw new Error("Header file Excel tidak sesuai template bank soal.");
  }

  if (correctAnswerIndex === -1 && legacyCorrectColumns.length === 0) {
    throw new Error("Header file Excel harus memiliki kolom correct_answer.");
  }

  const questions = dataRows.reduce<AdminQuizQuestionBankImportQuestionPayload[]>((result, row, rowIndex) => {
    if (!Array.isArray(row)) return result;

    const questionText = normalizeCellString(row[questionTextIndex]);
    const questionTypeRaw = row[questionTypeIndex];
    const choiceTexts = choiceColumns
      .map((column) => normalizeCellString(row[column.index]))
      .filter((value) => value !== "");

    const hasAnyContent =
      questionText !== "" ||
      normalizeCellString(questionTypeRaw) !== "" ||
      choiceTexts.length > 0;

    if (!hasAnyContent) {
      return result;
    }

    const rowNumber = rowIndex + 2;
    if (questionText === "") {
      throw new Error(`Baris ${rowNumber}: question_text wajib diisi.`);
    }

    const type = parseQuestionType(questionTypeRaw);
    const rawOptions = choiceColumns.reduce<{ choiceNumber: number; option_text: string; is_correct: boolean }[]>(
      (items, column) => {
        const optionText = normalizeCellString(row[column.index]);
        if (optionText === "") {
          return items;
        }

        items.push({
          choiceNumber: column.choiceNumber,
          option_text: optionText,
          is_correct: false,
        });

        return items;
      },
      [],
    );

    if (rawOptions.length < 2) {
      throw new Error(`Baris ${rowNumber}: minimal harus ada 2 opsi.`);
    }

    const options =
      correctAnswerIndex !== -1 && normalizeCellString(row[correctAnswerIndex]) !== ""
        ? parseCorrectAnswerCell(row[correctAnswerIndex], rawOptions, rowNumber)
        : applyLegacyCorrectColumns(row, rawOptions, legacyCorrectColumns, rowNumber);

    if (type === "true_false") {
      validateTrueFalseOptions(
        rowNumber,
        options.map((option) => option.option_text),
      );
    }

    result.push({
      question_text: questionText,
      type,
      is_active: true,
      options,
    });

    return result;
  }, []);

  if (questions.length === 0) {
    throw new Error("File Excel tidak berisi question yang dapat diimpor.");
  }

  return questions;
}
