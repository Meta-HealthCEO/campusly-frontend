// ============================================================
// Local block grading — offline fallback for interactive blocks
// ============================================================
//
// Mirrors the deterministic grading rules in
// campusly-backend/src/modules/ContentLibrary/service-attempts.ts so a
// student still gets instant feedback when the server attempt endpoint is
// unavailable (e.g. the resource isn't in the approved library). Server
// grading remains the source of truth for mastery tracking — this fallback
// never claims to persist anything.

export interface LocalGradeResult {
  /** `null` means "recorded but not auto-graded" (hotspot, code). */
  correct: boolean | null;
  score: number;
  maxScore: number;
}

const INFORMATIONAL_TYPES = new Set(['text', 'image', 'video', 'step_reveal']);
const UNGRADED_TYPES = new Set(['hotspot', 'code']);

function normalise(s: string): string {
  return s.trim().toLowerCase();
}

const OPTION_LABELS = 'ABCDEFGHIJKLMNOP';

function gradeQuiz(content: string, response: string, maxScore: number): LocalGradeResult {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;

    // Legacy seed format: { options: string[], correctIndex: number }
    if (Array.isArray(parsed.options) && typeof parsed.options[0] === 'string') {
      const correctIdx = typeof parsed.correctIndex === 'number' ? parsed.correctIndex : -1;
      const correctLabel = OPTION_LABELS[correctIdx] ?? '';
      const correct = correctLabel !== '' && normalise(response) === normalise(correctLabel);
      return { correct, score: correct ? maxScore : 0, maxScore };
    }

    const type = parsed.type as string | undefined;

    if (type === 'mcq') {
      const options = parsed.options as Array<{ label: string; isCorrect?: boolean }> | undefined;
      const correctOption = options?.find((o) => o.isCorrect);
      const correct = correctOption
        ? normalise(response) === normalise(correctOption.label)
        : false;
      return { correct, score: correct ? maxScore : 0, maxScore };
    }

    if (type === 'true_false' || type === 'short_answer') {
      const correctAnswer = parsed.correctAnswer as string | undefined;
      const correct = correctAnswer ? normalise(response) === normalise(correctAnswer) : false;
      return { correct, score: correct ? maxScore : 0, maxScore };
    }

    return { correct: false, score: 0, maxScore };
  } catch {
    return { correct: false, score: 0, maxScore };
  }
}

function gradeFillBlank(content: string, response: string, maxScore: number): LocalGradeResult {
  try {
    const parsed = JSON.parse(content) as {
      blanks?: string[];
      acceptAlternatives?: string[][];
    };
    const blanks = parsed.blanks ?? [];
    const alternatives = parsed.acceptAlternatives ?? [];

    let answers: string[];
    try {
      const responseArr = JSON.parse(response) as unknown;
      answers = (Array.isArray(responseArr) ? responseArr : [response]).map((s: unknown) =>
        normalise(String(s)),
      );
    } catch {
      answers = response.split(',').map(normalise);
    }

    let allCorrect = true;
    for (let i = 0; i < blanks.length; i++) {
      const expected = normalise(blanks[i] ?? '');
      const alts = (alternatives[i] ?? []).map(normalise);
      const given = answers[i] ?? '';
      if (given !== expected && !alts.includes(given)) {
        allCorrect = false;
        break;
      }
    }

    return { correct: allCorrect, score: allCorrect ? maxScore : 0, maxScore };
  } catch {
    return { correct: false, score: 0, maxScore };
  }
}

function gradeMatchColumns(content: string, response: string, maxScore: number): LocalGradeResult {
  try {
    const parsed = JSON.parse(content) as { correctPairs?: number[][] };
    const correctPairs = parsed.correctPairs ?? [];
    const responsePairs = JSON.parse(response) as number[][];

    if (correctPairs.length !== responsePairs.length) {
      return { correct: false, score: 0, maxScore };
    }

    const sortedCorrect = correctPairs.map((p) => p.join(',')).sort();
    const sortedResponse = responsePairs.map((p) => p.join(',')).sort();
    const correct = sortedCorrect.every((v, i) => v === sortedResponse[i]);

    return { correct, score: correct ? maxScore : 0, maxScore };
  } catch {
    return { correct: false, score: 0, maxScore };
  }
}

function gradeOrdering(content: string, response: string, maxScore: number): LocalGradeResult {
  try {
    const parsed = JSON.parse(content) as { correctOrder?: number[] };
    const correctOrder = parsed.correctOrder ?? [];
    const responseOrder = JSON.parse(response) as number[];
    const correct =
      correctOrder.length === responseOrder.length &&
      correctOrder.every((v, i) => v === responseOrder[i]);

    return { correct, score: correct ? maxScore : 0, maxScore };
  } catch {
    return { correct: false, score: 0, maxScore };
  }
}

/**
 * Grade a block response with the same deterministic rules the backend
 * applies. `points <= 0` defaults to 1, matching `block.points || 1`.
 */
export function gradeBlockLocally(
  type: string,
  content: string,
  response: string,
  points: number,
): LocalGradeResult {
  const maxScore = points > 0 ? points : 1;

  if (INFORMATIONAL_TYPES.has(type)) {
    return { correct: true, score: maxScore, maxScore };
  }
  if (UNGRADED_TYPES.has(type)) {
    return { correct: null, score: 0, maxScore };
  }

  switch (type) {
    case 'quiz':
      return gradeQuiz(content, response, maxScore);
    case 'fill_blank':
      return gradeFillBlank(content, response, maxScore);
    case 'match_columns':
    case 'drag_drop':
      return gradeMatchColumns(content, response, maxScore);
    case 'ordering':
      return gradeOrdering(content, response, maxScore);
    default:
      return { correct: false, score: 0, maxScore };
  }
}
