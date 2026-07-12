'use client';
import { useState } from 'react';
import { PageHero } from './page-hero';
import { useToast } from './toast-provider';
import { MathHtml } from './math-html';
import { ExplanationTools } from './explanation-tools';
import {
  type AnswerValue,
  formatCorrectAnswer,
  isAnswered,
  normalizeSelectedIds,
  normalizeTrueFalseAnswers,
  questionTypeLabel,
  scoreQuestionAnswer,
  scoringModeLabel,
} from '../lib/question-scoring';

type PracticeQuestion = {
  id: string;
  code: string;
  topic: string;
  html: string;
  explanation: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  scoringMode: 'EXACT_MATCH' | 'PARTIAL_NO_PENALTY';
  maxScore: number;
  options: { id: string; label: string; text: string; isCorrect: boolean }[];
};

export function PracticeBoard({ questions }: { questions: PracticeQuestion[] }) {
  const { notify } = useToast();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function setSingleAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function toggleMultipleAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const selected = new Set(normalizeSelectedIds(prev[questionId]));
      if (selected.has(optionId)) selected.delete(optionId);
      else selected.add(optionId);
      return { ...prev, [questionId]: Array.from(selected) };
    });
  }

  function setTrueFalseAnswer(questionId: string, optionId: string, value: boolean) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...normalizeTrueFalseAnswers(prev[questionId]),
        [optionId]: value,
      },
    }));
  }

  return (
    <div className="stack">
      <PageHero
        eyebrow="Pembahasan latihan"
        title="Latihan topikal"
        description="Tersedia contoh pilihan ganda biasa, pilihan ganda kompleks, serta benar atau salah. Pembahasan terbuka setelah jawaban diisi."
      />
      {questions.map((question, index) => {
        const selected = answers[question.id];
        const score = scoreQuestionAnswer(question, selected);
        const answered = isAnswered(question, selected);
        const selectedIds = new Set(normalizeSelectedIds(selected));
        const trueFalseMap = normalizeTrueFalseAnswers(selected);
        return (
          <article className="card stack" key={question.id}>
            <div className="item-head">
              <div>
                <strong>{index + 1}. {question.code}</strong>
                <div className="muted">{question.topic}</div>
                <div className="inline-group" style={{ marginTop: 8 }}>
                  <span className="badge">{questionTypeLabel(question.questionType)}</span>
                  <span className="badge">{scoringModeLabel(question.scoringMode)}</span>
                </div>
              </div>
              <button
                className="button-secondary"
                type="button"
                onClick={() => {
                  if (!answered) {
                    notify('Lengkapi jawaban dulu', 'Jawaban perlu diisi sebelum pembahasan dibuka.');
                    return;
                  }
                  setRevealed((prev) => ({ ...prev, [question.id]: !prev[question.id] }));
                }}
              >
                {revealed[question.id] ? 'Tutup pembahasan' : 'Pembahasan'}
              </button>
            </div>
            <MathHtml html={question.html} />

            {question.questionType === 'TRUE_FALSE' ? (
              <div className="tf-list">
                {question.options.map((option, optionIndex) => (
                  <div className="tf-row" key={option.id}>
                    <div className="tf-statement practice-option-text"><span className="practice-option-label">{optionIndex + 1}.</span> <MathHtml html={option.text} /></div>
                    <div className="tf-actions">
                      <button
                        type="button"
                        className={`button-secondary${trueFalseMap[option.id] === true ? ' active' : ''}`}
                        onClick={() => setTrueFalseAnswer(question.id, option.id, true)}
                      >
                        Benar
                      </button>
                      <button
                        type="button"
                        className={`button-secondary${trueFalseMap[option.id] === false ? ' active' : ''}`}
                        onClick={() => setTrueFalseAnswer(question.id, option.id, false)}
                      >
                        Salah
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : question.questionType === 'MULTIPLE_CHOICE' ? (
              <div className="stack">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`button-secondary practice-answer-option${selectedIds.has(option.id) ? ' active' : ''}`}
                    onClick={() => toggleMultipleAnswer(question.id, option.id)}
                  >
                    <span className="checkbox-mark" aria-hidden="true">{selectedIds.has(option.id) ? '☑' : '☐'}</span>
                    <span className="practice-option-label">{option.label}.</span>
                    <MathHtml html={option.text} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="stack">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`button-secondary practice-answer-option${selectedIds.has(option.id) ? ' active' : ''}`}
                    onClick={() => setSingleAnswer(question.id, option.id)}
                  >
                    <span className="practice-option-label">{option.label}.</span>
                    <MathHtml html={option.text} />
                  </button>
                ))}
              </div>
            )}

            {revealed[question.id] ? (
              <div className={`answer-status ${score.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                <strong>{score.isCorrect ? 'Jawaban benar.' : 'Jawaban belum tepat.'}</strong>
                <span> Skor soal: {score.score.toFixed(2)} dari {score.maxScore.toFixed(2)}. Kunci: {formatCorrectAnswer(question)}</span>
                <ExplanationTools html={question.explanation || '<p>Belum ada pembahasan.</p>'} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
