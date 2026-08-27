import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  CarouselItem,
  CarouselSettings,
  CarouselTheme,
  CarouselTextSize,
  CarouselItemType,
} from '../types';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  update,
  remove,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  DataSnapshot,
  off,
} from 'firebase/database';

// ==========================================
// FIREBASE HELPER: REMOVE UNDEFINED PROPERTIES
// ==========================================

/**
 * Recursively cleans an object to ensure no `undefined` values are sent to Firebase RTDB
 */
export function sanitizeFirebasePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeFirebasePayload(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirebasePayload(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export type { FirebaseUser, ConfirmationResult };
export { RecaptchaVerifier };

// User's provided Firebase configuration for PrepTest
export const firebaseConfig = {
  apiKey: "AIzaSyAyYdu_2_OcXlIAl9EFn0a2mx3G09lCuyc",
  authDomain: "preptest-335c0.firebaseapp.com",
  databaseURL: "https://preptest-335c0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "preptest-335c0",
  storageBucket: "preptest-335c0.firebasestorage.app",
  messagingSenderId: "933264598560",
  appId: "1:933264598560:web:0d218cb8aa89721170be45",
  measurementId: "G-XH4KB0SGQD"
};

// Initialize Firebase safely (avoid multi-initialization)
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseRtdb = getDatabase(firebaseApp);

// Configure Auth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

// ==========================================
// 1. FIREBASE AUTHENTICATION METHODS
// ==========================================

/**
 * Sign in with Google Popup via Firebase
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return result.user;
}

/**
 * Sign in with Facebook Popup via Firebase
 */
export async function signInWithFacebook(): Promise<FirebaseUser> {
  const result = await signInWithPopup(firebaseAuth, facebookProvider);
  return result.user;
}

/**
 * Sign in with Email and Password via Firebase
 */
export async function signInWithEmailPassword(email: string, pass: string): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(firebaseAuth, email, pass);
  return result.user;
}

/**
 * Sign up with Email and Password via Firebase
 */
export async function signUpWithEmailPassword(email: string, pass: string): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
  return result.user;
}

/**
 * Sign in as Guest / Anonymous user
 */
export async function signInAsGuest(): Promise<FirebaseUser> {
  const result = await signInAnonymously(firebaseAuth);
  return result.user;
}

/**
 * Send password reset email
 */
export async function sendResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

/**
 * Sign out from Firebase
 */
export async function signOutFirebase(): Promise<void> {
  await fbSignOut(firebaseAuth);
}

/**
 * Create a reCAPTCHA verifier for Phone OTP
 */
export function initPhoneRecaptcha(containerId: string): RecaptchaVerifier {
  if (typeof document !== 'undefined') {
    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = '';
    }
  }
  return new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired, please retry OTP');
    },
  });
}

/**
 * Send Phone OTP via Firebase
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  let formatted = phoneNumber.trim().replace(/[\s-]/g, '');
  if (!formatted.startsWith('+')) {
    if (formatted.startsWith('01')) {
      formatted = `+88${formatted}`;
    } else if (formatted.startsWith('8801')) {
      formatted = `+${formatted}`;
    } else {
      formatted = `+880${formatted.replace(/^0+/, '')}`;
    }
  }
  return await signInWithPhoneNumber(firebaseAuth, formatted, appVerifier);
}

/**
 * Get current Firebase Auth user ID Token for secure backend verification
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

// ==========================================
// 2. REALTIME DATABASE: PRESENCE & ACTIVE USERS
// ==========================================

export interface UserPresenceData {
  userId: string;
  name: string;
  phone?: string;
  college?: string;
  targetUniversity?: string;
  targetUnit?: string;
  avatar?: string;
  avatarColor?: string;
  currentPage?: string;
  device?: string;
  points?: number;
  online: boolean;
  lastActive: any;
  joinedAt?: number;
}

/**
 * Set current user online in Firebase Realtime Database with automatic onDisconnect cleanup
 */
