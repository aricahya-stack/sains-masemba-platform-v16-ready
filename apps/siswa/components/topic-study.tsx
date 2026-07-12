'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Search } from 'lucide-react';
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

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type SaveResponse = {
  ok: boolean;
  answered: boolean;
  answeredCount: number;
  totalQuestions: number;
  completed: boolean;
};

const LEGACY_COMPLETED_KEY = 'sh_completed_topics';
const LEGACY_ANSWERS_KEY = 'sh_topic_answers';

function readLegacyJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function removeLegacyProgress() {
  try {
    window.localStorage.removeItem(LEGACY_COMPLETED_KEY);
    window.localStorage.removeItem(LEGACY_ANSWERS_KEY);
  } catch {}
}

function hasAnyAnswer(value: AnswerValue) {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

export function TopicStudy({
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
  const [completed, setCompleted] = useState<Record<string, boolean>>(initialCompleted);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(initialAnswers);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [visibleMaterials, setVisibleMaterials] = useState<Record<string, boolean>>({});
  const answersRef = useRef<Record<string, AnswerValue>>(initialAnswers);
  const saveQueues = useRef<Record<string, Promise<boolean>>>({});
  const saveVersions = useRef<Record<string, number>>({});
  const topicSaveVersions = useRef<Record<string, number>>({});
  const legacyMigrated = useRef(false);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId) || null,
    [topics, selectedTopicId],
  );

  // Setiap kali siswa membuka atau berpindah topik, seluruh isi materi
  // kembali disembunyikan. Siswa membukanya secara sadar melalui tombol.
  useEffect(() => {
    setVisibleMaterials({});
  }, [selectedTopicId]);

  const toggleMaterialVisibility = (materialId: string) => {
    setVisibleMaterials((current) => ({
      ...current,
      [materialId]: !current[materialId],
    }));
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return topics;
    return topics.filter((topic) => `${topic.title} ${topic.description} ${topic.subject}`.toLowerCase().includes(normalized));
  }, [topics, query]);

  const questionIndex = useMemo(() => {
    const index = new Map<string, { topicId: string; question: PracticeQuestion }>();
    for (const topic of topics) {
      for (const question of topic.questions) {
        index.set(question.id, { topicId: topic.id, question });
      }
    }
    return index;
  }, [topics]);

  const updateLocalAnswer = (questionId: string, value: AnswerValue) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    setAnswers(next);
  };

  const enqueueSave = (topicId: string, questionId: string, value: AnswerValue) => {
    const version = (saveVersions.current[questionId] || 0) + 1;
    saveVersions.current[questionId] = version;
    const topicVersion = (topicSaveVersions.current[topicId] || 0) + 1;
    topicSaveVersions.current[topicId] = topicVersion;

    const previous = saveQueues.current[questionId] || Promise.resolve(true);
    const task = previous
      .catch(() => false)
      .then(async () => {
        if (saveVersions.current[questionId] === version) {
          setSaveStates((current) => ({ ...current, [questionId]: 'saving' }));
        }

        const response = await fetch(`/api/practice-progress/${encodeURIComponent(topicId)}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId, answer: value }),
        });

        const payload = await response.json().catch(() => ({})) as Partial<SaveResponse> & { error?: string };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Gagal menyimpan jawaban.');
        }

        if (topicSaveVersions.current[topicId] === topicVersion) {
          setCompleted((current) => ({ ...current, [topicId]: Boolean(payload.completed) }));
        }

        if (saveVersions.current[questionId] === version) {
          setSaveStates((current) => ({ ...current, [questionId]: 'saved' }));
        }
        return true;
      })
      .catch(() => {
        if (saveVersions.current[questionId] === version) {
          setSaveStates((current) => ({ ...current, [questionId]: 'error' }));
        }
        return false;
      });

    saveQueues.current[questionId] = task;
    return task;
  };

  const persistAnswer = (topicId: string, questionId: string, value: AnswerValue) => {
    updateLocalAnswer(questionId, value);
    void enqueueSave(topicId, questionId, value);
  };

  const setSingleAnswer = (topicId: string, questionId: string, optionId: string) => {
    persistAnswer(topicId, questionId, optionId);
  };

  const toggleMultipleAnswer = (topicId: string, questionId: string, optionId: string) => {
    const selected = new Set(normalizeSelectedIds(answersRef.current[questionId]));
    if (selected.has(optionId)) selected.delete(optionId);
    else selected.add(optionId);
    persistAnswer(topicId, questionId, Array.from(selected));
  };

  const setTrueFalseAnswer = (topicId: string, questionId: string, optionId: string, value: boolean) => {
    persistAnswer(topicId, questionId, {
      ...normalizeTrueFalseAnswers(answersRef.current[questionId]),
      [optionId]: value,
    });
  };

  // Migrasi sekali dari localStorage versi lama ke database, supaya progres lama tidak hilang.
  useEffect(() => {
    if (legacyMigrated.current) return;
    legacyMigrated.current = true;

    const legacyAnswers = readLegacyJson<Record<string, AnswerValue>>(LEGACY_ANSWERS_KEY, {});
    const candidates = Object.entries(legacyAnswers).filter(([questionId, value]) => {
      const indexed = questionIndex.get(questionId);
      if (!indexed || Object.prototype.hasOwnProperty.call(initialAnswers, questionId)) return false;
      return hasAnyAnswer(value);
    });

    if (!candidates.length) {
      removeLegacyProgress();
      return;
    }

    let cancelled = false;
    void (async () => {
      let allSaved = true;

      for (const [questionId, value] of candidates) {
        if (cancelled) return;
        const indexed = questionIndex.get(questionId);
        if (!indexed) continue;

        updateLocalAnswer(questionId, value);
        const saved = await enqueueSave(indexed.topicId, questionId, value);
        if (!saved) allSaved = false;
      }

      if (!cancelled && allSaved) {
        removeLegacyProgress();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Jalankan hanya sekali untuk migrasi data browser lama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex]);

  if (selectedTopic) {
    const finishedQuestionCount = selectedTopic.questions.filter((question) => isAnswered(question, answers[question.id])).length;
    const isTopicDone = Boolean(completed[selectedTopic.id]);

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
        {selectedTopic.materials.map((material) => {
          const isMaterialVisible = Boolean(visibleMaterials[material.id]);
          const contentId = `material-content-${material.id}`;

          return (
            <article key={material.id} className="card stack">
              <div className="item-head">
                <div>
                  <div className="eyebrow">Materi</div>
                  <strong>{material.title}</strong>
                  {!isMaterialVisible ? <p className="muted">Isi materi disembunyikan secara default.</p> : null}
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => toggleMaterialVisibility(material.id)}
                  aria-expanded={isMaterialVisible}
                  aria-controls={contentId}
                >
                  {isMaterialVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  {isMaterialVisible ? 'Sembunyikan materi' : 'Tampilkan materi'}
                </button>
              </div>

              {isMaterialVisible ? (
                <div id={contentId} className="stack">
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
                </div>
              ) : null}
            </article>
          );
        })}

        <section className="card stack">
          <div>
            <div className="eyebrow">Latihan topik</div>
            <strong>Kerjakan latihan pada topik ini</strong>
            <p className="muted">Jawaban dan status selesai tersimpan di database, sehingga tetap tersedia saat login dari perangkat lain. Pembahasan terbuka setelah seluruh latihan terjawab.</p>
          </div>
          {selectedTopic.questions.length === 0 ? <div className="empty-state">Belum ada latihan pada topik ini.</div> : null}
          {selectedTopic.questions.map((question, index) => {
            const selected = answers[question.id];
            const answered = isAnswered(question, selected);
            const selectedIds = new Set(normalizeSelectedIds(selected));
            const trueFalseMap = normalizeTrueFalseAnswers(selected);
            const saveState = saveStates[question.id] || 'idle';
            const statusText = saveState === 'saving'
              ? 'Menyimpan ke database...'
              : saveState === 'error'
                ? 'Gagal menyimpan. Pilih jawaban lagi untuk mencoba ulang.'
                : answered
                  ? 'Jawaban tersimpan di database'
                  : hasAnyAnswer(selected)
                    ? 'Jawaban sementara tersimpan di database'
                    : 'Belum dijawab';

            return (
              <article className="practice-card" key={question.id}>
                <div className="item-head">
                  <div>
                    <strong>{index + 1}. {question.code}</strong>
                    <div className="muted">{statusText}</div>
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
                        <div className="tf-statement practice-option-text"><span className="practice-option-label">{optionIndex + 1}.</span> <MathHtml html={option.text} /></div>
                        <div className="tf-actions">
                          <button
                            type="button"
                            className={`button-secondary${trueFalseMap[option.id] === true ? ' active' : ''}`}
                            onClick={() => setTrueFalseAnswer(selectedTopic.id, question.id, option.id, true)}
                          >
                            Benar
                          </button>
                          <button
                            type="button"
                            className={`button-secondary${trueFalseMap[option.id] === false ? ' active' : ''}`}
                            onClick={() => setTrueFalseAnswer(selectedTopic.id, question.id, option.id, false)}
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
                        onClick={() => toggleMultipleAnswer(selectedTopic.id, question.id, option.id)}
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
                        onClick={() => setSingleAnswer(selectedTopic.id, question.id, option.id)}
                      >
                        <span className="practice-option-label">{option.label}.</span>
                        <MathHtml html={option.text} />
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
