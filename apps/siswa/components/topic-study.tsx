'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, Search } from 'lucide-react';
import { MathHtml } from './math-html';
import { ExplanationTools } from './explanation-tools';
import { useToast } from './toast-provider';

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

export function TopicStudy({ topics, initialQuery, selectedTopicId }: { topics: TopicPayload[]; initialQuery?: string; selectedTopicId?: string }) {
  const { notify } = useToast();
  const [query, setQuery] = useState(initialQuery || '');
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('sh_completed_topics');
      if (raw) setCompleted(JSON.parse(raw));
    } catch {}
  }, []);

  const saveCompleted = (topicId: string, value: boolean) => {
    const next = { ...completed, [topicId]: value };
    setCompleted(next);
    try { window.localStorage.setItem('sh_completed_topics', JSON.stringify(next)); } catch {}
  };

  const selectedTopic = useMemo(() => topics.find((topic) => topic.id === selectedTopicId) || null, [topics, selectedTopicId]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return topics;
    return topics.filter((topic) => `${topic.title} ${topic.description} ${topic.subject}`.toLowerCase().includes(normalized));
  }, [topics, query]);

  if (selectedTopic) {
    return (
      <div className="stack">
        <div className="topic-detail-head card">
          <div>
            <div className="eyebrow">Topik belajar</div>
            <h2>{selectedTopic.title}</h2>
            <p className="muted">{selectedTopic.description || 'Materi dan latihan pada topik ini siap dipelajari.'}</p>
          </div>
          <div className="inline-group">
            {completed[selectedTopic.id] ? <span className="badge success"><CheckCircle2 size={15} /> Selesai</span> : <span className="badge">Belum selesai</span>}
            <button className="button-secondary" type="button" onClick={() => saveCompleted(selectedTopic.id, !completed[selectedTopic.id])}>
              {completed[selectedTopic.id] ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
              {completed[selectedTopic.id] ? 'Kerjakan lagi' : 'Tandai selesai'}
            </button>
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
            <strong>Kerjakan latihan, lalu buka pembahasan</strong>
            <p className="muted">Pembahasan menandai jawaban benar/salah serta mendukung teks gerak dan suara bahasa Indonesia.</p>
          </div>
          {selectedTopic.questions.length === 0 ? <div className="empty-state">Belum ada latihan pada topik ini.</div> : null}
          {selectedTopic.questions.map((question, index) => {
            const selected = answers[question.id];
            const correct = question.options.find((option) => option.isCorrect);
            const isCorrect = Boolean(selected && correct && selected === correct.id);
            return (
              <article className="practice-card" key={question.id}>
                <div className="item-head">
                  <div>
                    <strong>{index + 1}. {question.code}</strong>
                    <div className="muted">{selected ? (isCorrect ? 'Jawaban benar' : 'Jawaban belum tepat') : 'Pilih salah satu jawaban.'}</div>
                  </div>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => {
                      if (!selected) {
                        notify('Pilih jawaban dulu', 'Pembahasan dibuka setelah siswa memilih jawaban.');
                        return;
                      }
                      setRevealed((prev) => ({ ...prev, [question.id]: !prev[question.id] }));
                    }}
                  >
                    {revealed[question.id] ? 'Tutup pembahasan' : 'Pembahasan'}
                  </button>
                </div>
                <MathHtml html={question.html} />
                <div className="option-list">
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`option-item option-button${selected === option.id ? ' selected' : ''}`}
                      onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                    >
                      <strong>{option.label}.</strong>
                      <MathHtml html={option.text} />
                    </button>
                  ))}
                </div>
                {revealed[question.id] ? (
                  <div className={`answer-status ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                    <strong>{isCorrect ? 'Jawaban kamu benar.' : 'Jawaban kamu masih salah.'}</strong>
                    <span> Kunci: {correct?.label || '-'}</span>
                    <ExplanationTools html={question.explanation || '<p>Belum ada pembahasan.</p>'} />
                  </div>
                ) : null}
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
