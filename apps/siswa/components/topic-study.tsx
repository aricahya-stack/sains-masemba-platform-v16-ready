'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { MathHtml } from './math-html';
import {
  type AnswerValue,
  isAnswered,
  normalizeSelectedIds,
  normalizeTrueFalseAnswers,
  questionTypeLabel,
  scoringModeLabel,
} from '../lib/question-scoring';

type MaterialPayload = {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  sections: { id: string; title: string; html: string }[];
};

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
  materials: MaterialPayload[];
  questions: PracticeQuestion[];
};

const COMPLETED_KEY = 'sh_completed_topics';
const ANSWERS_KEY = 'sh_topic_answers';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function TopicStudy({ topics, initialQuery, selectedTopicId }: { topics: TopicPayload[]; initialQuery?: string; selectedTopicId?: string }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  useEffect(() => {
    setCompleted(readJson<Record<string, boolean>>(COMPLETED_KEY, {}));
    setAnswers(readJson<Record<string, AnswerValue>>(ANSWERS_KEY, {}));
  }, []);

  const selectedTopic = useMemo(() => topics.find((topic) => topic.id === selectedTopicId) || null, [topics, selectedTopicId]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return topics;
    return topics.filter((topic) => `${topic.title} ${topic.description} ${topic.subject}`.toLowerCase().includes(normalized));
  }, [topics, query]);

  const persistAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      writeJson(ANSWERS_KEY, next);
      return next;
    });
  };

  const setSingleAnswer = (questionId: string, optionId: string) => {
    persistAnswer(questionId, optionId);
  };

  const toggleMultipleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const selected = new Set(normalizeSelectedIds(prev[questionId]));
      if (selected.has(optionId)) selected.delete(optionId);
      else selected.add(optionId);
      const next = { ...prev, [questionId]: Array.from(selected) };
      writeJson(ANSWERS_KEY, next);
      return next;
    });
  };

  const setTrueFalseAnswer = (questionId: string, optionId: string, value: boolean) => {
    setAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: {
          ...normalizeTrueFalseAnswers(prev[questionId]),
          [optionId]: value,
        },
      };
      writeJson(ANSWERS_KEY, next);
      return next;
    });
  };

  useEffect(() => {
    if (!selectedTopic || selectedTopic.questions.length === 0) return;
    const finished = selectedTopic.questions.every((question) => isAnswered(question, answers[question.id]));
    if (!finished || completed[selectedTopic.id]) return;
    const next = { ...completed, [selectedTopic.id]: true };
    setCompleted(next);
    writeJson(COMPLETED_KEY, next);
  }, [answers, completed, selectedTopic]);

  if (selectedTopic) {
    const finishedQuestionCount = selectedTopic.questions.filter((question) => isAnswered(question, answers[question.id])).length;
    const isTopicDone = Boolean(completed[selectedTopic.id]) || (selectedTopic.questions.length > 0 && finishedQuestionCount === selectedTopic.questions.length);

    return (
      <div className="stack">
        <div className="topic-detail-head card">
          <div>
            <div className="eyebrow">Topik belajar</div>
            <h2>{selectedTopic.title}</h2>
            <p className="muted">{selectedTopic.description || 'Materi dan latihan pada topik ini siap dipelajari.'}</p>
          </div>
          <div className="inline-group">
            {isTopicDone ? <span className="badge success"><CheckCircle2 size={15} /> Selesai</span> : <span className="badge">Belum selesai</span>}
            <span className="badge">{finishedQuestionCount}/{selectedTopic.questions.length} latihan terjawab</span>
            <Link className="button-secondary" href="/belajar">Kembali ke topik</Link>
          </div>
        </div>

        {selectedTopic.materials.length === 0 ? <div className="empty-state">Belum ada materi terbit untuk topik ini.</div> : null}
        {selectedTopic.materials.map((material) => (
          <article key={material.id} className="card stack">
            <div>
              <div className="eyebrow">Materi</div>
              <strong>{material.title}</strong>
            </div>
            <MathHtml html={material.summary || ''} />
            {material.objectives.length ? (
              <div>
                <div className="eyebrow">Tujuan pembelajaran</div>
                <ul>{material.objectives.map((objective, index) => <li key={`${material.id}-${index}`}>{objective}</li>)}</ul>
              </div>
            ) : null}
            {material.sections.map((section) => (
              <section key={section.id} className="item-card">
                <strong>{section.title}</strong>
                <MathHtml html={section.html || ''} />
              </section>
            ))}
          </article>
        ))}

        <section className="card stack">
          <div>
            <div className="eyebrow">Latihan topik</div>
            <strong>Kerjakan latihan pada topik ini</strong>
            <p className="muted">Topik otomatis bertanda selesai setelah semua latihan dijawab. Pembahasan dapat dibuka melalui menu Pembahasan.</p>
          </div>
          {selectedTopic.questions.length === 0 ? <div className="empty-state">Belum ada latihan pada topik ini.</div> : null}
          {selectedTopic.questions.map((question, index) => {
            const selected = answers[question.id];
            const answered = isAnswered(question, selected);
            const selectedIds = new Set(normalizeSelectedIds(selected));
            const trueFalseMap = normalizeTrueFalseAnswers(selected);
            return (
              <article className="practice-card" key={question.id}>
                <div className="item-head">
                  <div>
                    <strong>{index + 1}. {question.code}</strong>
                    <div className="muted">{answered ? 'Jawaban tersimpan' : 'Belum dijawab'}</div>
                    <div className="inline-group" style={{ marginTop: 8 }}>
                      <span className="badge">{questionTypeLabel(question.questionType)}</span>
                      <span className="badge">{scoringModeLabel(question.scoringMode)}</span>
                    </div>
                  </div>
                  {answered ? <span className="badge success"><CheckCircle2 size={14} /> Terjawab</span> : <span className="badge">Belum terjawab</span>}
                </div>
                <MathHtml html={question.html} />

                {question.questionType === 'TRUE_FALSE' ? (
                  <div className="tf-list">
                    {question.options.map((option, optionIndex) => (
                      <div className="tf-row" key={option.id}>
                        <div className="tf-statement"><strong>{optionIndex + 1}.</strong> <MathHtml html={option.text} /></div>
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
                        className={`button-secondary${selectedIds.has(option.id) ? ' active' : ''}`}
                        onClick={() => toggleMultipleAnswer(question.id, option.id)}
                        style={{ justifyContent: 'flex-start', minHeight: 52 }}
                      >
                        <span className="checkbox-mark">{selectedIds.has(option.id) ? '☑' : '☐'}</span>
                        <strong style={{ marginRight: 8 }}>{option.label}.</strong> <MathHtml html={option.text} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="stack">
                    {question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`button-secondary${selectedIds.has(option.id) ? ' active' : ''}`}
                        onClick={() => setSingleAnswer(question.id, option.id)}
                        style={{ justifyContent: 'flex-start', minHeight: 52 }}
                      >
                        <strong style={{ marginRight: 8 }}>{option.label}.</strong> <MathHtml html={option.text} />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card topic-search-card">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari topik IPA SMP..." />
      </div>
      <div className="topic-grid">
        {filtered.map((topic) => (
          <Link key={topic.id} className={`topic-card${completed[topic.id] ? ' is-completed' : ''}`} href={`/belajar?topik=${topic.id}`}>
            <div className="topic-card-top">
              <span className="badge">{topic.subject}</span>
              {completed[topic.id] ? <span className="badge success"><CheckCircle2 size={14} /> Selesai</span> : null}
            </div>
            <h3>{topic.title}</h3>
            <p>{topic.description || 'Klik topik untuk membuka materi dan latihan.'}</p>
            <div className="topic-card-meta">
              <span>{topic.materialCount} materi</span>
              <span>{topic.questionCount} latihan</span>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length ? <div className="empty-state">Topik tidak ditemukan. Coba kata kunci lain.</div> : null}
    </div>
  );
}
