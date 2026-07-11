'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { MathHtml } from './math-html';
import { ExplanationTools } from './explanation-tools';
import {
  type AnswerValue,
  formatCorrectAnswer,
  formatStudentAnswer,
  isAnswered,
  normalizeTrueFalseAnswers,
  questionTypeLabel,
  scoreQuestionAnswer,
  scoringModeLabel,
} from '../lib/question-scoring';

type PracticeQuestion = {
  id: string;
  code: string;
  html: string;
  explanation: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  scoringMode: 'EXACT_MATCH' | 'PARTIAL_NO_PENALTY';
  maxScore: number;
  options: { id: string; label: string; text: string; isCorrect: boolean }[];
};

type TopicPayload = {
  id: string;
  title: string;
  description: string;
  subject: string;
  materialCount: number;
  questionCount: number;
  questions: PracticeQuestion[];
};

export function TopicExplanation({
  topics,
  initialQuery,
  selectedTopicId,
  initialAnswers = {},
  initialCompleted = {},
}: {
  topics: TopicPayload[];
  initialQuery?: string;
  selectedTopicId?: string;
  initialAnswers?: Record<string, AnswerValue>;
  initialCompleted?: Record<string, boolean>;
}) {
  const [query, setQuery] = useState(initialQuery || '');
  const completed = initialCompleted;
  const answers = initialAnswers;

  const completedTopics = useMemo(
    () => topics.filter((topic) => completed[topic.id]),
    [topics, completed],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return completedTopics;
    return completedTopics.filter((topic) => `${topic.title} ${topic.description} ${topic.subject}`.toLowerCase().includes(normalized));
  }, [completedTopics, query]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId) || null,
    [topics, selectedTopicId],
  );

  if (selectedTopic) {
    if (!completed[selectedTopic.id]) {
      return (
        <div className="stack">
          <div className="empty-state">Pembahasan topik ini belum terbuka. Kerjakan semua latihan pada topik belajar terlebih dahulu.</div>
          <div className="inline-group">
            <Link className="button" href={`/belajar?topik=${selectedTopic.id}`}>Kerjakan di menu Belajar</Link>
            <Link className="button-secondary" href="/pembahasan">Kembali ke pembahasan</Link>
          </div>
        </div>
      );
    }

    const rows = selectedTopic.questions.map((question) => {
      const value = answers[question.id];
      const scored = scoreQuestionAnswer(question, value);
      const answered = isAnswered(question, value);
      return { question, value, scored, answered };
    });
    const earned = rows.reduce((sum, row) => sum + row.scored.score, 0);
    const possible = rows.reduce((sum, row) => sum + row.scored.maxScore, 0);
    const score = possible ? (earned / possible) * 100 : 0;

    return (
      <div className="stack">
        <div className="topic-detail-head card">
          <div>
            <div className="eyebrow">Pembahasan topik</div>
            <h2>{selectedTopic.title}</h2>
            <p className="muted">Skor latihan topik {score.toFixed(0)} • {rows.filter((row) => row.scored.isCorrect).length} benar penuh • {rows.length} soal</p>
          </div>
          <div className="inline-group">
            <span className="badge success"><CheckCircle2 size={15} /> Selesai</span>
            <Link className="button-secondary" href="/pembahasan">Kembali ke topik</Link>
          </div>
        </div>

        {rows.map((row, index) => (
          <article className="card stack" key={row.question.id}>
            <div className="item-head">
              <div>
                <strong>{index + 1}. {row.question.code}</strong>
                <div className="muted">{row.scored.isCorrect ? 'Jawaban benar penuh' : 'Jawaban salah atau parsial'}</div>
                <div className="inline-group" style={{ marginTop: 8 }}>
                  <span className="badge">{questionTypeLabel(row.question.questionType)}</span>
                  <span className="badge">{scoringModeLabel(row.question.scoringMode)}</span>
                  <span className="badge">Skor {row.scored.score.toFixed(2)} / {row.scored.maxScore.toFixed(2)}</span>
                </div>
              </div>
              <span className={`badge${row.scored.isCorrect ? ' success' : ' danger'}`}>{row.scored.isCorrect ? 'Benar' : 'Belum tepat'}</span>
            </div>
            <MathHtml html={row.question.html} />
            {row.question.questionType === 'TRUE_FALSE' ? (
              <div className="tf-list review-tf-list">
                {row.question.options.map((option, optionIndex) => {
                  const answerMap = normalizeTrueFalseAnswers(row.value);
                  const hasAnswer = Object.prototype.hasOwnProperty.call(answerMap, option.id);
                  const userValue = hasAnswer ? answerMap[option.id] : null;
                  const ok = hasAnswer && userValue === option.isCorrect;
                  return (
                    <div className="tf-row" key={option.id}>
                      <div className="tf-statement"><strong>{optionIndex + 1}.</strong> <MathHtml html={option.text} /></div>
                      <div className="tf-actions">
                        <span className={`badge${ok ? ' success' : ' danger'}`}>Kamu: {hasAnswer ? (userValue ? 'Benar' : 'Salah') : '-'}</span>
                        <span className="badge">Kunci: {option.isCorrect ? 'Benar' : 'Salah'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid-2 compact-grid">
                <div className="item-card">
                  <strong>Jawaban kamu</strong>
                  <div>{formatStudentAnswer(row.question, row.value)}</div>
                </div>
                <div className="item-card">
                  <strong>Jawaban benar</strong>
                  <div>{formatCorrectAnswer(row.question)}</div>
                </div>
              </div>
            )}
            <ExplanationTools html={row.question.explanation || '<p>Belum ada pembahasan.</p>'} />
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card topic-search-card">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari topik yang sudah selesai..." />
      </div>
      <div className="topic-grid">
        {filtered.map((topic) => (
          <Link key={topic.id} className="topic-card is-completed" href={`/pembahasan?topik=${topic.id}`}>
            <div className="topic-card-top">
              <span className="badge">{topic.subject}</span>
              <span className="badge success"><CheckCircle2 size={14} /> Selesai</span>
            </div>
            <h3>{topic.title}</h3>
            <p>{topic.description || 'Klik topik untuk membuka pembahasan latihan.'}</p>
            <div className="topic-card-meta">
              <span>{topic.materialCount} materi</span>
              <span>{topic.questionCount} pembahasan</span>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length ? <div className="empty-state">Belum ada topik yang selesai. Kerjakan latihan pada menu Belajar terlebih dahulu.</div> : null}
    </div>
  );
}
