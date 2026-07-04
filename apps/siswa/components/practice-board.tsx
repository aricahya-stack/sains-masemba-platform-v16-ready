'use client';
import { useState } from 'react';
import { PageHero } from './page-hero';
import { useToast } from './toast-provider';
import { MathHtml } from './math-html';
import { ExplanationTools } from './explanation-tools';

type PracticeQuestion = {
  id: string;
  code: string;
  topic: string;
  html: string;
  explanation: string;
  options: { id: string; label: string; text: string; isCorrect: boolean }[];
};

export function PracticeBoard({ questions }: { questions: PracticeQuestion[] }) {
  const { notify } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <div className="stack">
      <PageHero
        eyebrow="Pembahasan latihan"
        title="Latihan topikal"
        description="Kerjakan latihan santai. Tombol pembahasan terbuka setelah jawaban dipilih."
      />
      {questions.map((question, index) => {
        const selected = answers[question.id];
        const correct = question.options.find((option) => option.isCorrect);
        const isCorrect = Boolean(selected && correct && selected === correct.id);
        return (
          <article className="card stack" key={question.id}>
            <div className="item-head">
              <div>
                <strong>{index + 1}. {question.code}</strong>
                <div className="muted">{question.topic}</div>
              </div>
              <button
                className="button-secondary"
                type="button"
                onClick={() => {
                  if (!selected) {
                    notify('Pilih jawaban dulu', 'Jawaban perlu dipilih sebelum pembahasan dibuka.');
                    return;
                  }
                  setRevealed((prev) => ({ ...prev, [question.id]: !prev[question.id] }));
                }}
              >
                {revealed[question.id] ? 'Tutup pembahasan' : 'Pembahasan'}
              </button>
            </div>
            <MathHtml html={question.html} />
            <div className="stack">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`button-secondary${selected === option.id ? ' active' : ''}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                  style={{ justifyContent: 'flex-start', minHeight: 52 }}
                >
                  <strong style={{ marginRight: 8 }}>{option.label}.</strong> <MathHtml html={option.text} />
                </button>
              ))}
            </div>
            {revealed[question.id] ? (
              <div className={`answer-status ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                <strong>{isCorrect ? 'Jawaban benar.' : 'Jawaban belum tepat.'}</strong>
                <span> Kunci: {correct?.label || '-'}</span>
                <ExplanationTools html={question.explanation || '<p>Belum ada pembahasan.</p>'} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
