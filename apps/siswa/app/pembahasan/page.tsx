import Link from 'next/link';
import { prisma, QuestionType, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';
import { MathHtml } from '../../components/math-html';
import { ExplanationTools } from '../../components/explanation-tools';
import { TopicExplanation } from '../../components/topic-explanation';
import {
  formatCorrectAnswer,
  formatStudentAnswer,
  normalizeTrueFalseAnswers,
  scoreQuestionAnswer,
  scoringModeLabel,
  questionTypeLabel,
  type AnswerValue,
} from '../../lib/question-scoring';

type TopicQuestionPayload = {
  id: string;
  code: string;
  html: string;
  explanation: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  scoringMode: 'EXACT_MATCH' | 'PARTIAL_NO_PENALTY';
  maxScore: number;
  options: { id: string; label: string; text: string; isCorrect: boolean }[];
};

function tkaTopicExamples(topicId: string): TopicQuestionPayload[] {
  return [
    {
      id: `${topicId}-contoh-tka-kompleks`,
      code: 'CONTOH-TKA-KOMPLEKS',
      html: '<p>Perhatikan pernyataan tentang energi pada benda yang jatuh dari ketinggian tertentu. Pernyataan yang benar adalah ...</p>',
      explanation: '<p>Saat ketinggian benda berkurang, energi potensial menurun. Energi kinetik meningkat karena kecepatan bertambah. Energi mekanik tetap jika hambatan udara diabaikan.</p>',
      questionType: 'MULTIPLE_CHOICE',
      scoringMode: 'PARTIAL_NO_PENALTY',
      maxScore: 1,
      options: [
        { id: `${topicId}-contoh-tka-kompleks-A`, label: 'A', text: 'Energi potensial bergantung pada massa, gravitasi, dan ketinggian.', isCorrect: true },
        { id: `${topicId}-contoh-tka-kompleks-B`, label: 'B', text: 'Energi kinetik selalu nol selama benda bergerak jatuh.', isCorrect: false },
        { id: `${topicId}-contoh-tka-kompleks-C`, label: 'C', text: 'Energi kinetik bertambah saat kecepatan benda meningkat.', isCorrect: true },
        { id: `${topicId}-contoh-tka-kompleks-D`, label: 'D', text: 'Energi mekanik tetap jika hambatan udara diabaikan.', isCorrect: true },
      ],
    },
    {
      id: `${topicId}-contoh-tka-benar-salah`,
      code: 'CONTOH-TKA-BS',
      html: '<p>Tentukan benar atau salah untuk setiap pernyataan tentang susunan atom oksigen.</p>',
      explanation: '<p>Atom oksigen netral memiliki 8 proton dan 8 elektron. Jika nomor massa 16, jumlah neutronnya 8. Susunan elektron oksigen adalah 2 elektron pada kulit K dan 6 elektron pada kulit L.</p>',
      questionType: 'TRUE_FALSE',
      scoringMode: 'PARTIAL_NO_PENALTY',
      maxScore: 1,
      options: [
        { id: `${topicId}-contoh-tka-benar-salah-A`, label: 'A', text: 'Atom oksigen netral memiliki 8 elektron.', isCorrect: true },
        { id: `${topicId}-contoh-tka-benar-salah-B`, label: 'B', text: 'Jika nomor massanya 16, atom oksigen memiliki 7 neutron.', isCorrect: false },
        { id: `${topicId}-contoh-tka-benar-salah-C`, label: 'C', text: 'Kulit L pada atom oksigen berisi 6 elektron.', isCorrect: true },
      ],
    },
  ];
}

function withTopicExamples(topicId: string, questions: TopicQuestionPayload[]) {
  const hasMultipleChoice = questions.some((question) => question.questionType === 'MULTIPLE_CHOICE');
  const hasTrueFalse = questions.some((question) => question.questionType === 'TRUE_FALSE');
  const examples = tkaTopicExamples(topicId).filter((question) => {
    if (question.questionType === 'MULTIPLE_CHOICE') return !hasMultipleChoice;
    if (question.questionType === 'TRUE_FALSE') return !hasTrueFalse;
    return false;
  });
  return [...questions, ...examples];
}

export default async function PembahasanPage({ searchParams }: { searchParams: Promise<{ attempt?: string; topik?: string; q?: string }> }) {
  const user = await requireRole(UserRole.SISWA);
  const params = await searchParams;
  const attemptId = params.attempt;

  if (!attemptId) {
    const topics = await prisma.topic.findMany({
      include: {
        materials: { where: { status: 'PUBLISHED' } },
        questions: {
          where: {
          status: 'PUBLISHED',
          tryoutQuestions: { none: {} },
          NOT: {
            blueprint: {
              is: {
                OR: [
                  { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
                  { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
                ],
              },
            },
          },
        },
          include: { options: { orderBy: { label: 'asc' } } },
          orderBy: { code: 'asc' },
          take: 15,
        },
      },
      orderBy: [{ orderNo: 'asc' }, { title: 'asc' }],
    });

    const payload = topics.map((topic) => {
      const questions = withTopicExamples(topic.id, topic.questions.map((question) => ({
        id: question.id,
        code: question.code,
        html: question.questionHtml || question.questionText,
        explanation: question.explanation || '',
        questionType: question.questionType,
        scoringMode: question.scoringMode,
        maxScore: question.maxScore || 1,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
          text: option.optionText,
          isCorrect: option.isCorrect,
        })),
      })));
      return {
        id: topic.id,
        title: topic.title,
        description: topic.description || '',
        subject: topic.subject,
        materialCount: topic.materials.length,
        questionCount: questions.length,
        questions,
      };
    });

    return (
      <div className="stack">
        <PageHero
          eyebrow="Pembahasan"
          title="Pembahasan topik belajar"
          description="Kotak pembahasan muncul setelah siswa mengerjakan semua latihan pada topik belajar. Klik topik selesai untuk melihat jawaban, kunci, skor, dan pembahasan."
        />
        <TopicExplanation topics={payload} initialQuery={params.q || ''} selectedTopicId={params.topik} />
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
    const value: AnswerValue = (!answer
      ? null
      : question.questionType === QuestionType.TRUE_FALSE
        ? answer.trueFalseAnswers
        : question.questionType === QuestionType.MULTIPLE_CHOICE
          ? answer.selectedOptionIds
          : answer.selectedOptionId) as AnswerValue;
    const scored = scoreQuestionAnswer(question, value);
    return { row, question, answer, value, scored, isCorrect: scored.isCorrect };
  });
  const correctCount = rows.filter((row) => row.isCorrect).length;
  const wrongCount = rows.length - correctCount;

  return (
    <div className="stack">
      <PageHero
        eyebrow="Pembahasan tryout"
        title={attempt.tryout.title}
        description={`Skor ${attempt.score.toFixed(0)} • Benar penuh ${correctCount} • Belum tepat ${wrongCount} • Warning ${attempt.warnings}`}
        actions={<Link className="button-secondary" href="/hasil">Kembali ke hasil</Link>}
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
