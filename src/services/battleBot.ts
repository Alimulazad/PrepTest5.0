import { Question } from '../types';
import { BATTLE_BOT_CANDIDATES, BattleBotCandidate, DUMMY_LEADERBOARD_USERS } from '../data/dummyUsers';

export type { BattleBotCandidate };

export interface BotQuestionDecision {
  questionIndex: number;
  isCorrect: boolean;
  chosenOption: 'A' | 'B' | 'C' | 'D';
  delayMs: number;
  speedBonus: number;
}

export interface BotBattleSession {
  botProfile: BattleBotCandidate;
  accuracyRate: number; // e.g. 0.40, 0.50, 0.60, 0.70, 0.80, 0.90
  decisions: BotQuestionDecision[];
}

/**
 * Generates an undetectable Bot Battle Session based on probabilistic parameters:
 * - 80% of battles will have 40% accuracy (2/5 correct)
 * - 20% of battles will have random 50%, 60%, 70%, 80%, or 90% accuracy
 * - Response timings simulate natural human reading and problem solving (2.2s - 6.8s)
 */
export function createBotBattleSession(
  questions: Question[],
  excludeName?: string
): BotBattleSession {
  // 1. Pick a natural human identity
  const availableCandidates = BATTLE_BOT_CANDIDATES.filter(
    (c) => !excludeName || c.name.toLowerCase() !== excludeName.toLowerCase()
  );
  const botProfile =
    availableCandidates.length > 0
      ? availableCandidates[Math.floor(Math.random() * availableCandidates.length)]
      : BATTLE_BOT_CANDIDATES[0];

  const totalQuestions = Math.max(1, questions.length);

  // 2. Determine Bot Accuracy following exact user rule:
  // "80 % ব্যাটেল এ 40 % সঠিক উত্তর দিবে, বাকি ব্যাটেল এ ৫০%, ৬০ %, ৭০%, ৮০% ও ৯০% সঠিক উত্তর দিবে"
  const isEightyPercentRule = Math.random() < 0.8;
  let accuracyRate = 0.4; // 40% base

  if (!isEightyPercentRule) {
    const alternativeAccuracies = [0.5, 0.6, 0.7, 0.8, 0.9];
    accuracyRate =
      alternativeAccuracies[Math.floor(Math.random() * alternativeAccuracies.length)];
  }

  // Calculate target correct count (e.g. for 5 questions: 0.4 * 5 = 2 correct)
  let targetCorrectCount = Math.round(totalQuestions * accuracyRate);
  targetCorrectCount = Math.max(1, Math.min(totalQuestions, targetCorrectCount));

  // 3. Distribute correct and incorrect answers unpredictably
  const boolFlags: boolean[] = [];
  for (let i = 0; i < totalQuestions; i++) {
    boolFlags.push(i < targetCorrectCount);
  }
  // Shuffle bool flags
  for (let i = boolFlags.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [boolFlags[i], boolFlags[j]] = [boolFlags[j], boolFlags[i]];
  }

  // 4. Generate per-question decisions with natural human timings
  const decisions: BotQuestionDecision[] = questions.map((q, idx) => {
    const isCorrect = boolFlags[idx] ?? false;
    const correctAns = (q.correct_ans || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D';

    let chosenOption = correctAns;
    if (!isCorrect) {
      const wrongPool = (['A', 'B', 'C', 'D'] as const).filter((opt) => opt !== correctAns);
      chosenOption = wrongPool[Math.floor(Math.random() * wrongPool.length)] || 'B';
    }

    // Natural reading & calculation time (2.5s to 7.0s)
    // Faster responses on easy/memory questions, longer on calculations
    const baseDelay = 2600 + Math.random() * 4200;
    const variance = (Math.random() - 0.5) * 800;
    const delayMs = Math.max(2200, Math.min(8500, Math.round(baseDelay + variance)));

    // Speed bonus if answered in under 5.5s
    const speedBonus = delayMs < 5500 && isCorrect ? 2 : 0;

    return {
      questionIndex: idx,
      isCorrect,
      chosenOption,
      delayMs,
      speedBonus,
    };
  });

  return {
    botProfile,
    accuracyRate,
    decisions,
  };
}
