'use client';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Flag, Type } from 'lucide-react';
import { useToast } from './toast-provider';
import { MathHtml } from './math-html';

type ExamQuestion = {
  id: string;
  code: string;
  html: string;
  explanation: string;
  options: { id: string; label: string; text: string }[];
};

type FontSize = 'small' | 'normal' | 'large';

export function ExamMode({
  attemptId,
  tryoutTitle,
  durationMinutes,
  initialWarnings,
  initialAnswers,
  questions,
}: {
  tryoutId: string;
  attemptId: string;
  tryoutTitle: string;
  durationMinutes: number;
  initialWarnings: number;
  initialAnswers: Record<string, string>;
  questions: ExamQuestion[];
}) {
  const { notify } = useToast();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [doubts, setDoubts] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState(initialWarnings);
  const [seconds, setSeconds] = useState(durationMinutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('normal');

  const currentQuestion = questions[current];
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const doubtCount = questions.filter((question) => doubts[question.id]).length;
  const unansweredCount = questions.length - answeredCount;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`sh_doubt_${attemptId}`);
      if (raw) setDoubts(JSON.parse(raw));
    } catch {}
  }, [attemptId]);

  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          submitAttempt(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  useEffect(() => {
    document.documentElement.classList.add('exam-lock-active');
    document.body.classList.add('exam-lock-active');

    const onVisibility = () => {
      if (!document.hidden) {
        registerWarning('TAB_SWITCH', 'Terdeteksi berpindah tab atau kehilangan fokus.');
      }
    };
    const prevent = (event: Event) => {
      event.preventDefault();
      notify('Aksi diblokir', 'Copy, paste, cut, seleksi teks, drag, dan klik kanan dibatasi selama tryout.');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedCombo = (event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'p', 's', 'u'].includes(key);
      const blockedKey = event.key === 'PrintScreen' || event.key === 'F12';
      if (!blockedCombo && !blockedKey) return;
      event.preventDefault();
      if (event.key === 'PrintScreen' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText('').catch(() => {});
      }
      registerWarning('BLOCKED_ACTION', 'Terdeteksi percobaan shortcut, print screen, atau inspeksi halaman.');
      notify('Aksi diblokir', 'Shortcut, print screen, dan inspeksi halaman dibatasi selama tryout.');
    };
    const onBeforePrint = () => {
      registerWarning('PRINT_ATTEMPT', 'Terdeteksi percobaan mencetak halaman tryout.');
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('selectstart', prevent);
    document.addEventListener('dragstart', prevent);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeprint', onBeforePrint);

    return () => {
      document.documentElement.classList.remove('exam-lock-active');
      document.body.classList.remove('exam-lock-active');
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('selectstart', prevent);
      document.removeEventListener('dragstart', prevent);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeprint', onBeforePrint);
    };
  }, [attemptId, notify]);

  const timeText = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, [seconds]);

  async function saveAnswer(questionId: string, selectedOptionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptionId }));
    const response = await fetch(`/api/attempts/${attemptId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, selectedOptionId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      notify('Gagal menyimpan jawaban', payload.error || 'Server error.');
      return;
    }
    notify('Sudah tersimpan', 'Jawaban tersimpan otomatis.');
  }

  async function registerWarning(type: string, message: string) {
    const response = await fetch(`/api/attempts/${attemptId}/warn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message }),
    });
    const payload = await response.json();
    if (response.ok) {
      setWarnings(payload.warnings);
      notify('Peringatan ujian', message);
    }
  }

  function toggleDoubt(questionId: string) {
    const next = { ...doubts, [questionId]: !doubts[questionId] };
    setDoubts(next);
    try { window.localStorage.setItem(`sh_doubt_${attemptId}`, JSON.stringify(next)); } catch {}
  }

  async function submitAttempt(auto = false) {
    if (submitted) return;
    if (!auto) {
      const message = unansweredCount > 0
        ? `Masih ada ${unansweredCount} soal yang belum dijawab. Tetap selesaikan tryout?`
        : 'Semua soal sudah dijawab. Apakah Anda yakin ingin menyelesaikan tryout?';
      if (!window.confirm(message)) return;
    }
    const response = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const payload = await response.json();
    if (!response.ok) {
      notify('Gagal submit', payload.error || 'Server error.');
      return;
    }
    setSubmitted(true);
    try { window.localStorage.removeItem(`sh_doubt_${attemptId}`); } catch {}
    notify('Tryout selesai', auto ? 'Waktu habis. Tryout otomatis disubmit.' : 'Jawaban kamu sudah dikunci.');
    window.location.href = '/hasil';
  }

  if (!currentQuestion) {
    return <div className="empty-state">Belum ada soal pada tryout ini.</div>;
  }

  return (
    <div className="exam-focus-wrap">
      <div className="exam-header">
        <div className="exam-status-strip" aria-label="Status tryout">
          <div className="exam-status-track">
            <span className="exam-status-logo" aria-label="Logo Sains Masemba">
              <Image
                src="/sains-masemba-icon.svg"
                alt=""
                width={32}
                height={32}
                priority
                className="exam-status-logo-img"
              />
            </span>
            <span className="badge">{timeText}</span>
            <span className="badge success">Dijawab {answeredCount}</span>
            <span className="badge warning">Ragu {doubtCount}</span>
            <span className={`badge${warnings > 0 ? ' warning' : ''}`}>Warning {warnings}</span>
          </div>
        </div>
      </div>
      <div className="exam-shell">
        <section className={`card stack exam-question-card exam-font-${fontSize}`}>
          <div className="item-head">
            <div>
              <strong>Soal {current + 1} dari {questions.length}</strong>
              <div className="muted">{currentQuestion.code}</div>
            </div>
            <div className="inline-group">
              <div className="font-size-controls" aria-label="Ukuran font soal">
                <Type size={15} />
                <button type="button" className={fontSize === 'small' ? 'active' : ''} onClick={() => setFontSize('small')}>A</button>
                <button type="button" className={fontSize === 'normal' ? 'active' : ''} onClick={() => setFontSize('normal')}>A</button>
                <button type="button" className={fontSize === 'large' ? 'active' : ''} onClick={() => setFontSize('large')}>A</button>
              </div>
              {answers[currentQuestion.id] ? (
                <button className={`button-secondary${doubts[currentQuestion.id] ? ' active' : ''}`} type="button" onClick={() => toggleDoubt(currentQuestion.id)}>
                  <Flag size={15} />
                  Ragu-ragu
                </button>
              ) : null}
              <button className="button-danger" type="button" onClick={() => submitAttempt(false)}>Selesai</button>
            </div>
          </div>
          <MathHtml html={currentQuestion.html} className="exam-question-text" />
          <div className="stack">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`button-secondary exam-option${answers[currentQuestion.id] === option.id ? ' selected' : ''}`}
                onClick={() => saveAnswer(currentQuestion.id, option.id)}
              >
                <strong>{option.label}.</strong>
                <MathHtml html={option.text} />
              </button>
            ))}
          </div>
          <div className="inline-group">
            <button className="button-secondary" type="button" onClick={() => setCurrent((prev) => Math.max(0, prev - 1))}>Sebelumnya</button>
            <button className="button" type="button" onClick={() => setCurrent((prev) => Math.min(questions.length - 1, prev + 1))}>Selanjutnya</button>
          </div>
        </section>
        <aside className="card stack">
          <div>
            <div className="eyebrow">Navigasi soal</div>
            <strong>Nomor soal</strong>
          </div>
          <div className="question-nav">
            {questions.map((question, index) => {
              const state = doubts[question.id] ? 'doubt' : answers[question.id] ? 'answered' : 'unanswered';
              return (
                <button
                  key={question.id}
                  type="button"
                  className={`${state}${current === index ? ' active' : ''}`}
                  onClick={() => setCurrent(index)}
                  title={state === 'doubt' ? 'Ragu-ragu' : state === 'answered' ? 'Sudah dikerjakan' : 'Belum dikerjakan'}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="legend-list">
            <span><i className="legend answered" /> Sudah dikerjakan</span>
            <span><i className="legend unanswered" /> Belum dikerjakan</span>
            <span><i className="legend doubt" /> Ragu-ragu</span>
          </div>
          <div className="notice">
            Sistem memantau perpindahan tab, memblok copy/paste, membatasi seleksi teks, dan mencatat warning secara real-time.
          </div>
        </aside>
      </div>
    </div>
  );
}