export function setUserOnline(userData: Partial<UserPresenceData> & { userId: string; name: string }): () => void {
  if (!userData.userId) return () => {};

  try {
    const userPresenceRef = ref(firebaseRtdb, `presence/${userData.userId}`);
    const connectedRef = ref(firebaseRtdb, '.info/connected');

    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Set offline status on disconnect automatically
        onDisconnect(userPresenceRef).update({
          online: false,
          lastActive: serverTimestamp(),
        });

        // Set online status now
        set(userPresenceRef, sanitizeFirebasePayload({
          userId: userData.userId,
          name: userData.name || 'শিক্ষার্থী',
          phone: userData.phone || '',
          college: userData.college || 'ঢাকা কলেজ',
          targetUniversity: userData.targetUniversity || 'du_a',
          avatar: userData.avatar || '🧑‍🎓',
          avatarColor: userData.avatarColor || '#2563eb',
          currentPage: userData.currentPage || 'হোমপেজ',
          device: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') : 'Web',
          points: userData.points || 50,
          online: true,
          lastActive: serverTimestamp(),
          joinedAt: Date.now(),
        }));
      }
    });

    return () => {
      unsubscribeConnected();
      // Set to offline when component unmounts
      update(userPresenceRef, {
        online: false,
        lastActive: serverTimestamp(),
      }).catch(() => {});
    };
  } catch (err) {
    console.warn('[RTDB Presence Warn]:', err);
    return () => {};
  }
}

/**
 * Update current page / status of online user
 */
export function updateUserCurrentPage(userId: string, pageName: string) {
  if (!userId) return;
  try {
    const userPresenceRef = ref(firebaseRtdb, `presence/${userId}`);
    update(userPresenceRef, {
      currentPage: pageName,
      lastActive: serverTimestamp(),
    }).catch(() => {});
  } catch (_) {}
}

/**
 * Subscribe to all Active / Online Users in Firebase Realtime Database
 */
export function subscribeActiveUsers(callback: (users: UserPresenceData[]) => void): () => void {
  try {
    const presenceRef = ref(firebaseRtdb, 'presence');
    const unsubscribe = onValue(presenceRef, (snapshot: DataSnapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const usersList: UserPresenceData[] = Object.values(val);
      // Sort: online users first, then by lastActive
      usersList.sort((a, b) => {
        if (a.online === b.online) {
          const aTime = typeof a.lastActive === 'number' ? a.lastActive : 0;
          const bTime = typeof b.lastActive === 'number' ? b.lastActive : 0;
          return bTime - aTime;
        }
        return a.online ? -1 : 1;
      });
      callback(usersList);
    }, (error) => {
      console.warn('[RTDB Active Users Subscribe Error]:', error);
      callback([]);
    });

    return () => unsubscribe();
  } catch (err) {
    console.warn('[RTDB Subscribe Active Users Warn]:', err);
    return () => {};
  }
}

// ==========================================
// 3. REALTIME DATABASE: LIVE LEADERBOARD
// ==========================================

export interface RealtimeLeaderboardEntry {
  userId: string;
  name: string;
  college: string;
  targetUniversity: string;
  avatar: string;
  avatarColor: string;
  points: number;
  accuracy: number;
  examsCompleted: number;
  streakDays: number;
  updatedAt: any;
  rank?: number;
  isOnline?: boolean;
}

export type LeaderboardUserEntry = RealtimeLeaderboardEntry;

/**
 * Sync user's score to Firebase Realtime Database Leaderboard
 */
export async function syncLeaderboardScore(entry: Omit<RealtimeLeaderboardEntry, 'updatedAt'>): Promise<void> {
  if (!entry.userId) return;
  try {
    const leaderRef = ref(firebaseRtdb, `leaderboard/${entry.userId}`);
    await set(leaderRef, {
      ...entry,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[RTDB Sync Leaderboard Warn]:', err);
  }
}

/**
 * Subscribe to Live Leaderboard in Firebase Realtime Database
 */
export function subscribeRealtimeLeaderboard(callback: (leaderboard: RealtimeLeaderboardEntry[]) => void): () => void {
  try {
    const leaderboardRef = query(ref(firebaseRtdb, 'leaderboard'), limitToLast(50));
    const unsubscribe = onValue(leaderboardRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const list: RealtimeLeaderboardEntry[] = Object.values(val);
      // Sort by points descending, then by accuracy
      list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.accuracy || 0) - (a.accuracy || 0);
      });
      // Assign ranks
      list.forEach((item, idx) => {
        item.rank = idx + 1;
      });
      callback(list);
    }, (err) => {
      console.warn('[RTDB Leaderboard Error]:', err);
      callback([]);
    });

    return () => unsubscribe();
  } catch (err) {
    console.warn('[RTDB Subscribe Leaderboard Warn]:', err);
    return () => {};
  }
}

// ==========================================
// 4. REALTIME DATABASE: 1 VS 1 BATTLE ARENA
// ==========================================

export interface BattlePlayerState {
  userId: string;
  name: string;
  college: string;
  targetUni: string;
  avatar: string;
  avatarColor: string;
  score: number;
  combo: number;
  currentQuestionIndex: number;
  answers: Record<number, { selected: string; isCorrect: boolean; timeTaken: number }>;
  isFinished: boolean;
  lastPing: number;
}

