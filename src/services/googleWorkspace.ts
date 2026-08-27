import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UniversityInfo } from '../types';

// Scopes required for Calendar and Tasks
export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
];

// Initialize Firebase App safely (singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
GOOGLE_WORKSPACE_SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory access token storage (Mandated by workspace skill)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleAuthState {
  user: FirebaseUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

// Initialize Auth Listener
export const initGoogleAuth = (
  onSuccess?: (user: FirebaseUser, token: string) => void,
  onFailure?: () => void
) => {
  try {
    return onAuthStateChanged(
      auth,
      async (user: FirebaseUser | null) => {
        try {
          if (user && cachedAccessToken) {
            if (onSuccess) onSuccess(user, cachedAccessToken);
          } else {
            if (!isSigningIn) {
              cachedAccessToken = null;
              if (onFailure) onFailure();
            }
          }
        } catch (innerErr) {
          console.warn('Google auth state change error handled:', innerErr);
        }
      },
      (error) => {
        console.warn('Google Auth state listener error caught (closing/hidden/offline):', error);
        if (onFailure) onFailure();
      }
    );
  } catch (err) {
    console.warn('Failed to initialize Google Auth listener:', err);
    return () => {};
  }
};

// Sign in with Google Popup
export const signInWithGoogleWorkspace = async (): Promise<{
  user: FirebaseUser;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google OAuth Access Token পাওয়া যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface SyncAdmissionEventResult {
  universityId: string;
  name: string;
  examEventId?: string;
  deadlineEventId?: string;
  success: boolean;
  error?: string;
}

// Default admission dates map for standard universities
export const ADMISSION_CALENDAR_SCHEDULES = [
  {
    id: 'du_a',
    name: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট (DU Science)",
    shortName: 'DU Ka Unit',
    examDate: '2026-12-15',
    examTimeStart: '10:00:00',
    examTimeEnd: '11:30:00',
    applicationDeadline: '2026-11-20',
    description: `📌 ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট (বিজ্ঞান অনুষদ) ভর্তি পরীক্ষা ২০২৬-২৭
• মোট নম্বর: ১০০ (MCQ ৬০ + লিখিত ৪০)
• সময়: ১ ঘণ্টা ৩০ মিনিট
• নেগেটিভ মার্কিং: ০.২৫
• বিষয়সমূহ: পদার্থবিজ্ঞান, রসায়ন, উচ্চতর গণিত, জীববিজ্ঞান/বাংলা/ইংরেজি
• প্রস্তুতি ট্র্যাক করুন: PrepTest Varsity AI অ্যাপ`,
    location: 'University of Dhaka, Nilkhet, Dhaka-1000',
  },
  {
    id: 'buet',
    name: 'বুয়েট ভর্তি পরীক্ষা (BUET Engineering)',
    shortName: 'BUET Admission',
    examDate: '2027-01-20',
    examTimeStart: '09:00:00',
    examTimeEnd: '12:00:00',
    applicationDeadline: '2026-12-10',
    description: `🚀 বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (BUET) স্নাতক ভর্তি পরীক্ষা ২০২৬-২৭
• মোট নম্বর: ৪০০
• সময়: ৩ ঘণ্টা (প্রিলিমিনারি ও মূল লিখিত)
• ক্যালকুলেটর: অনুমোদিত সায়েন্টিফিক মডেল
• বিষয়সমূহ: উচ্চতর গণিত, পদার্থবিজ্ঞান ও রসায়ন
• নো-ক্যালকুলেটর শর্টকাট ও ট্রিকস চর্চা করুন PrepTest AI অ্যাপে`,
    location: 'BUET Campus, Palashi, Dhaka-1000',
  },
  {
    id: 'medical',
    name: 'মেডিকেল ভর্তি পরীক্ষা (Medical MBBS)',
    shortName: 'Medical MBBS',
    examDate: '2027-02-05',
    examTimeStart: '10:00:00',
    examTimeEnd: '11:00:00',
    applicationDeadline: '2027-01-10',
    description: `🩺 সরকারি ও বেসরকারি মেডিকেল কলেজ সমূহের MBBS ভর্তি পরীক্ষা ২০২৬-২৭
• মোট নম্বর: ১০০ (MCQ)
• সময়: ১ ঘণ্টা (৬০ মিনিট)
• বিষয়বণ্টন: জীববিজ্ঞান (৩০), রসায়ন (২৫), পদার্থবিজ্ঞান (২০), ইংরেজি (১৫), সাধারণ জ্ঞান (১০)
• নেগেটিভ মার্কিং: ০.২৫ (ক্যালকুলেটর ব্যবহার নিষিদ্ধ)
• মক টেস্ট দিন: PrepTest AI প্র্যাকটিস প্ল্যাটফর্ম`,
    location: 'Selected Medical Exam Centers Nationwide',
  },
  {
    id: 'bup_fst',
    name: 'বিইউপি ভর্তি পরীক্ষা (BUP FST)',
    shortName: 'BUP FST',
    examDate: '2026-12-12',
    examTimeStart: '10:00:00',
    examTimeEnd: '11:00:00',
    applicationDeadline: '2026-11-15',
    description: `🛡️ বাংলাদেশ ইউনিভার্সিটি অব প্রফেশনালস (BUP) বিজ্ঞান ও প্রযুক্তি অনুষদ ভর্তি পরীক্ষা
• বিষয়: পদার্থবিজ্ঞান, গণিত, রসায়ন, ইংরেজি
• সময়: ৬০ মিনিট
• PrepTest AI স্পেশাল মক টেস্ট সম্পন্ন করুন।`,
    location: 'BUP Campus, Mirpur Cantonment, Dhaka',
  },
  {
    id: 'gst_a',
    name: "জিএসটি ২৪ বিশ্ববিদ্যালয় গুচ্ছ 'ক' ইউনিট (GST A Unit)",
    shortName: 'GST A Unit',
    examDate: '2027-03-10',
    examTimeStart: '11:00:00',
    examTimeEnd: '12:00:00',
    applicationDeadline: '2027-02-15',
    description: `🏛️ ২৪টি সাধারণ এবং বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়ের সমন্বিত গুচ্ছ ভর্তি পরীক্ষা
• মোট নম্বর: ১০০ MCQ
• সময়: ১ ঘণ্টা
• বিষয়সমূহ: পদার্থবিজ্ঞান (২৫), রসায়ন (২৫), গণিত/জীববিজ্ঞান (২৫+২৫)`,
    location: 'Designated University Centers Across Bangladesh',
  },
];

/**
 * Syncs admission dates and application deadlines to user's Google Calendar
 */
export const syncAdmissionDatesToCalendar = async (
  token: string,
  selectedIds?: string[]
): Promise<SyncAdmissionEventResult[]> => {
  const itemsToSync = selectedIds && selectedIds.length > 0
    ? ADMISSION_CALENDAR_SCHEDULES.filter((s) => selectedIds.includes(s.id))
    : ADMISSION_CALENDAR_SCHEDULES;

  const results: SyncAdmissionEventResult[] = [];

  for (const schedule of itemsToSync) {
    try {
      // 1. Create Exam Day Event
      const examEventBody = {
        summary: `🎯 [ভর্তি পরীক্ষা] ${schedule.name}`,
        description: schedule.description,
        location: schedule.location,
        start: {
          dateTime: `${schedule.examDate}T${schedule.examTimeStart}+06:00`,
          timeZone: 'Asia/Dhaka',
        },
        end: {
          dateTime: `${schedule.examDate}T${schedule.examTimeEnd}+06:00`,
          timeZone: 'Asia/Dhaka',
        },
        colorId: '11', // Red/Tomato in Google Calendar for high priority
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 * 7 }, // 1 week before
            { method: 'popup', minutes: 1440 }, // 1 day before
            { method: 'popup', minutes: 120 }, // 2 hours before
          ],
        },
      };

      const examRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(examEventBody),
        }
      );

      const examData = await examRes.json();

      // 2. Create Application Deadline Event
      const deadlineEventBody = {
        summary: `⏰ [আবেদনের শেষ তারিখ] ${schedule.shortName} আবেদন ফর্ম সাবমিশন`,
        description: `⚠️ সতর্কবার্তা: আজ ${schedule.name} এর অনলাইন আবেদন ফি ও ফর্ম জমার শেষ সময়। দ্রুত সম্পন্ন করুন!\nPrepTest AI ড্যাশবোর্ড থেকে প্রস্তুতি যাচাই করুন।`,
        start: {
          date: schedule.applicationDeadline,
        },
        end: {
          date: schedule.applicationDeadline,
        },
        colorId: '5', // Yellow/Banana in Google Calendar for deadlines
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 * 3 }, // 3 days before
            { method: 'popup', minutes: 1440 }, // 1 day before
          ],
        },
      };

      const deadlineRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(deadlineEventBody),
        }
      );

      const deadlineData = await deadlineRes.json();

      results.push({
        universityId: schedule.id,
        name: schedule.name,
        examEventId: examData.id,
        deadlineEventId: deadlineData.id,
        success: !!examData.id,
      });
    } catch (err: any) {
      console.error(`Failed to sync calendar for ${schedule.name}:`, err);
      results.push({
        universityId: schedule.id,
        name: schedule.name,
        success: false,
        error: err.message || 'Error creating event',
      });
    }
  }

  return results;
};

