-- Menyimpan progres latihan topik siswa di database agar sinkron antarperangkat.
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "selectedOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trueFalseAnswers" JSONB,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeAttempt_userId_topicId_key" ON "PracticeAttempt"("userId", "topicId");
CREATE INDEX "PracticeAttempt_userId_idx" ON "PracticeAttempt"("userId");
CREATE INDEX "PracticeAttempt_topicId_idx" ON "PracticeAttempt"("topicId");
CREATE UNIQUE INDEX "PracticeAnswer_attemptId_questionId_key" ON "PracticeAnswer"("attemptId", "questionId");
CREATE INDEX "PracticeAnswer_questionId_idx" ON "PracticeAnswer"("questionId");

ALTER TABLE "PracticeAttempt"
ADD CONSTRAINT "PracticeAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAttempt"
ADD CONSTRAINT "PracticeAttempt_topicId_fkey"
FOREIGN KEY ("topicId") REFERENCES "Topic"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAnswer"
ADD CONSTRAINT "PracticeAnswer_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAnswer"
ADD CONSTRAINT "PracticeAnswer_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