export interface LiveBattleRoom {
  battleId: string;
  subjectId: string;
  subjectName: string;
  chapterTitle: string;
  status: 'waiting' | 'in_progress' | 'completed';
  createdAt: number;
  players: Record<string, BattlePlayerState>;
  questionIds?: string[];
  winnerId?: string | null;
}

/**
 * Matchmaking & Room Management for 1vs1 Live Battle
 */
export async function matchOrJoinBattleRoom(
  player: {
    userId: string;
    name: string;
    college: string;
    targetUni: string;
    avatar: string;
    avatarColor: string;
  },
  subjectId: string,
  subjectName: string,
  chapterTitle: string,
  questionIds: string[]
): Promise<{ battleId: string; isHost: boolean }> {
  try {
    const queueRef = ref(firebaseRtdb, `battle_queue/${subjectId}`);
    const queueSnap = await get(queueRef);
    const queueData = queueSnap.val() || {};

    const now = Date.now();
    // Find active waiting room within 15 seconds
    let foundRoomId: string | null = null;

    for (const [rId, rData] of Object.entries<any>(queueData)) {
      if (rData && rData.hostId !== player.userId && now - (rData.createdAt || 0) < 15000) {
        foundRoomId = rId;
        break;
      }
    }

    if (foundRoomId) {
      // Join existing room
      const battleRef = ref(firebaseRtdb, `battles/${foundRoomId}`);
      await update(ref(firebaseRtdb, `battles/${foundRoomId}/players/${player.userId}`), {
        userId: player.userId,
        name: player.name,
        college: player.college,
        targetUni: player.targetUni,
        avatar: player.avatar,
        avatarColor: player.avatarColor,
        score: 0,
        combo: 0,
        currentQuestionIndex: 0,
        answers: {},
        isFinished: false,
        lastPing: Date.now(),
      });
      await update(battleRef, { status: 'in_progress' });
      // Remove from queue
      await remove(ref(firebaseRtdb, `battle_queue/${subjectId}/${foundRoomId}`));

      return { battleId: foundRoomId, isHost: false };
    } else {
      // Create new room
      const newBattleId = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const battleRef = ref(firebaseRtdb, `battles/${newBattleId}`);

      const initialRoom: LiveBattleRoom = {
        battleId: newBattleId,
        subjectId,
        subjectName,
        chapterTitle,
        status: 'waiting',
        createdAt: Date.now(),
        questionIds,
        players: {
          [player.userId]: {
            userId: player.userId,
            name: player.name,
            college: player.college,
            targetUni: player.targetUni,
            avatar: player.avatar,
            avatarColor: player.avatarColor,
            score: 0,
            combo: 0,
            currentQuestionIndex: 0,
            answers: {},
            isFinished: false,
            lastPing: Date.now(),
          },
        },
      };

      await set(battleRef, initialRoom);
      // Post to queue
      await set(ref(firebaseRtdb, `battle_queue/${subjectId}/${newBattleId}`), {
        hostId: player.userId,
        createdAt: Date.now(),
      });

      return { battleId: newBattleId, isHost: true };
    }
  } catch (err) {
    console.warn('[RTDB Battle Match Warn]:', err);
    const fallbackId = `battle_local_${Date.now()}`;
    return { battleId: fallbackId, isHost: true };
  }
}

/**
 * Submit live answer in 1v1 Battle
 */
export async function submitLiveBattleMove(
  battleId: string,
  userId: string,
  questionIdx: number,
  selected: string,
  isCorrect: boolean,
  currentScore: number,
  currentCombo: number,
  isFinished = false
) {
  try {
    const playerRef = ref(firebaseRtdb, `battles/${battleId}/players/${userId}`);
    await update(playerRef, {
      score: currentScore,
      combo: currentCombo,
      currentQuestionIndex: questionIdx + 1,
      isFinished,
      lastPing: Date.now(),
      [`answers/${questionIdx}`]: {
        selected,
        isCorrect,
        timeTaken: Date.now(),
      },
    });
  } catch (err) {
    console.warn('[RTDB Submit Battle Move Warn]:', err);
  }
}

/**
 * Subscribe to Real-time 1v1 Battle Room state
 */
export function subscribeBattleRoom(battleId: string, callback: (room: LiveBattleRoom | null) => void): () => void {
  try {
    const battleRef = ref(firebaseRtdb, `battles/${battleId}`);
    const unsubscribe = onValue(battleRef, (snapshot) => {
      const data = snapshot.val();
      callback(data || null);
    });

    return () => unsubscribe();
  } catch (err) {
    console.warn('[RTDB Subscribe Battle Warn]:', err);
    return () => {};
  }
}

