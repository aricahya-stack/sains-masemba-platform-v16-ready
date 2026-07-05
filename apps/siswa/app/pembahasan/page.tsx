import Link from 'next/link';
import { prisma, QuestionType, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';
import { MathHtml } from '../../components/math-html';
import { ExplanationTools } from '../../components/explanation-tools';
import {
  formatCorrectAnswer,
  formatStudentAnswer,
  normalizeTrueFalseAnswers,
  scoreQuestionAnswer,
  scoringModeLabel,
  questionTypeLabel,
} from '../../lib/question-scoring';

export default async function PembahasanPage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const user = await requireRole(UserRole.SISWA);
  const params = await searchParams;
  const attemptId = params.attempt;

  if (!attemptId) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id, submittedAt: { not: null } },
      include: { tryout: { include: { _count: { select: { questions: true } } } } },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    });
    return (
      <div className="stack">
        <PageHero eyebrow="Pembahasan" title="Pilih hasil tryout" description="Klik tryout yang sudah selesai untuk melihat pembahasan soal benar dan salah." />
        <div className="grid-2">
          {attempts.map((attempt) => (
            <article key={attempt.id} className="card stack">
              <div className="item-head">
                <div>
                  <strong>{attempt.tryout.title}</strong>
                  <div className="muted">{attempt.tryout._count.questions} soal • {attempt.submittedAt?.toLocaleString('id-ID')}</div>
                </div>
                <span className="badge success">Skor {attempt.score.toFixed(0)}</span>
              </div>
              <Link className="button" href={`/pembahasan?attempt=${attempt.id}`}>Buka pembahasan</Link>
            </article>
          ))}
        </div>
        {!attempts.length ? <div className="empty-state">Belum ada tryout yang selesai dikerjakan.</div> : null}
      </div>
    );
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      tryout: {
        include: {
          questions: {
            include: { question: { include: { options: { orderBy: { label: 'asc' } } } } },
            orderBy: { orderNo: 'asc' },
          },
        },
      },
      answers: { include: { selectedOption: true } },
    },
  });

  if (!attempt) {
    return (
      <div className="stack">
        <PageHero eyebrow="Pembahasan" title="Data tidak ditemukan" description="Hasil tryout tidak ditemukan atau bukan milik akun siswa ini." />
      </div>
    );
  }

  const answerMap = new Map<string, (typeof attempt.answers)[number]>(attempt.answers.map((answer) => [answer.questionId, answer]));
  const rows = attempt.tryout.questions.map((row) => {
    const question = row.question;
    const answer = answerMap.get(question.id);
    const value = !answer
      ? null
      : question.questionType === QuestionType.TRUE_FALSE
        ? answer.trueFalseAnswers
        : question.questionType === QuestionType.MULTIPLE_CHOICE
          ? answer.selectedOptionIds
          : answer.selectedOptionId;
    const scored = scoreQuestionAnswer(question, value);
    return { row, question, answer, value, scored, isCorrect: scored.isCorrect };
  });
  const correctCount = rows.filter((row) => row.isCorrect).length;
  const wrongCount = rows.length - correctCount;

  return (
    <div className="stack">
      <PageHero
        eyebrow="Pembahasan"
        title={attempt.tryout.title}
        description={`Skor ${attempt.score.toFixed(0)} • Benar penuh ${correctCount} • Belum tepat ${wrongCount} • Warning ${attempt.warnings}`}
        actions={<Link className="button-secondary" href="/pembahasan">Kembali ke daftar</Link>}
      />
      <section className="card stack">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">Peta nomor soal</div>
            <strong>Benar dan salah</strong>
          </div>
          <div className="legend-list horizontal">
            <span><i className="legend correct" /> Benar penuh</span>
            <span><i className="legend wrong" /> Salah / parsial / kosong</span>
          </div>
        </div>
        <div className="question-nav review-nav">
          {rows.map((item, index) => (
            <a key={item.question.id} className={item.isCorrect ? 'correct' : 'wrong'} href={`#soal-${index + 1}`}>{index + 1}</a>
          ))}
        </div>
      </section>
      {rows.map((item, index) => (
        <article className="card stack" key={item.question.id} id={`soal-${index + 1}`}>
          <div className="item-head">
            <div>
              <strong>{index + 1}. {item.question.code}</strong>
              <div className="muted">{item.isCorrect ? 'Jawaban benar penuh' : 'Jawaban salah, parsial, atau belum dijawab'}</div>
              <div className="inline-group" style={{ marginTop: 8 }}>
                <span className="badge">{questionTypeLabel(item.question.questionType)}</span>
                <span className="badge">{scoringModeLabel(item.question.scoringMode)}</span>
                <span className="badge">Skor {item.scored.score.toFixed(2)} / {item.scored.maxScore.toFixed(2)}</span>
              </div>
            </div>
            <span className={`badge${item.isCorrect ? ' success' : ' danger'}`}>{item.isCorrect ? 'Benar' : 'Belum tepat'}</span>
          </div>
          <MathHtml html={item.question.questionHtml || item.question.questionText} />
          {item.question.questionType === QuestionType.TRUE_FALSE ? (
            <div className="tf-list review-tf-list">
              {item.question.options.map((option, optionIndex) => {
                const answerMapValue = normalizeTrueFalseAnswers(item.value);
                const hasAnswer = Object.prototype.hasOwnProperty.call(answerMapValue, option.id);
                const userValue = hasAnswer ? answerMapValue[option.id] : null;
                const ok = hasAnswer && userValue === option.isCorrect;
                return (
                  <div className="tf-row" key={option.id}>
                    <div className="tf-statement"><strong>{optionIndex + 1}.</strong> <MathHtml html={option.optionText} /></div>
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
                <div>{formatStudentAnswer(item.question, item.value)}</div>
              </div>
              <div className="item-card">
                <strong>Jawaban benar</strong>
                <div>{formatCorrectAnswer(item.question)}</div>
              </div>
            </div>
          )}
          <ExplanationTools html={item.question.explanation || '<p>Belum ada pembahasan.</p>'} />
        </article>
      ))}
    </div>
  );
}
