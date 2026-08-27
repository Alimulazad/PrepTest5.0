import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Timer,
  Zap,
  Award,
  Flame,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Sparkles,
  Users,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question, UserProgress, User as UserType } from '../types';
import { INITIAL_QUESTIONS } from '../data/admissionData';
import MathText from '../components/MathText';
import {
  createBotBattleSession,
  BotBattleSession,
  BattleBotCandidate,
} from '../services/battleBot';

interface LiveBattleArenaProps {
  questions: Question[];
  subjectName: string;
  chapterTitle: string;
  currentUser: UserType | null;
  progress: UserProgress;
  onExit: () => void;
  onBattleFinished: (score: number, won: boolean, pointsEarned: number) => void;
}

export const LiveBattleArena: React.FC<LiveBattleArenaProps> = ({
  questions,
  subjectName,
  chapterTitle,
  currentUser,
  progress,
  onExit,
  onBattleFinished,
}) => {
  // Phase: 'matchmaking' | 'battle' | 'result'
  const [phase, setPhase] = useState<'matchmaking' | 'battle' | 'result'>('matchmaking');
  const [matchmakingCountdown, setMatchmakingCountdown] = useState(3);

  // Battle session questions (5 rapid battle questions)
  const battleQuestions = React.useMemo(() => {
    const pool = (questions && questions.length > 0) ? questions : INITIAL_QUESTIONS;
    const list = [...pool].sort(() => Math.random() - 0.5);
    return list.slice(0, 5);
  }, [questions]);

  // Undetectable Bot Battle Session with strict probability distribution
  // (80% of matches 40% accuracy; 20% matches 50%-90% accuracy)
  const [botSession, setBotSession] = useState<BotBattleSession>(() =>
    createBotBattleSession(battleQuestions, currentUser?.name)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [userCombo, setUserCombo] = useState(0);
  const [opponentCombo, setOpponentCombo] = useState(0);

  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [opponentAnsweredState, setOpponentAnsweredState] = useState<
    'thinking' | 'answered' | 'correct' | 'wrong'
  >('thinking');
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);

  // 15 seconds timer per question
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<any>(null);

  // Matchmaking effect
  useEffect(() => {
    const session = createBotBattleSession(battleQuestions, currentUser?.name);
    setBotSession(session);

    const timer = setInterval(() => {
      setMatchmakingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('battle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [battleQuestions, currentUser?.name]);

  const opponent = botSession.botProfile;

  // Per-question countdown and bot decision execution
  useEffect(() => {
    if (phase !== 'battle') return;

    setTimeLeft(15);
    setSelectedOption(null);
    setIsAnswerLocked(false);
    setOpponentAnsweredState('thinking');

    const decision = botSession.decisions[currentIndex];
    const opponentResponseTime = decision ? decision.delayMs : 3500;

    // Simulate opponent answering with human delay and pre-scheduled decision
    const opponentTimer = setTimeout(() => {
      setOpponentAnsweredState('answered');
      if (decision && decision.isCorrect) {
        setOpponentScore((s) => s + 10 + decision.speedBonus);
        setOpponentCombo((c) => c + 1);
      } else {
        setOpponentCombo(0);
      }
    }, opponentResponseTime);

    // Active 15s timer
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleTimeExpired();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(opponentTimer);
    };
  }, [currentIndex, phase, botSession]);

  const handleTimeExpired = () => {
    clearInterval(timerRef.current);
    setIsAnswerLocked(true);
    setTimeout(goToNextQuestion, 1200);
  };

  const handleSelectOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);
    setSelectedOption(opt);
    clearInterval(timerRef.current);

    const currentQ = battleQuestions[currentIndex];
    const isCorrect = currentQ && currentQ.correct_ans === opt;

    if (isCorrect) {
      const speedBonus = timeLeft > 8 ? 2 : 0;
      setUserScore((s) => s + 10 + speedBonus);
      setUserCombo((c) => c + 1);
    } else {
      setUserCombo(0);
    }

    setTimeout(goToNextQuestion, 1300);
  };

  const goToNextQuestion = () => {
    if (currentIndex + 1 < battleQuestions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase('result');
    }
  };

  const currentQ = battleQuestions[currentIndex];
  const isWon = userScore > opponentScore;
  const isDraw = userScore === opponentScore;
  const pointsEarned = isWon ? 60 : isDraw ? 25 : 10;

  // 1. MATCHMAKING SCREEN
  if (phase === 'matchmaking') {
    return (
      <div className="fixed inset-0 z-50 bg-[#060B13] text-white flex flex-col items-center justify-between p-6">
        {/* Header */}
        <div className="w-full flex items-center justify-between max-w-md">
          <button
            onClick={onExit}
            className="p-2 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-950/80 border border-purple-500/40 rounded-full text-purple-300 text-xs font-bold">
            <Swords className="w-3.5 h-3.5" />
            <span>লাইভ ১v১ ম্যাচমেকিং</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Radar and Matchup visual */}
        <div className="flex flex-col items-center justify-center my-auto space-y-8 max-w-md w-full">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-white">
              প্রতিদ্বন্দী খোঁজা হচ্ছে...
            </h2>
            <p className="text-xs text-emerald-400 font-medium">{chapterTitle}</p>
          </div>

          <div className="flex items-center justify-around w-full px-4">
            {/* Player 1 (User) */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center space-y-2"
            >
              <div
                className="w-20 h-20 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-500/30 text-white"
                style={{
                  backgroundColor: currentUser?.avatar_bg_color || progress.avatarBgColor || '#059669',
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0) : 'স্বা'}
              </div>
              <span className="font-bold text-sm text-slate-100 max-w-[100px] truncate">
                {currentUser?.name || 'তুমি'}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                You
              </span>
            </motion.div>

            {/* VS Badge */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white font-black text-base shadow-xl border border-white/20"
            >
              VS
            </motion.div>

            {/* Player 2 (Opponent) */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center space-y-2"
            >
              <div
                className="w-20 h-20 rounded-full border-4 border-purple-500 flex items-center justify-center font-bold text-2xl shadow-lg shadow-purple-500/30 text-white"
                style={{ backgroundColor: opponent.avatarBg }}
              >
                {opponent.initial}
              </div>
              <span className="font-bold text-sm text-slate-100 max-w-[100px] truncate">
                {opponent.name}
              </span>
              <span className="text-[10px] text-purple-400 font-bold bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
                {opponent.college}
              </span>
            </motion.div>
          </div>

          {/* Countdown indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-full text-slate-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>ম্যাচ শুরু হচ্ছে {matchmakingCountdown} সেকেন্ডে...</span>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500 max-w-xs pb-4">
          প্রতি সঠিক উত্তরে পাবেন +১০ পয়েন্ট। দ্রুত উত্তরে বোনাস গতি স্কোর!
        </div>
      </div>
    );
  }

  // 2. LIVE BATTLE ARENA
  if (phase === 'battle') {
    return (
      <div className="fixed inset-0 z-50 bg-[#060B13] text-slate-100 flex flex-col justify-between overflow-y-auto">
        {/* Sticky Battle Scoreboard Header */}
        <div className="sticky top-0 z-20 bg-[#09111E]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            {/* User Profile & Score */}
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-emerald-500 shadow-xs"
                style={{
                  backgroundColor: currentUser?.avatar_bg_color || progress.avatarBgColor || '#059669',
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0) : 'স্বা'}
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">তুমি</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-emerald-400 font-mono leading-none">
                    {userScore}
                  </span>
                  {userCombo > 1 && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1 rounded">
                      {userCombo}x Combo
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Central Timer */}
            <div className="flex flex-col items-center justify-center">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-black font-mono text-base border-2 shadow-md transition-colors ${
                  timeLeft <= 5
                    ? 'border-rose-500 bg-rose-950/70 text-rose-300 animate-pulse'
                    : 'border-emerald-500 bg-slate-900 text-emerald-400'
                }`}
              >
                {timeLeft}s
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {currentIndex + 1} / {battleQuestions.length}
              </span>
            </div>

            {/* Opponent Profile & Score */}
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[80px]">
                  {opponent.name}
                </p>
                <div className="flex items-center justify-end gap-1">
                  {opponentCombo > 1 && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-1 rounded">
                      {opponentCombo}x
                    </span>
                  )}
                  <span className="text-lg font-black text-purple-400 font-mono leading-none">
                    {opponentScore}
                  </span>
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-purple-500 shadow-xs"
                style={{ backgroundColor: opponent.avatarBg }}
              >
                {opponent.initial}
              </div>
            </div>
          </div>

          {/* Time Progress Bar */}
          <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${timeLeft <= 5 ? 'bg-rose-500' : 'bg-emerald-400'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 15) * 100}%` }}
              transition={{ ease: 'linear', duration: 1 }}
            />
          </div>
        </div>

        {/* Question Area */}
        <div className="max-w-md mx-auto w-full px-4 py-4 space-y-4 flex-1">
          {currentQ ? (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0E1726] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
            >
              {/* Question Tag */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2.5">
                <span className="font-semibold text-emerald-400">{subjectName}</span>
                <span className="text-slate-500">{currentQ.chapter_name || 'ভর্তি পরীক্ষা'}</span>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-bold text-white leading-relaxed">
                <MathText text={currentQ.question_text} />
              </div>

              {/* MCQ Options A, B, C, D */}
              <div className="space-y-2.5 pt-2">
                {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                  const optText = currentQ.options ? currentQ.options[optKey] : '';
                  const isSelected = selectedOption === optKey;
                  const isCorrect = currentQ.correct_ans === optKey;

                  let btnStyle = 'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-emerald-500/80';
                  if (isAnswerLocked) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                    } else {
                      btnStyle = 'bg-slate-900/40 border-slate-800/40 text-slate-600';
                    }
                  }

                  return (
                    <button
                      key={optKey}
                      disabled={isAnswerLocked}
                      onClick={() => handleSelectOption(optKey)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition-all cursor-pointer select-none active:scale-98 ${btnStyle}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-rose-500 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {optKey}
                      </div>
                      <div className="flex-1 font-medium">
                        <MathText text={optText || ''} />
                      </div>
                      {isAnswerLocked && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {isAnswerLocked && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-10 text-slate-400">প্রশ্ন লোড হচ্ছে...</div>
          )}
        </div>

        {/* Live Opponent Action Status Footer */}
        <div className="bg-[#09111E] border-t border-slate-800/80 px-4 py-2 text-center text-xs text-slate-400">
          {opponentAnsweredState === 'thinking' ? (
            <span className="flex items-center justify-center gap-1.5 text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              {opponent.name} উত্তর ভাবছে...
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold">
              ✓ {opponent.name} উত্তর দিয়েছে!
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. RESULT SCREEN
  return (
    <div className="fixed inset-0 z-50 bg-[#060B13] text-slate-100 flex flex-col items-center justify-between p-6 overflow-y-auto">
      <div className="w-full max-w-md my-auto space-y-6 text-center">
        {/* Victory/Defeat Icon & Title */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="flex flex-col items-center space-y-2"
        >
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-4 ${
              isWon
                ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-amber-500/30'
                : isDraw
                ? 'bg-blue-500/20 border-blue-400 text-blue-400 shadow-blue-500/30'
                : 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-rose-500/30'
            }`}
          >
            {isWon ? (
              <Trophy className="w-12 h-12 stroke-[2.5]" />
            ) : isDraw ? (
              <Shield className="w-12 h-12" />
            ) : (
              <Swords className="w-12 h-12" />
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isWon ? 'অসাধারণ বিজয়!' : isDraw ? 'ম্যাচ ড্র হয়েছে!' : 'ভালো লড়াই করেছ!'}
          </h2>
          <p className="text-xs text-slate-400">{chapterTitle}</p>
        </motion.div>

        {/* Final Score Comparison Card */}
        <div className="bg-[#0E1726] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-around">
            {/* User */}
            <div className="flex flex-col items-center space-y-1">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-emerald-500 shadow-xs"
                style={{
                  backgroundColor: currentUser?.avatar_bg_color || progress.avatarBgColor || '#059669',
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0) : 'স্বা'}
              </div>
              <span className="text-xs font-bold text-slate-200">তুমি</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {userScore}
              </span>
            </div>

            {/* VS */}
            <div className="font-bold text-slate-500 text-sm">VS</div>

            {/* Opponent */}
            <div className="flex flex-col items-center space-y-1">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-purple-500 shadow-xs"
                style={{ backgroundColor: opponent.avatarBg }}
              >
                {opponent.initial}
              </div>
              <span className="text-xs font-bold text-slate-200">{opponent.name}</span>
              <span className="text-2xl font-black text-purple-400 font-mono">
                {opponentScore}
              </span>
            </div>
          </div>

          {/* Reward pill */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 text-xs font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>+{pointsEarned} XP অর্জিত হয়েছে!</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 w-full">
          <button
            onClick={() => {
              onBattleFinished(userScore, isWon, pointsEarned);
              // Restart matching
              setPhase('matchmaking');
              setMatchmakingCountdown(3);
              setCurrentIndex(0);
              setUserScore(0);
              setOpponentScore(0);
              setUserCombo(0);
              setOpponentCombo(0);
            }}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>পুনরায় ব্যাটেল খেলো</span>
          </button>

          <button
            onClick={() => {
              onBattleFinished(userScore, isWon, pointsEarned);
              onExit();
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all cursor-pointer"
          >
            ড্যাশবোর্ডে ফিরে যাও
          </button>
        </div>
      </div>
    </div>
  );
};
