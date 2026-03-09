export interface Contest {
  id: string;
  location: string;
  date: string; // Format: "YYYY-MM" (month/year)
  createdAt: string;
  categories: Category[];
  participants: Participant[];
  status: 'draft' | 'active' | 'voting' | 'completed';
  joinCode: string; // 4-digit alphanumeric code to join the contest
  creatorId?: string | null; // User who created the contest
}

export interface Category {
  id: string;
  contestId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // Hashed password
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  contestId: string;
  userId: string; // Links to User account
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  contestId: string;
  categoryId: string;
  participantId: string;
  url: string; // Base64 or URL
  fileName: string;
  rank?: number; // Ranking within category (1 = best)
  submitted: boolean; // Whether this is the final submission
  createdAt: string;
}

export interface Vote {
  id: string;
  contestId: string;
  categoryId: string;
  voterId: string; // Participant who voted
  photoId: string; // Photo they voted for
  rank: number; // 1 for 1st place, 2 for 2nd place (honorable mention)
  createdAt: string;
}

