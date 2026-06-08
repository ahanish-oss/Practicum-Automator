/**
 * Authentication and User Management
 * All data stored in browser localStorage
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface DocumentHistory {
  id: string;
  userId: string;
  documentName: string;
  timestamp: string;
  formValues: Record<string, string | any[]>;
  sections: any[];
}

const USERS_KEY = 'practicum_users';
const CURRENT_USER_KEY = 'practicum_current_user';
const HISTORY_KEY = 'practicum_history';

// User Management
export const createUser = (email: string, password: string, name: string): User => {
  const users = getUsers();
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    throw new Error('User with this email already exists');
  }

  const user: User = {
    id: generateId(),
    email,
    name,
    createdAt: new Date().toISOString()
  };

  // Store password hash (simple encoding for demo - in production use proper hashing)
  const credentials = getCredentials();
  credentials[email] = btoa(password); // Base64 encode
  localStorage.setItem('practicum_credentials', JSON.stringify(credentials));

  // Save user
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  return user;
};

export const loginUser = (email: string, password: string): User => {
  const users = getUsers();
  const credentials = getCredentials();

  const user = users.find(u => u.email === email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const storedPassword = credentials[email];
  if (!storedPassword || atob(storedPassword) !== password) {
    throw new Error('Invalid email or password');
  }

  setCurrentUser(user);
  return user;
};

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

const getUsers = (): User[] => {
  const usersStr = localStorage.getItem(USERS_KEY);
  if (!usersStr) return [];
  try {
    return JSON.parse(usersStr);
  } catch {
    return [];
  }
};

const getCredentials = (): Record<string, string> => {
  const credStr = localStorage.getItem('practicum_credentials');
  if (!credStr) return {};
  try {
    return JSON.parse(credStr);
  } catch {
    return {};
  }
};

// Document History Management
export const saveDocumentHistory = (
  userId: string,
  documentName: string,
  formValues: Record<string, string | any[]>,
  sections: any[]
) => {
  const history = getDocumentHistory(userId);
  
  const entry: DocumentHistory = {
    id: generateId(),
    userId,
    documentName,
    timestamp: new Date().toISOString(),
    formValues,
    sections
  };

  history.push(entry);
  
  // Keep only last 50 documents per user
  const userHistory = history.filter(h => h.userId === userId).slice(-50);
  const otherHistory = history.filter(h => h.userId !== userId);
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...otherHistory, ...userHistory]));
};

export const getDocumentHistory = (userId: string): DocumentHistory[] => {
  const historyStr = localStorage.getItem(HISTORY_KEY);
  if (!historyStr) return [];
  
  try {
    const allHistory: DocumentHistory[] = JSON.parse(historyStr);
    return allHistory.filter(h => h.userId === userId).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    return [];
  }
};

export const deleteHistoryEntry = (entryId: string) => {
  const historyStr = localStorage.getItem(HISTORY_KEY);
  if (!historyStr) return;
  
  try {
    const history: DocumentHistory[] = JSON.parse(historyStr);
    const filtered = history.filter(h => h.id !== entryId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete history entry:', e);
  }
};

export const clearUserHistory = (userId: string) => {
  const historyStr = localStorage.getItem(HISTORY_KEY);
  if (!historyStr) return;
  
  try {
    const history: DocumentHistory[] = JSON.parse(historyStr);
    const filtered = history.filter(h => h.userId !== userId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
};

// Utility
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