/**
 * Leave Battle and clean up queue/presence
 */
export async function leaveBattleRoom(battleId: string, userId: string, subjectId?: string) {
  try {
    if (subjectId) {
      await remove(ref(firebaseRtdb, `battle_queue/${subjectId}/${battleId}`)).catch(() => {});
    }
    await update(ref(firebaseRtdb, `battles/${battleId}/players/${userId}`), {
      isFinished: true,
      lastPing: Date.now(),
    }).catch(() => {});
  } catch (_) {}
}

// ==========================================
// 5. REALTIME DATABASE: ADMIN NOTIFICATIONS BROADCAST
// ==========================================

export interface AdminBroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  targetAudience?: string; // 'all' | 'science' | 'hsc26'
  actionLink?: string;
  actionText?: string;
  createdAt: number;
  sentBy?: string;
  expiresAt?: number;
}

/**
 * Send Broadcast Notification from Admin Panel to all active students
 */
export async function sendAdminBroadcastNotification(
  notification: Omit<AdminBroadcastNotification, 'id' | 'createdAt'>
): Promise<string> {
  const notifRef = ref(firebaseRtdb, 'notifications/broadcasts');
  const newNotifRef = push(notifRef);
  const id = newNotifRef.key || `notif_${Date.now()}`;

  const payload: AdminBroadcastNotification = {
    id,
    title: (notification.title || '').trim(),
    message: (notification.message || '').trim(),
    type: notification.type || 'info',
    targetAudience: notification.targetAudience || 'all',
    actionLink: notification.actionLink?.trim() || '',
    actionText: notification.actionText?.trim() || '',
    sentBy: notification.sentBy || 'PrepTest Admin',
    createdAt: Date.now(),
  };

  const safePayload = sanitizeFirebasePayload(payload);

  await set(newNotifRef, safePayload);
  // Also update latest notification pointer for fast user triggers
  await set(ref(firebaseRtdb, 'notifications/latest'), safePayload);

  return id;
}

/**
 * Subscribe to Admin Broadcast Notifications for Students / User App
 */
export function subscribeAdminNotifications(callback: (notifications: AdminBroadcastNotification[]) => void): () => void {
  try {
    const notifRef = query(ref(firebaseRtdb, 'notifications/broadcasts'), limitToLast(20));
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const list: AdminBroadcastNotification[] = Object.values(val);
      // Sort newest first
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    }, (err) => {
      console.warn('[RTDB Notifications Error]:', err);
      callback([]);
    });

    return () => unsubscribe();
  } catch (err) {
    console.warn('[RTDB Subscribe Notifications Warn]:', err);
    return () => {};
  }
}

/**
 * Delete a Broadcast Notification (Admin Only)
 */
export async function deleteAdminNotification(id: string): Promise<void> {
  try {
    await remove(ref(firebaseRtdb, `notifications/broadcasts/${id}`));
  } catch (err) {
    console.warn('[RTDB Delete Notification Warn]:', err);
  }
}

// ==========================================
// 6. REALTIME DATABASE: KNOWLEDGE CAROUSEL LIVE SYNC
// ==========================================

export const DEFAULT_CAROUSEL_SETTINGS: CarouselSettings = {
  autoPlay: true,
  intervalSeconds: 7,
  defaultTheme: 'blue_royal',
  defaultTextSize: 'normal',
  showBadge: true,
  showProgressDots: true,
  showNavButtons: true,
  pauseOnHover: true,
  updatedAt: Date.now(),
};

/**
 * Subscribe to Knowledge Carousel Items & Settings in Real-Time
 */
export function subscribeKnowledgeCarousel(
  callback: (data: { items: CarouselItem[]; settings: CarouselSettings }) => void
): () => void {
  try {
    const rootRef = ref(firebaseRtdb, 'knowledge_carousel');

    const unsubscribe = onValue(
      rootRef,
      (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback({ items: [], settings: DEFAULT_CAROUSEL_SETTINGS });
          return;
        }

        const rawSettings = val.settings || {};
        const settings: CarouselSettings = {
          ...DEFAULT_CAROUSEL_SETTINGS,
          ...rawSettings,
        };

        const rawItems = val.items || {};
        const itemsList: CarouselItem[] = Object.values(rawItems);

        // Sort: Pinned first, then by order/createdAt
        itemsList.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (a.order ?? 999) - (b.order ?? 999) || (b.createdAt ?? 0) - (a.createdAt ?? 0);
        });

        callback({ items: itemsList, settings });
      },
      (err) => {
        console.warn('[RTDB Carousel Sync Error]:', err);
        callback({ items: [], settings: DEFAULT_CAROUSEL_SETTINGS });
      }
    );

    return () => unsubscribe();
  } catch (err) {
    console.warn('[RTDB Subscribe Carousel Warn]:', err);
    return () => {};
  }
}

