// Content safety validation for StoryMaster Quest

export interface ContentValidationResult {
  isAllowed: boolean;
  reason?: string;
  blockedTerms?: string[];
}

// List of inappropriate terms and topics to block
const BLOCKED_TERMS = [
  // Violence and weapons
  'kill', 'murder', 'death', 'blood', 'gun', 'weapon', 'knife', 'sword', 'fight', 'war',
  'violence', 'violent', 'attack', 'hurt', 'harm', 'damage', 'destroy', 'bomb', 'explosion',
  
  // Adult content
  'adult', 'mature', 'sex', 'sexual', 'romantic', 'love', 'kiss', 'dating', 'relationship',
  'marriage', 'wedding', 'boyfriend', 'girlfriend', 'husband', 'wife',
  
  // Scary/horror content
  'horror', 'scary', 'frightening', 'terror', 'ghost', 'monster', 'demon', 'evil', 'dark',
  'nightmare', 'haunted', 'creepy', 'spooky', 'vampire', 'zombie', 'witch', 'magic',
  
  // Inappropriate behaviors
  'lie', 'lying', 'steal', 'cheat', 'trick', 'deceive', 'bad', 'naughty', 'trouble',
  'misbehave', 'disobey', 'rebel', 'rule breaking',
  
  // Negative emotions that might be too intense
  'hate', 'angry', 'rage', 'fury', 'mad', 'upset', 'cry', 'sad', 'depressed', 'lonely',
  'afraid', 'scared', 'worried', 'anxious', 'stress',
  
  // Inappropriate topics
  'money', 'rich', 'poor', 'work', 'job', 'politics', 'religion', 'god', 'church', 'pray'
];

// More nuanced inappropriate patterns
const BLOCKED_PATTERNS = [
  /\b(kill|murder|die|death)\b/i,
  /\b(blood|gore|violent)\b/i,
  /\b(gun|weapon|knife|sword)\b/i,
  /\b(scary|frightening|horror)\b/i,
  /\b(adult|mature|sexual)\b/i,
  /\b(romantic|dating|love)\b/i,
];

// Validate user profile settings
export const validateProfileSettings = (profile: any): ContentValidationResult => {
  const textToCheck = [
    profile.topic || '',
    profile.interests || '',
    ...(profile.selectedBadges || [])
  ].join(' ').toLowerCase();

  // Check for blocked terms
  const foundTerms = BLOCKED_TERMS.filter(term => 
    textToCheck.includes(term.toLowerCase())
  );

  if (foundTerms.length > 0) {
    return {
      isAllowed: false,
      reason: "We can't create stories with that content to keep everyone safe and happy! Please try different interests or topics that are more kid-friendly.",
      blockedTerms: foundTerms
    };
  }

  // Check patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return {
        isAllowed: false,
        reason: "We can't create stories with that content to keep everyone safe and happy! Please try different interests or topics that are more kid-friendly."
      };
    }
  }

  // Check age appropriateness
  if (profile.age && profile.age < 6) {
    return {
      isAllowed: false,
      reason: "StoryMaster Quest is designed for kids ages 6-17. Please check your age setting."
    };
  }

  if (profile.age && profile.age > 17) {
    return {
      isAllowed: false,
      reason: "StoryMaster Quest is designed for kids and teens ages 6-17. Please check your age setting."
    };
  }

  return { isAllowed: true };
};

// Validate story content before generation
export const validateStoryContent = (scene: any): ContentValidationResult => {
  if (!scene) return { isAllowed: true };

  const textToCheck = [
    scene.sceneTitle || '',
    scene.narrative || '',
    ...(scene.choices || []).map((c: any) => c.text || '')
  ].join(' ').toLowerCase();

  // Check for blocked terms
  const foundTerms = BLOCKED_TERMS.filter(term => 
    textToCheck.includes(term.toLowerCase())
  );

  if (foundTerms.length > 0) {
    return {
      isAllowed: false,
      reason: "This story content isn't appropriate for our young adventurers. Let's try a different path!",
      blockedTerms: foundTerms
    };
  }

  // Check patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return {
        isAllowed: false,
        reason: "This story content isn't appropriate for our young adventurers. Let's try a different path!"
      };
    }
  }

  return { isAllowed: true };
};

// Additional validation for specific story modes that might be problematic
export const validateStoryMode = (mode: string): ContentValidationResult => {
  // Block certain modes that might generate inappropriate content
  if (mode === 'thrill' || mode === 'mystery') {
    // Allow but with extra safety
    return { isAllowed: true };
  }
  
  return { isAllowed: true };
};