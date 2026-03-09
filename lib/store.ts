// API-based store - replaces localStorage with database-backed API calls
// All functions are async and make HTTP requests to the API routes

import { Contest, Category, Participant, Photo, Vote, User } from '@/types';

const API_BASE = '/api';

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = error.error || `HTTP error! status: ${response.status}`;
      console.error(`API call failed: ${endpoint}`, { status: response.status, error: errorMessage });
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error: any) {
    console.error(`API call error for ${endpoint}:`, error);
    throw error;
  }
}

// User operations
export async function registerUser(email: string, password: string, name: string): Promise<User> {
  return apiCall<User>('/users/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  try {
    console.log('Calling login API for:', email);
    const user = await apiCall<User>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    console.log('Login successful, user:', user);
    return user;
  } catch (error: any) {
    console.error('Login API error:', error);
    if (error.message.includes('401') || error.message.includes('Invalid')) {
      console.log('Returning null for invalid credentials');
      return null;
    }
    console.error('Re-throwing error:', error);
    throw error;
  }
}

export async function getUser(id: string): Promise<User | undefined> {
  try {
    return await apiCall<User>(`/users/${id}`);
  } catch (error) {
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  // Note: This endpoint doesn't exist yet, but we can implement it if needed
  // For now, we'll need to handle this differently
  throw new Error('getUserByEmail not implemented via API');
}

// Contest operations
export async function createContest(contest: Omit<Contest, 'id' | 'createdAt' | 'joinCode' | 'creatorId'> & { creatorId?: string }): Promise<Contest> {
  return apiCall<Contest>('/contests', {
    method: 'POST',
    body: JSON.stringify({
      location: contest.location,
      date: contest.date,
      status: contest.status || 'draft',
      creatorId: contest.creatorId,
    }),
  });
}

export async function getContest(id: string): Promise<Contest | undefined> {
  try {
    return await apiCall<Contest>(`/contests/${id}`);
  } catch (error) {
    return undefined;
  }
}

export async function getAllContests(): Promise<Contest[]> {
  try {
    return await apiCall<Contest[]>('/contests');
  } catch (error) {
    return [];
  }
}

export async function updateContest(id: string, updates: Partial<Contest>): Promise<Contest | null> {
  try {
    return await apiCall<Contest>(`/contests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    return null;
  }
}

export async function deleteContest(id: string): Promise<boolean> {
  try {
    await apiCall(`/contests/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Category operations
export async function addCategory(contestId: string, category: Omit<Category, 'id' | 'contestId' | 'createdAt'>): Promise<Category> {
  return apiCall<Category>(`/contests/${contestId}/categories`, {
    method: 'POST',
    body: JSON.stringify({
      name: category.name,
      description: category.description,
    }),
  });
}

export async function updateCategory(contestId: string, categoryId: string, updates: Partial<Category>): Promise<Category | null> {
  try {
    return await apiCall<Category>(`/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    return null;
  }
}

export async function deleteCategory(contestId: string, categoryId: string): Promise<boolean> {
  try {
    await apiCall(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Join contest with join code
export async function joinContestWithCode(userId: string, joinCode: string): Promise<Participant> {
  return apiCall<Participant>('/contests/join', {
    method: 'POST',
    body: JSON.stringify({ userId, joinCode }),
  });
}

export async function getParticipantByUserId(userId: string, contestId: string): Promise<Participant | undefined> {
  try {
    return await apiCall<Participant>(`/participants/by-user/${userId}/${contestId}`);
  } catch (error) {
    return undefined;
  }
}

export async function getContestsForUser(userId: string): Promise<Contest[]> {
  try {
    return await apiCall<Contest[]>(`/users/${userId}/contests`);
  } catch (error) {
    return [];
  }
}

export async function getContestsCreatedByUser(userId: string): Promise<Contest[]> {
  try {
    return await apiCall<Contest[]>(`/users/${userId}/contests/created`);
  } catch (error) {
    console.error('Error fetching created contests:', error);
    return [];
  }
}

// Photo operations
export async function addPhoto(photo: Omit<Photo, 'id' | 'createdAt'>): Promise<Photo> {
  return apiCall<Photo>('/photos', {
    method: 'POST',
    body: JSON.stringify(photo),
  });
}

export async function getPhotosByParticipant(participantId: string): Promise<Photo[]> {
  try {
    return await apiCall<Photo[]>(`/photos?participantId=${participantId}`);
  } catch (error) {
    return [];
  }
}

export async function getPhotosByCategory(categoryId: string): Promise<Photo[]> {
  try {
    return await apiCall<Photo[]>(`/photos?categoryId=${categoryId}`);
  } catch (error) {
    return [];
  }
}

export async function getPhotosByParticipantAndCategory(participantId: string, categoryId: string): Promise<Photo[]> {
  try {
    return await apiCall<Photo[]>(`/photos?participantId=${participantId}&categoryId=${categoryId}`);
  } catch (error) {
    return [];
  }
}

export async function updatePhoto(id: string, updates: Partial<Photo>): Promise<Photo | null> {
  try {
    return await apiCall<Photo>(`/photos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<boolean> {
  try {
    await apiCall(`/photos/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Vote operations
export async function addVote(vote: Omit<Vote, 'id' | 'createdAt'>): Promise<Vote> {
  return apiCall<Vote>('/votes', {
    method: 'POST',
    body: JSON.stringify(vote),
  });
}

export async function getVotesByCategory(categoryId: string): Promise<Vote[]> {
  try {
    return await apiCall<Vote[]>(`/votes?categoryId=${categoryId}`);
  } catch (error) {
    return [];
  }
}

export async function getVotesByCategoryAndRank(categoryId: string, rank: number): Promise<Vote[]> {
  try {
    const votes = await apiCall<Vote[]>(`/votes?categoryId=${categoryId}`);
    return votes.filter(v => v.rank === rank);
  } catch (error) {
    return [];
  }
}

export async function hasVoted(voterId: string, categoryId: string): Promise<boolean> {
  try {
    const votes = await apiCall<Vote[]>(`/votes?voterId=${voterId}&categoryId=${categoryId}`);
    return votes.length > 0;
  } catch (error) {
    return false;
  }
}

export async function hasVotedForRank(voterId: string, categoryId: string, rank: number): Promise<boolean> {
  try {
    const votes = await getVotesByCategoryAndRank(categoryId, rank);
    return votes.some(v => v.voterId === voterId);
  } catch (error) {
    return false;
  }
}

export async function getVoteByVoterAndCategory(voterId: string, categoryId: string): Promise<Vote | undefined> {
  try {
    const votes = await apiCall<Vote[]>(`/votes?voterId=${voterId}&categoryId=${categoryId}`);
    return votes[0];
  } catch (error) {
    return undefined;
  }
}

export async function getVoteByVoterCategoryAndRank(voterId: string, categoryId: string, rank: number): Promise<Vote | undefined> {
  try {
    const votes = await getVotesByCategoryAndRank(categoryId, rank);
    return votes.find(v => v.voterId === voterId);
  } catch (error) {
    return undefined;
  }
}

export async function deleteParticipant(contestId: string, participantId: string): Promise<boolean> {
  try {
    await apiCall(`/participants/${participantId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Legacy functions for compatibility (these may not be needed)
export async function getParticipant(id: string): Promise<Participant | undefined> {
  // This would require a new API endpoint
  throw new Error('getParticipant by ID not implemented - use getParticipantByUserId instead');
}
