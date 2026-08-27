export interface ScorableQuestion {
  id: string;
  correctAnswer?: string;
  correct_ans?: string;
  questionText?: string;
  question?: string;
}

export interface ScoreCalculationResult {
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number;
  totalMarks: number;
  pointsEarned: number;
  accuracy: number;
}

/**
 * Calculates the exam score, negative marking penalty, accuracy and earned points.
 * Standard penalty is 0.25 mark per incorrect answer.
 */
export function calculateExamScore(
  answers: Record<string, string>,
  questions: ScorableQuestion[],
  negativeMarking: boolean | number = 0.25
): ScoreCalculationResult {
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const penaltyRate =
    typeof negativeMarking === 'number'
      ? negativeMarking
      : negativeMarking
      ? 0.25
      : 0;

  for (const q of questions) {
    const selected = answers[q.id];
    const correct = (q.correct_ans || q.correctAnswer || '').trim().toUpperCase();

    if (!selected) {
      skippedCount++;
    } else if (selected.trim().toUpperCase() === correct) {
      correctCount++;
    } else {
      wrongCount++;
    }
  }

  const rawScore = correctCount * 1.0 - wrongCount * penaltyRate;
  const score = Math.max(0, Number(rawScore.toFixed(2)));
  const totalAttempted = correctCount + wrongCount;
  const accuracy = totalAttempted > 0 ? Number(((correctCount / totalAttempted) * 100).toFixed(1)) : 0;
  const pointsEarned = correctCount * 10;

  return {
    correctCount,
    wrongCount,
    skippedCount,
    score,
    totalMarks: questions.length,
    pointsEarned,
    accuracy,
  };
}
