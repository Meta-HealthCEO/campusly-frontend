import type { PaperMemo, MemoSection, BankQuestion } from '@/types';

interface PaperSection {
  title: string;
  questions: BankQuestion[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAnswerLines(count = 4): string {
  return Array.from({ length: count })
    .map(() => '<div class="answer-lines"></div>')
    .join('');
}

function renderQuestionHtml(
  globalNumber: number,
  q: BankQuestion,
): string {
  const marksLabel = `(${q.marks} mark${q.marks !== 1 ? 's' : ''})`;
  const isMcq = q.questionType === 'mcq' || q.type === 'mcq';
  const isEssay = q.questionType === 'essay' || q.type === 'essay';

  let bodyHtml = '';
  if (isMcq && q.options && q.options.length > 0) {
    bodyHtml = q.options
      .map(
        (opt) =>
          `<p class="mcq-option">${escapeHtml(opt.label)}. ${escapeHtml(opt.text)}</p>`,
      )
      .join('');
  } else if (isEssay) {
    bodyHtml = renderAnswerLines(8);
  } else {
    bodyHtml = renderAnswerLines(4);
  }

  return `
    <div class="question">
      <p>
        <span class="question-number">${globalNumber}.</span>
        <span class="marks">${marksLabel}</span>
        ${escapeHtml(q.questionText)}
      </p>
      ${bodyHtml}
    </div>
  `;
}

/**
 * Generates print-ready HTML for an exam paper.
 */
export function generatePaperHtml(sections: PaperSection[]): string {
  let globalNumber = 1;
  let totalMarks = 0;

  const sectionsHtml = sections
    .map((section) => {
      const sectionMarks = section.questions.reduce(
        (sum, q) => sum + q.marks,
        0,
      );
      totalMarks += sectionMarks;

      const questionsHtml = section.questions
        .map((q) => {
          const html = renderQuestionHtml(globalNumber, q);
          globalNumber += 1;
          return html;
        })
        .join('');

      return `
        <div class="section">
          <h2>${escapeHtml(section.title)} <span style="font-size:10pt;font-weight:normal;">[${sectionMarks} marks]</span></h2>
          ${questionsHtml}
        </div>
      `;
    })
    .join('');

  const totalHtml = `
    <div style="margin-top:24px;border-top:2px solid #000;padding-top:8px;">
      <p style="text-align:right;font-weight:bold;">TOTAL: ${totalMarks} marks</p>
    </div>
  `;

  return sectionsHtml + totalHtml;
}

function renderMemoSectionHtml(section: MemoSection): string {
  const answersHtml = section.answers
    .map((answer) => {
      const allocationItems = answer.markAllocation
        .map(
          (c) =>
            `<li>${escapeHtml(c.criterion)} <strong>(${c.marks} mark${c.marks !== 1 ? 's' : ''})</strong></li>`,
        )
        .join('');

      const allocationHtml =
        answer.markAllocation.length > 0
          ? `<ul class="mark-allocation">${allocationItems}</ul>`
          : '';

      const mistakesHtml =
        answer.commonMistakes.length > 0
          ? `<p class="common-mistakes"><em>Common mistakes: ${answer.commonMistakes.map(escapeHtml).join('; ')}</em></p>`
          : '';

      const alternativesHtml =
        answer.acceptableAlternatives.length > 0
          ? `<p><em>Also accept: ${answer.acceptableAlternatives.map(escapeHtml).join('; ')}</em></p>`
          : '';

      return `
        <div class="question">
          <p><span class="question-number">Q${answer.questionNumber}.</span></p>
          <div class="model-answer">
            <p>${escapeHtml(answer.expectedAnswer)}</p>
            ${allocationHtml}
          </div>
          ${mistakesHtml}
          ${alternativesHtml}
        </div>
      `;
    })
    .join('');

  return `
    <div class="section">
      <h2>${escapeHtml(section.sectionTitle)}</h2>
      ${answersHtml}
    </div>
  `;
}

/**
 * Generates print-ready HTML for a memo/marking guide.
 */
export function generateMemoHtml(memo: PaperMemo): string {
  const sectionsHtml = memo.sections.map(renderMemoSectionHtml).join('');

  const totalHtml = `
    <div style="margin-top:24px;border-top:2px solid #000;padding-top:8px;">
      <p style="text-align:right;font-weight:bold;">TOTAL: ${memo.totalMarks} marks</p>
    </div>
  `;

  return sectionsHtml + totalHtml;
}
