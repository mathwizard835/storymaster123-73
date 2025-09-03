import { LearningConcept } from "@/components/LearningProgress";
import { LearningChallenge } from "@/components/LearningChallenge";

export interface LearningSession {
  id: string;
  topic: string;
  startedAt: string;
  concepts: LearningConcept[];
  challenges: LearningChallenge[];
  totalPoints: number;
  completedChallenges: string[];
}

const LEARNING_STORAGE_KEY = 'smq.learning_progress';

export const saveLearningProgress = (session: LearningSession) => {
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save learning progress:', error);
  }
};

export const loadLearningProgress = (): LearningSession | null => {
  try {
    const saved = localStorage.getItem(LEARNING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load learning progress:', error);
    return null;
  }
};

export const updateConceptMastery = (
  conceptId: string, 
  correct: boolean, 
  session: LearningSession
): LearningSession => {
  const updatedConcepts = session.concepts.map(concept => {
    if (concept.id === conceptId) {
      const attempts = concept.attempts + 1;
      let mastery = concept.mastery;
      
      if (correct) {
        // Increase mastery based on current level and consistency
        const increase = Math.max(5, Math.min(20, 100 - mastery) / 4);
        mastery = Math.min(100, mastery + increase);
      } else {
        // Slight decrease for incorrect attempts, but not too punishing
        mastery = Math.max(0, mastery - 2);
      }
      
      return {
        ...concept,
        mastery: Math.round(mastery),
        attempts,
        lastPracticed: new Date().toISOString()
      };
    }
    return concept;
  });
  
  return {
    ...session,
    concepts: updatedConcepts
  };
};

export const generateLearningChallenges = (
  topic: string, 
  age: number,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3
): LearningChallenge[] => {
  // This would typically call an AI service to generate contextual challenges
  // For now, return some example challenges based on topic
  
  const mathChallenges: LearningChallenge[] = [
    {
      id: 'quad-1',
      type: 'multiple-choice',
      concept: 'Quadratic Equations',
      difficulty: 3,
      question: 'What are the roots of x² - 5x + 6 = 0?',
      options: ['x = 2, 3', 'x = 1, 6', 'x = -2, -3', 'x = 5, 6'],
      correctAnswer: 'x = 2, 3',
      explanation: 'We can factor this as (x-2)(x-3) = 0, so x = 2 or x = 3',
      hint: 'Try to factor the quadratic expression first!',
      points: 15
    },
    {
      id: 'quad-2',
      type: 'input',
      concept: 'Quadratic Factoring',
      difficulty: 2,
      question: 'Factor x² + 7x + 12',
      correctAnswer: '(x+3)(x+4)',
      explanation: 'We need two numbers that multiply to 12 and add to 7: 3 and 4',
      hint: 'What two numbers multiply to 12 and add to 7?',
      points: 10
    }
  ];

  const scienceChallenges: LearningChallenge[] = [
    {
      id: 'chem-1',
      type: 'multiple-choice',
      concept: 'Chemical Reactions',
      difficulty: 2,
      question: 'What happens when you mix baking soda and vinegar?',
      options: [
        'It creates a fizzy reaction with CO₂ gas',
        'Nothing happens',
        'It creates fire',
        'It makes the mixture very hot'
      ],
      correctAnswer: 'It creates a fizzy reaction with CO₂ gas',
      explanation: 'This is an acid-base reaction: NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂',
      points: 10
    }
  ];

  // Return appropriate challenges based on topic
  if (topic.toLowerCase().includes('math') || topic.toLowerCase().includes('quadratic')) {
    return mathChallenges;
  } else if (topic.toLowerCase().includes('science') || topic.toLowerCase().includes('chemistry')) {
    return scienceChallenges;
  }
  
  return [];
};

export const calculateLearningScore = (session: LearningSession): number => {
  const averageMastery = session.concepts.reduce((sum, concept) => sum + concept.mastery, 0) / 
    Math.max(1, session.concepts.length);
  
  const consistencyBonus = session.concepts.filter(c => c.mastery >= 75).length * 5;
  
  return Math.round(averageMastery + consistencyBonus);
};

export const getNextLearningGoal = (session: LearningSession): string => {
  const weakestConcept = session.concepts
    .filter(c => c.mastery < 75)
    .sort((a, b) => a.mastery - b.mastery)[0];
  
  if (weakestConcept) {
    return `Focus on improving ${weakestConcept.name} (${weakestConcept.mastery}% mastery)`;
  }
  
  return "Great job! You're mastering all concepts. Ready for advanced challenges?";
};