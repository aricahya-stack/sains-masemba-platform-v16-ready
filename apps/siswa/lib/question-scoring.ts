export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
export type ScoringMode = 'EXACT_MATCH' | 'PARTIAL_NO_PENALTY';

export type ScoringOption = {
  id: string;
  label: string;
  text?: string;
  optionText?: string;
  isCorrect: boolean;
};

type QuestionWithOptions<TOption extends { id: string }> = {
  questionType?: QuestionType | string;
  options: TOption[];
};

export type AnswerableQuestion = QuestionWithOptions<Pick<ScoringOption, 'id'>>;

export type ScoringQuestion = QuestionWithOptions<ScoringOption> & {
  scoringMode?: ScoringMode | string;
  maxScore?: number;
};

export type AnswerValue = string | string[] | number | boolean | unknown[] | Record<string, unknown> | null | undefined;

export function questionTypeLabel(type: string | undefined) {
  if (type === 'MULTIPLE_CHOICE') return 'Pilihan ganda kompleks';
  if (type === 'TRUE_FALSE') return 'Benar atau salah';
  return 'Pilihan ganda biasa';
}

export function scoringModeLabel(mode: string | undefined) {
  return mode === 'PARTIAL_NO_PENALTY' ? 'Parsial tanpa penalti' : 'Exact match';
}

export function optionText(option: ScoringOption) {
  return option.optionText || option.text || '';
}

function sameSet(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
}

export function normalizeSelectedIds(answer: AnswerValue) {
  if (!answer) return [] as string[];
  if (typeof answer === 'string') return answer ? [answer] : [];
  if (Array.isArray(answer)) return answer.filter(Boolean).map(String);
  return [] as string[];
}

export function normalizeTrueFalseAnswers(answer: AnswerValue) {
  const result: Record<string, boolean> = {};
  if (!answer || Array.isArray(answer) || typeof answer !== 'object') return result;
  for (const [key, value] of Object.entries(answer as Record<string, unknown>)) {
    if (typeof value === 'boolean') result[key] = value;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['true', 'benar', 'b', '1', 'ya'].includes(normalized)) result[key] = true;
      if (['false', 'salah', 's', '0', 'tidak'].includes(normalized)) result[key] = false;
    }
  }
  return result;
}

export function isAnswered(question: AnswerableQuestion, answer: AnswerValue) {
  const type = question.questionType || 'SINGLE_CHOICE';
  if (type === 'TRUE_FALSE') {
    const map = normalizeTrueFalseAnswers(answer);
    return question.options.length > 0 && question.options.every((option) => Object.prototype.hasOwnProperty.call(map, option.id));
  }
  return normalizeSelectedIds(answer).length > 0;
}

export function scoreQuestionAnswer(question: ScoringQuestion, answer: AnswerValue) {
  const type = question.questionType || 'SINGLE_CHOICE';
  const mode = question.scoringMode || 'EXACT_MATCH';
  const maxScore = Number.isFinite(Number(question.maxScore)) ? Number(question.maxScore) : 1;
  const options = question.options || [];
  let ratio = 0;

  if (!options.length) {
    return { ratio: 0, score: 0, maxScore, isCorrect: false };
  }

  if (type === 'TRUE_FALSE') {
    const answerMap = normalizeTrueFalseAnswers(answer);
    const correctCount = options.filter((option) => Object.prototype.hasOwnProperty.call(answerMap, option.id) && answerMap[option.id] === option.isCorrect).length;
    if (mode === 'EXACT_MATCH') {
      ratio = options.every((option) => Object.prototype.hasOwnProperty.call(answerMap, option.id) && answerMap[option.id] === option.isCorrect) ? 1 : 0;
    } else {
      ratio = correctCount / options.length;
    }
    return { ratio, score: ratio * maxScore, maxScore, isCorrect: ratio >= 1 };
  }

  const selectedIds = new Set(normalizeSelectedIds(answer));
  const correctIds = new Set(options.filter((option) => option.isCorrect).map((option) => option.id));

  if (type === 'MULTIPLE_CHOICE') {
    if (mode === 'EXACT_MATCH') {
      ratio = sameSet(selectedIds, correctIds) ? 1 : 0;
    } else {
      const selectedCorrect = Array.from(selectedIds).filter((id) => correctIds.has(id)).length;
      ratio = correctIds.size ? selectedCorrect / correctIds.size : 0;
    }
  } else {
    ratio = selectedIds.size === 1 && correctIds.has(Array.from(selectedIds)[0]) ? 1 : 0;
  }

  return { ratio, score: ratio * maxScore, maxScore, isCorrect: ratio >= 1 };
}

export function formatCorrectAnswer(question: ScoringQuestion) {
  const type = question.questionType || 'SINGLE_CHOICE';
  if (type === 'TRUE_FALSE') {
    return question.options.map((option, index) => `${index + 1}. ${option.isCorrect ? 'Benar' : 'Salah'}`).join('; ');
  }
  return question.options.filter((option) => option.isCorrect).map((option) => option.label).join(', ') || '-';
}

export function formatStudentAnswer(question: ScoringQuestion, answer: AnswerValue) {
  const type = question.questionType || 'SINGLE_CHOICE';
  if (type === 'TRUE_FALSE') {
    const answerMap = normalizeTrueFalseAnswers(answer);
    return question.options.map((option, index) => {
      if (!Object.prototype.hasOwnProperty.call(answerMap, option.id)) return `${index + 1}. -`;
      return `${index + 1}. ${answerMap[option.id] ? 'Benar' : 'Salah'}`;
    }).join('; ');
  }
  const selected = new Set(normalizeSelectedIds(answer));
  return question.options.filter((option) => selected.has(option.id)).map((option) => option.label).join(', ') || '-';
}
