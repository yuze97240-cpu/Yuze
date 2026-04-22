/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: any;
}

export interface Thought {
  id?: string;
  userId: string;
  content: string;
  sentiment: string;
  imagery: string[];
  createdAt: any;
}

export interface PoetryMatch {
  id?: string;
  thoughtId: string;
  poetryTitle: string;
  author: string;
  dynasty: string;
  content: string;
  background: string;
  matchReason: string;
  createdAt: any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
