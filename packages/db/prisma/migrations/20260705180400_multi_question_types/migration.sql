-- Add multi-format question support for Sains Masemba.
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE');
CREATE TYPE "ScoringMode" AS ENUM ('EXACT_MATCH', 'PARTIAL_NO_PENALTY');

ALTER TABLE "Question"
  ADD COLUMN "questionType" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
  ADD COLUMN "scoringMode" "ScoringMode" NOT NULL DEFAULT 'EXACT_MATCH',
  ADD COLUMN "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 1;

ALTER TABLE "AttemptAnswer"
  ADD COLUMN "selectedOptionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "trueFalseAnswers" JSONB,
  ADD COLUMN "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "isCorrect" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AttemptAnswer"
SET "selectedOptionIds" = ARRAY["selectedOptionId"]
WHERE "selectedOptionId" IS NOT NULL;
