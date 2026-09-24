export interface CsvMarkEntry {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  mark: string;
}

const cell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** A class's marks for one assessment as CSV (quoted where needed). */
export function marksCsv(input: { classLabel: string; assessmentName: string; totalMarks: number; entries: CsvMarkEntry[] }): string {
  const rows: Array<Array<string | number>> = [
    [`Class: ${input.classLabel}`],
    [`Assessment: ${input.assessmentName}`],
    [],
    ['Student Name', 'Admission Number', 'Mark', 'Total', 'Percentage'],
    ...input.entries.map((e: CsvMarkEntry) => {
      const pct = e.mark && input.totalMarks > 0 ? `${Math.round((Number(e.mark) / input.totalMarks) * 100)}%` : '';
      return [`${e.lastName} ${e.firstName}`, e.admissionNumber, e.mark, input.totalMarks, pct];
    }),
  ];
  return rows.map((row) => row.map(cell).join(',')).join('\n');
}
