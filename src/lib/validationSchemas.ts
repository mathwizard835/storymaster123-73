import { z } from 'zod';

// Age-appropriate content blocking for ages 6-11
// Blocks genuinely harmful content while allowing adventure/fantasy themes
const BLOCKED_PATTERNS = [
  // Sexual content and innuendo
  /\b(sex|sexual|porn|pornography|xxx|nsfw|nude|naked|explicit|seductive)\b/i,
  // Drugs, alcohol, smoking
  /\b(drugs|cocaine|heroin|meth|marijuana|weed|cannabis|alcohol|beer|wine|liquor|drunk|smoking|cigarette|vape|tobacco)\b/i,
  // Graphic violence and gore (but allow fantasy adventure terms)
  /\b(murder|stab|stabbing|bloody|gore|gory|corpse|torture|mutilate|dismember|decapitate)\b/i,
  // Real weapons (but allow fantasy items like sword, shield)
  /\b(gun|guns|firearm|pistol|rifle|explosive|bomb|grenade)\b/i,
  // Hate and discrimination
  /\b(hate|racist|racism|nazi|supremacy|discriminat|bully|bullying|harass|harassment)\b/i,
  // Self-harm and mental health crisis
  /\b(suicide|self-harm|cutting|hanging)\b/i,
  // Gambling and adult themes
  /\b(gambling|casino|betting|adult|mature|18\+|21\+)\b/i,
  // Extreme horror (but allow "scary" and mild spooky themes)
  /\b(terrifying|nightmare|possessed|torture)\b/i,
];

// Content validation function
const validateSafeContent = (value: string): boolean => {
  if (!value || value.trim().length === 0) return true;
  
  const normalized = value.toLowerCase().trim();
  
  // Check against blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;
    }
  }
  
  // Check for suspicious patterns (excessive special characters, URLs, etc.)
  if (/https?:\/\//i.test(normalized)) return false;
  if (/(.)\1{5,}/.test(normalized)) return false; // Repeated characters
  
  return true;
};

// Safe content schema with validation
export const safeContentSchema = z.string()
  .max(500, { message: "Content must be less than 500 characters" })
  .refine(validateSafeContent, {
    message: "Content contains inappropriate or blocked keywords. Please use family-friendly language."
  });

// Common validation patterns
export const emailSchema = z.string()
  .trim()
  .nonempty({ message: "Email cannot be empty" })
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

export const passwordSchema = z.string()
  .min(6, { message: "Password must be at least 6 characters" })
  .max(128, { message: "Password must be less than 128 characters" })
  .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: "Password must contain at least one letter and one number" });

export const deviceIdSchema = z.string()
  .trim()
  .nonempty({ message: "Device ID cannot be empty" })
  .max(255, { message: "Device ID must be less than 255 characters" })
  .regex(/^[a-zA-Z0-9-_]+$/, { message: "Device ID contains invalid characters" });

// Auth form validation
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().nonempty({ message: "Password is required" })
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Referral validation
export const referralCodeSchema = z.string()
  .trim()
  .nonempty({ message: "Referral code cannot be empty" })
  .length(8, { message: "Referral code must be exactly 8 characters" })
  .regex(/^[A-Z0-9]+$/, { message: "Invalid referral code format" });

// Waitlist validation
export const waitlistSchema = z.object({
  email: emailSchema,
  device_id: deviceIdSchema,
  referral_code: referralCodeSchema.optional()
});

// Story generation validation
export const storyGenerationSchema = z.object({
  profile: z.object({
    age: z.number().min(6).max(11).optional(),
    reading: z.enum(['Apprentice', 'Adventurer', 'Hero']).optional(),
    selectedBadges: z.array(z.string()).max(10).optional(),
    interests: z.string().max(500).optional(),
    mode: z.enum(['Thrill', 'Comedy', 'Mystery', 'Explore', 'Learning']).optional(),
    storyLength: z.enum(['short', 'medium', 'epic']).optional(),
    topic: z.string().max(200).optional(),
    inventory: z.array(z.object({
      id: z.string(),
      name: z.string().max(100),
      type: z.string().max(50)
    })).max(50).optional()
  }).optional(),
  scene: z.any().optional(), // Scene structure is complex, basic validation only
  scene_count: z.number().min(1).max(15).optional(),
  max_tokens: z.number().min(100).max(4000).optional(),
  megastory: z.boolean().optional()
});

// Profile setup validation
export const profileSetupSchema = z.object({
  name: z.string().max(50).optional().refine(
    (val) => !val || validateSafeContent(val),
    { message: "Inappropriate content detected in name" }
  ),
  age: z.number().min(6).max(11),
  reading: z.enum(['Apprentice', 'Adventurer', 'Hero']),
  selectedBadges: z.array(z.string()).min(1).max(5),
  interests: safeContentSchema.optional().or(z.literal('')),
  mode: z.enum(['Thrill', 'Comedy', 'Mystery', 'Explore', 'Learning']),
  storyLength: z.enum(['short', 'medium', 'epic']),
  topic: safeContentSchema.optional().or(z.literal(''))
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ReferralCodeData = z.infer<typeof referralCodeSchema>;
export type WaitlistData = z.infer<typeof waitlistSchema>;
export type StoryGenerationData = z.infer<typeof storyGenerationSchema>;
export type ProfileSetupData = z.infer<typeof profileSetupSchema>;