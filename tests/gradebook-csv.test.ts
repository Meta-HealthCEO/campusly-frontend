import { describe, expect, it } from 'vitest';
import { marksCsv } from '../src/lib/gradebook-csv';

describe('marksCsv', () => {
  it('lists each learner with mark, total and percentage', () => {
    const csv = marksCsv({
      classLabel: 'Grade 1 - A', assessmentName: 'Term 3 test', totalMarks: 10,
      entries: [{ firstName: 'Lebo', lastName: 'Mthembu', admissionNumber: 'GFP-1', mark: '7' }, { firstName: 'Jan', lastName: 'Botha', admissionNumber: 'GFP-3', mark: '' }],
    });
    expect(csv.split('\n')).toEqual([
      'Class: Grade 1 - A', 'Assessment: Term 3 test', '',
      'Student Name,Admission Number,Mark,Total,Percentage',
      'Mthembu Lebo,GFP-1,7,10,70%',
      'Botha Jan,GFP-3,,10,',
    ]);
  });

  it('quotes cells that contain commas or quotes', () => {
    const csv = marksCsv({
      classLabel: 'A', assessmentName: 'Test, "final"', totalMarks: 10,
      entries: [{ firstName: 'Anne-Marie', lastName: 'du Toit, Jr', admissionNumber: 'X', mark: '5' }],
    });
    expect(csv.split('\n')[1]).toBe('"Assessment: Test, ""final"""');
    expect(csv.split('\n')[4]).toBe('"du Toit, Jr Anne-Marie",X,5,10,50%');
  });
});
