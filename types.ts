
export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  isReal: boolean;
  title: string;
  explanation: string;
  tips: string[];
  category: string; // e.g., "Unnatural Physics", "Deep Fake", "Portrait Photography"
  shortTip?: string; // e.g. "Look at the fingers" (New micro-learning field)
  aiModel?: string; // e.g., "Midjourney v6", "Sora", "DALL-E 3"
  isCustom?: boolean; // Flag to identify user-uploaded content
}

export interface UserAnswer {
  itemId: string;
  guessedReal: boolean;
  isCorrect: boolean;
  timeTaken: number; // milliseconds
  pointsEarned: number;
}

export type GameState = 'WELCOME' | 'PLAYING' | 'RESULTS' | 'REVIEW' | 'ADMIN';

export interface GameDebugConfig {
  initialStreak?: number;
  forceBonusRound?: boolean;
}

export interface GameContextType {
  score: number; // Numeric score (e.g. 1500)
  totalQuestions: number;
  answers: UserAnswer[];
}