/**
 * Creates a task in Google Tasks
 */
export const addTaskToGoogleTasks = async (
  token: string,
  taskData: {
    title: string;
    notes?: string;
    due?: string; // ISO 8601 string
  }
): Promise<{ success: boolean; task?: any; error?: string }> => {
  try {
    // 1. Get user's default task list
    let taskListId = '@default';

    // 2. Post task
    const taskPayload = {
      title: taskData.title,
      notes: taskData.notes || '',
      due: taskData.due || undefined,
    };

    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskPayload),
      }
    );

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Failed to create Google Task');
    }

    const createdTask = await res.json();
    return { success: true, task: createdTask };
  } catch (error: any) {
    console.error('Google Tasks error:', error);
    return { success: false, error: error.message || 'Could not add to Google Tasks' };
  }
};

/**
 * Helper to prepare Keep Note / Clipboard / Quick Keep Launch
 */
export const createKeepNotePayload = (
  title: string,
  content: string
): { title: string; text: string; keepUrl: string } => {
  const formattedText = `${title}\n\n${content}\n\n— সংরক্ষিত PrepTest AI এডমিশন মেন্টর থেকে`;
  // Google Keep web compose link
  const keepUrl = `https://keep.google.com/#create/${encodeURIComponent(title)}`;
  return {
    title,
    text: formattedText,
    keepUrl,
  };
};
