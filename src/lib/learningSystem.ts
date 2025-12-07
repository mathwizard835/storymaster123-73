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
  const normalizedTopic = topic.toLowerCase();
  
  // Age-appropriate math challenges
  const mathChallenges: LearningChallenge[] = age >= 10 ? [
    {
      id: 'math-1',
      type: 'multiple-choice',
      concept: 'Equations',
      difficulty: 3,
      question: 'What are the roots of x² - 5x + 6 = 0?',
      options: ['x = 2, 3', 'x = 1, 6', 'x = -2, -3', 'x = 5, 6'],
      correctAnswer: 'x = 2, 3',
      explanation: 'We can factor this as (x-2)(x-3) = 0, so x = 2 or x = 3',
      hint: 'Try to factor the expression first!',
      points: 15
    },
    {
      id: 'math-2',
      type: 'input',
      concept: 'Algebra',
      difficulty: 2,
      question: 'Solve for x: 3x + 9 = 24',
      correctAnswer: '5',
      explanation: '3x = 24 - 9 = 15, so x = 15/3 = 5',
      hint: 'First subtract 9 from both sides',
      points: 10
    },
    {
      id: 'math-3',
      type: 'multiple-choice',
      concept: 'Fractions',
      difficulty: 2,
      question: 'What is 3/4 + 1/2?',
      options: ['1 1/4', '4/6', '1', '5/4'],
      correctAnswer: '1 1/4',
      explanation: '3/4 + 2/4 = 5/4 = 1 1/4',
      hint: 'Convert to the same denominator first',
      points: 10
    }
  ] : [
    {
      id: 'math-young-1',
      type: 'multiple-choice',
      concept: 'Addition',
      difficulty: 1,
      question: 'What is 7 + 8?',
      options: ['14', '15', '16', '13'],
      correctAnswer: '15',
      explanation: '7 + 8 = 15. You can count up from 7: 8, 9, 10, 11, 12, 13, 14, 15!',
      hint: 'Count up 8 from 7',
      points: 5
    },
    {
      id: 'math-young-2',
      type: 'multiple-choice',
      concept: 'Subtraction',
      difficulty: 1,
      question: 'What is 20 - 7?',
      options: ['13', '12', '14', '11'],
      correctAnswer: '13',
      explanation: '20 - 7 = 13',
      hint: 'Count down 7 from 20',
      points: 5
    },
    {
      id: 'math-young-3',
      type: 'multiple-choice',
      concept: 'Multiplication',
      difficulty: 2,
      question: 'What is 6 × 4?',
      options: ['24', '20', '28', '22'],
      correctAnswer: '24',
      explanation: '6 × 4 = 24. Think of 4 groups of 6!',
      hint: 'Count 6 four times',
      points: 8
    }
  ];

  // Science challenges
  const scienceChallenges: LearningChallenge[] = [
    {
      id: 'sci-1',
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
      explanation: 'This is an acid-base reaction that produces carbon dioxide bubbles!',
      points: 10
    },
    {
      id: 'sci-2',
      type: 'multiple-choice',
      concept: 'Solar System',
      difficulty: 1,
      question: 'Which planet is closest to the Sun?',
      options: ['Mercury', 'Venus', 'Earth', 'Mars'],
      correctAnswer: 'Mercury',
      explanation: 'Mercury is the closest planet to the Sun, followed by Venus, Earth, and Mars.',
      hint: 'It\'s named after the speedy Roman messenger god',
      points: 5
    },
    {
      id: 'sci-3',
      type: 'multiple-choice',
      concept: 'Biology',
      difficulty: 2,
      question: 'What do plants need to make their own food?',
      options: ['Sunlight, water, and carbon dioxide', 'Just water', 'Soil only', 'Air only'],
      correctAnswer: 'Sunlight, water, and carbon dioxide',
      explanation: 'Plants use photosynthesis to turn sunlight, water, and CO₂ into food!',
      points: 10
    }
  ];

  // Reading/vocabulary challenges
  const readingChallenges: LearningChallenge[] = [
    {
      id: 'read-1',
      type: 'multiple-choice',
      concept: 'Vocabulary',
      difficulty: 2,
      question: 'What does "enormous" mean?',
      options: ['Very large', 'Very small', 'Very fast', 'Very old'],
      correctAnswer: 'Very large',
      explanation: 'Enormous means extremely large or huge.',
      points: 5
    },
    {
      id: 'read-2',
      type: 'multiple-choice',
      concept: 'Synonyms',
      difficulty: 2,
      question: 'Which word means the same as "happy"?',
      options: ['Joyful', 'Sad', 'Angry', 'Tired'],
      correctAnswer: 'Joyful',
      explanation: 'Joyful is a synonym for happy - they mean the same thing!',
      points: 5
    }
  ];

  // Logic/puzzle challenges
  const logicChallenges: LearningChallenge[] = [
    {
      id: 'logic-1',
      type: 'multiple-choice',
      concept: 'Patterns',
      difficulty: 2,
      question: 'What comes next: 2, 4, 6, 8, __?',
      options: ['10', '9', '12', '7'],
      correctAnswer: '10',
      explanation: 'The pattern adds 2 each time, so 8 + 2 = 10',
      hint: 'Look at how much each number increases',
      points: 8
    },
    {
      id: 'logic-2',
      type: 'multiple-choice',
      concept: 'Problem Solving',
      difficulty: 3,
      question: 'If you have 3 apples and get 2 more each day, how many do you have after 3 days?',
      options: ['9', '8', '6', '11'],
      correctAnswer: '9',
      explanation: 'Start with 3, add 2 each day: 3 + 2 + 2 + 2 = 9',
      hint: 'Add 2 three times to your starting amount',
      points: 10
    }
  ];

  // Return challenges based on topic
  if (normalizedTopic.includes('math') || normalizedTopic.includes('algebra') || 
      normalizedTopic.includes('number') || normalizedTopic.includes('equation')) {
    return mathChallenges;
  }
  if (normalizedTopic.includes('science') || normalizedTopic.includes('chemistry') || 
      normalizedTopic.includes('biology') || normalizedTopic.includes('physics') ||
      normalizedTopic.includes('space') || normalizedTopic.includes('nature')) {
    return scienceChallenges;
  }
  if (normalizedTopic.includes('reading') || normalizedTopic.includes('vocabulary') ||
      normalizedTopic.includes('english') || normalizedTopic.includes('language')) {
    return readingChallenges;
  }
  if (normalizedTopic.includes('logic') || normalizedTopic.includes('puzzle') ||
      normalizedTopic.includes('problem')) {
    return logicChallenges;
  }
  
  // Default: return a mix of challenges for general topics
  return [
    mathChallenges[0] || mathChallenges[1],
    scienceChallenges[1],
    readingChallenges[0],
    logicChallenges[0]
  ].filter(Boolean) as LearningChallenge[];
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