/**
 * Save / Update Global Carousel Settings (Admin)
 */
export async function saveCarouselSettings(
  settings: Partial<CarouselSettings>
): Promise<void> {
  const settingsRef = ref(firebaseRtdb, 'knowledge_carousel/settings');
  const payload = sanitizeFirebasePayload({
    ...DEFAULT_CAROUSEL_SETTINGS,
    ...settings,
    updatedAt: Date.now(),
  });
  await set(settingsRef, payload);
}

/**
 * Save / Update a Single Carousel Item (Admin)
 */
export async function saveCarouselItem(
  item: Partial<CarouselItem> & { content_bn: string }
): Promise<string> {
  const id = item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const itemRef = ref(firebaseRtdb, `knowledge_carousel/items/${id}`);

  const payload: CarouselItem = {
    id,
    type: item.type || 'concept',
    title_bn: (item.title_bn || '').trim(),
    content_bn: (item.content_bn || '').trim(),
    content_latex: (item.content_latex || '').trim(),
    answer_bn: (item.answer_bn || '').trim(),
    subject_id: item.subject_id || '',
    theme: item.theme || 'blue_royal',
    textSize: item.textSize || 'normal',
    customDuration: Number(item.customDuration) > 0 ? Number(item.customDuration) : 0,
    actionButton: {
      enabled: Boolean(item.actionButton?.enabled),
      text: (item.actionButton?.text || '').trim(),
      link: (item.actionButton?.link || '').trim(),
      variant: item.actionButton?.variant || 'primary',
      isExternal: Boolean(item.actionButton?.isExternal),
    },
    pinned: Boolean(item.pinned),
    active: item.active !== false,
    order: Number(item.order) || 0,
    createdAt: item.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  const safePayload = sanitizeFirebasePayload(payload);
  await set(itemRef, safePayload);
  return id;
}

/**
 * Update Partial fields of a Carousel Item
 */
export async function updateCarouselItem(
  id: string,
  updates: Partial<CarouselItem>
): Promise<void> {
  const itemRef = ref(firebaseRtdb, `knowledge_carousel/items/${id}`);
  const safeUpdates = sanitizeFirebasePayload({
    ...updates,
    updatedAt: Date.now(),
  });
  await update(itemRef, safeUpdates);
}

/**
 * Delete a Carousel Item (Admin)
 */
export async function deleteCarouselItem(id: string): Promise<void> {
  await remove(ref(firebaseRtdb, `knowledge_carousel/items/${id}`));
}

/**
 * Toggle Active Status of a Carousel Item (Admin)
 */
export async function toggleCarouselItemStatus(id: string, active: boolean): Promise<void> {
  await update(ref(firebaseRtdb, `knowledge_carousel/items/${id}`), {
    active,
    updatedAt: Date.now(),
  });
}

/**
 * Toggle Pin Status of a Carousel Item (Admin)
 */
export async function toggleCarouselItemPin(id: string, pinned: boolean): Promise<void> {
  await update(ref(firebaseRtdb, `knowledge_carousel/items/${id}`), {
    pinned,
    updatedAt: Date.now(),
  });
}

/**
 * Seed Default Items to Firebase (1-Click Sync)
 */
export async function seedDefaultCarouselToFirebase(defaultItems: any[]): Promise<void> {
  const itemsMap: Record<string, CarouselItem> = {};
  defaultItems.forEach((it, idx) => {
    const id = it.id || `item_seed_${idx + 1}`;
    itemsMap[id] = {
      id,
      type: it.type || 'concept',
      title_bn: it.title_bn || '',
      content_bn: it.content_bn || '',
      content_latex: it.content_latex || '',
      answer_bn: it.answer_bn || '',
      subject_id: it.subject_id || '',
      theme: it.theme || 'blue_royal',
      textSize: it.textSize || 'normal',
      customDuration: 0,
      actionButton: {
        enabled: false,
        text: '',
        link: '',
        variant: 'primary',
        isExternal: false,
      },
      pinned: false,
      active: true,
      order: idx + 1,
      createdAt: Date.now() - (defaultItems.length - idx) * 1000,
      updatedAt: Date.now(),
    };
  });

  const safeMap = sanitizeFirebasePayload(itemsMap);
  await set(ref(firebaseRtdb, 'knowledge_carousel/items'), safeMap);
  await saveCarouselSettings(DEFAULT_CAROUSEL_SETTINGS);
}

