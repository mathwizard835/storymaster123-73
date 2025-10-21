import { Scene } from './story';

export type QuizQuestion = {
  id: string;
  type: 'multiple-choice' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
};

export type QuizSession = {
  storyId: string;
  storyTitle: string;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  score: number;
  totalPoints: number;
  completedAt?: string;
};

const QUIZ_KEY = "smq.quiz";

export const saveQuizResult = (session: QuizSession): void => {
  try {
    const existing = localStorage.getItem(QUIZ_KEY);
    const sessions = existing ? JSON.parse(existing) : [];
    sessions.push(session);
    localStorage.setItem(QUIZ_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save quiz result", e);
  }
};

export const getQuizHistory = (): QuizSession[] => {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load quiz history", e);
    return [];
  }
};

export const calculateQuizScore = (
  questions: QuizQuestion[],
  answers: Record<string, string>
): { score: number; totalPoints: number } => {
  let score = 0;
  let totalPoints = 0;
  
  questions.forEach(q => {
    totalPoints += q.points;
    const userAnswer = answers[q.id];
    if (userAnswer && userAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) {
      score += q.points;
    }
  });
  
  return { score, totalPoints };
};

export const getQuizXPReward = (score: number, totalPoints: number): number => {
  const percentage = (score / totalPoints) * 100;
  let baseXP = score; // 1 XP per point
  
  // Bonus for perfect score
  if (percentage === 100) {
    baseXP += 15;
  }
  
  return baseXP;
};

export const getQuizStats = (): { totalQuizzes: number; averageScore: number; perfectScores: number } => {
  const history = getQuizHistory();
  
  if (history.length === 0) {
    return { totalQuizzes: 0, averageScore: 0, perfectScores: 0 };
  }
  
  const totalScore = history.reduce((sum, session) => {
    const percentage = (session.score / session.totalPoints) * 100;
    return sum + percentage;
  }, 0);
  
  const perfectScores = history.filter(session => session.score === session.totalPoints).length;
  
  return {
    totalQuizzes: history.length,
    averageScore: Math.round(totalScore / history.length),
    perfectScores,
  };
};
