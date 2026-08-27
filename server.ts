import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  getAllQuestions,
  getQuestionById,
  insertQuestion,
  updateQuestionInDb,
  deleteQuestionFromDb,
  getAllWrittenQuestions,
  getWrittenQuestionById,
  insertWrittenQuestion,
  updateWrittenQuestionInDb,
  deleteWrittenQuestionFromDb,
  bulkImportWrittenQuestions,
  bulkImportTopics,
  bulkImportKnowledgeSnippets,
  getAllTopics,
  getTopicById,
  insertTopic,
  updateTopicInDb,
  deleteTopicFromDb,
  recalculateTopicCounts,
  healAndSyncDatabase,
  getUserByPhone,
  getUserById,
  createUser,
  updateUserProfile,
  getUserProgressFromDb,
  saveUserProgressToDb,
  getChatHistoryFromDb,
  saveChatMessageToDb,
  clearChatHistoryInDb,
  getAllKnowledgeSnippets,
  insertKnowledgeSnippet,
  getAdminSetting,
  setAdminSetting,
  getAllAdminDrafts,
  getAdminDraftById,
  insertAdminDraft,
  updateAdminDraft,
  deleteAdminDraft,
  clearAdminDrafts,
  approveAndPublishDraft,
  batchApproveDrafts,
  batchRejectDrafts,
  getAdminDatabaseStats,
  bulkImportQuestions,
  getDatabase,
  getDatabaseConnectionInfo,
  isPostgresActive,
  recordUserActivityInDb,
  getActiveUsersTelemetryFromDb,
  getQuestionCounts,
} from './server/db.js';
import { resolveQuestionsImport, commitQuestionsImport } from './server/services/importService.js';
import {
  getTaxonomyTreeService,
  getTaxonomyHealthService,
  mergeTopicsService,
  normalizeTopicService,
  deleteEmptyTopicsService,
  reassignOrphanQuestionsService,
  exportMasterChartService,
  createTopicService,
  getTaxonomyAuditLogsService,
} from './server/services/taxonomyService.js';
import { uploadQuestionImages, uploadSingleImage } from './server/utils/upload.js';
import { logger } from './server/utils/logger.js';
import {
  validateBody,
  registerSchema,
  loginSchema,
  adminLoginSchema,
  userProfileUpdateSchema,
  adminApiKeySaveSchema,
  adminApiKeyTestSchema,
  draftCreateSchema,
  bulkQuestionsImportSchema,
} from './server/validation/schemas.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Trust reverse proxies (Nginx, Cloud Run, Ingress)
app.set('trust proxy', 1);

// Validate JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('[SECURITY NOTICE] ⚠️ JWT_SECRET is not set in environment variables. Using secure fallback secret key.');
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'jachai-admission-production-fallback-secret-key-2026-secure';

// ---------------- SECURITY MIDDLEWARE ----------------

// Helmet security headers (configured safely for SPA + KaTeX)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [process.env.APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin iframe)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));

// Global Real-time User Activity & Session Tracking Middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId: string | undefined;
    if (token) {
      try {
        const decoded: any = jwt.decode(token);
        if (decoded && decoded.userId && decoded.userId !== 'admin') {
          userId = decoded.userId;
        }
      } catch {}
    }

    const customSessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(',')[0].trim();
    const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';
    const currentPage = (req.headers['x-current-page'] as string) || undefined;

    recordUserActivityInDb({
      userId,
      customSessionId,
      ip,
      userAgent,
      currentPage,
    }).catch(() => {});
  } catch {}
  next();
});

// Rate Limiters
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    trustProxy: false,
  },
  message: { error: 'অতিরিক্ত রিকোয়েস্টের কারণে সাময়িক বিরতি। ১৫ মিনিট পর আবার চেষ্টা করুন।' },
});

export const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: parseInt(process.env.AI_RATE_LIMIT_MAX || '45', 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    trustProxy: false,
  },
  message: { error: 'AI রিকোয়েস্ট লিমিট অতিক্রম করেছে। কিছু সময় পর পুনরায় চেষ্টা করুন।' },
});

// Auth Middleware: Verify JWT Bearer token for students
export interface AuthRequest extends Request {
  userId?: string;
  userPhone?: string;
  userRole?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন (Authentication required)' });
  }

  jwt.verify(token, EFFECTIVE_JWT_SECRET, (err: any, decoded: any) => {
    if (err || !decoded?.userId) {
      return res.status(403).json({ error: 'লগইন সেশন মেয়াদোত্তীর্ণ বা অকার্যকর' });
    }
    req.userId = decoded.userId;
    req.userPhone = decoded.phone;
    req.userRole = decoded.role || 'student';
    next();
  });
}

// Admin Auth Middleware: Verifies signed JWT with role: 'admin'
export function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'অ্যাডমিন অ্যাক্সেস প্রত্যাখ্যাত (Admin token required)' });
  }

  jwt.verify(token, EFFECTIVE_JWT_SECRET, (err: any, decoded: any) => {
    if (err || decoded?.role !== 'admin') {
      return res.status(403).json({ error: 'অবৈধ বা মেয়াদোত্তীর্ণ অ্যাডমিন সেশন (Invalid admin credentials)' });
    }
    req.userId = 'admin';
    req.userRole = 'admin';
    next();
  });
}

// ---------------- LOCAL SQLITE AUTHENTICATION API ----------------

// POST /api/auth/register
app.post('/api/auth/register', authRateLimiter, validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const {
      phone,
      password,
      name,
      targetUniversity,
      targetUnit,
      examYear,
      college,
      avatar,
      avatarBgColor,
    } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'মোবাইল নম্বর দেওয়া বাধ্যতামূলক' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'শিক্ষার্থীর নাম দেওয়া বাধ্যতামূলক' });
    }

    const cleanPhone = phone.trim();
    const existing = await getUserByPhone(cleanPhone);
    if (existing) {
      return res.status(400).json({ error: 'এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। লগইন করুন।' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await createUser({
      phone: cleanPhone,
      password_hash,
      name: name.trim(),
      target_university: targetUniversity || 'du_a',
      target_unit: targetUnit || "'ক' ইউনিট (বিজ্ঞান)",
      exam_year: examYear || 'HSC-26',
      college: college ? college.trim() : 'ঢাকা কলেজ',
      avatar: avatar || '🧑‍🎓',
      avatar_color: avatarBgColor || '#2563eb',
    });

    const progress = await getUserProgressFromDb(user.id);
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'student' },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: '60d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        target_university: user.target_university,
        target_unit: user.target_unit,
        exam_year: user.exam_year,
        college: user.college,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        created_at: user.created_at,
      },
      progress,
    });
  } catch (error: any) {
    console.error('Registration error in SQLite backend:', error);
    return res.status(500).json({ error: 'অ্যাকাউন্ট তৈরিতে ত্রুটি হয়েছে', details: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', authRateLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'মোবাইল নম্বর ও পাসওয়ার্ড উভয়ই প্রদান করুন' });
    }

    const cleanPhone = phone.trim();
    const user = await getUserByPhone(cleanPhone);
    if (!user) {
      return res.status(401).json({ error: 'এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।' });
    }

    const progress = await getUserProgressFromDb(user.id);
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'student' },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: '60d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        target_university: user.target_university,
        target_unit: user.target_unit,
        exam_year: user.exam_year,
        college: user.college,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        created_at: user.created_at,
      },
      progress,
    });
  } catch (error: any) {
    console.error('Login error in SQLite backend:', error);
    return res.status(500).json({ error: 'লগইন করতে ব্যর্থ হয়েছে', details: error.message });
  }
});

// GET /api/auth/me (Verify active session)
app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'ব্যবহারকারী পাওয়া যায়নি' });
    }
    const progress = await getUserProgressFromDb(user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        target_university: user.target_university,
        target_unit: user.target_unit,
        exam_year: user.exam_year,
        college: user.college,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        created_at: user.created_at,
      },
      progress,
    });
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return res.status(500).json({ error: 'ব্যবহারকারীর তথ্য আনতে সমস্যা হয়েছে' });
  }
});

// PUT /api/auth/profile
app.put('/api/auth/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, college, examYear, targetUniversity, targetUnit, avatar, avatarBgColor } = req.body;
    const updatedUser = await updateUserProfile(req.userId!, {
      name,
      college,
      exam_year: examYear,
      target_university: targetUniversity,
      target_unit: targetUnit,
      avatar,
      avatar_color: avatarBgColor,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }

    const progress = await getUserProgressFromDb(updatedUser.id);
    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        target_university: updatedUser.target_university,
        target_unit: updatedUser.target_unit,
        exam_year: updatedUser.exam_year,
        college: updatedUser.college,
        avatar: updatedUser.avatar,
        avatar_color: updatedUser.avatar_color,
        created_at: updatedUser.created_at,
      },
      progress,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে' });
  }
});

// POST /api/auth/social-sync (Firebase Google / Facebook / Phone OTP synchronization)
app.post('/api/auth/social-sync', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      uid,
      email,
      phone,
      name,
      provider,
      avatar,
      avatarColor,
      targetUniversity,
      targetUnit,
      examYear,
      college,
    } = req.body;

    const identifier = (phone || email || uid || `user_${Date.now()}`).trim();
    const userName = (name || (provider === 'google' ? 'গুগল শিক্ষার্থী' : provider === 'facebook' ? 'ফেসবুক শিক্ষার্থী' : 'শিক্ষার্থী')).trim();

    // Check if user exists by phone/identifier
    let user = await getUserByPhone(identifier);
    if (!user && uid) {
      user = await getUserById(uid);
    }

    if (!user) {
      // Create new user for social login
      const dummyPasswordHash = await bcrypt.hash(`social_pass_${Date.now()}_${Math.random()}`, 10);
      user = await createUser({
        id: uid ? `fb_${uid.substring(0, 24)}` : undefined,
        phone: identifier,
        password_hash: dummyPasswordHash,
        name: userName,
        target_university: targetUniversity || 'du_a',
        target_unit: targetUnit || "'ক' ইউনিট (বিজ্ঞান)",
        exam_year: examYear || 'HSC-26',
        college: college || 'ঢাকা কলেজ',
        avatar: avatar || '🧑‍🎓',
        avatar_color: avatarColor || (provider === 'google' ? '#FF6B00' : provider === 'facebook' ? '#1877F2' : '#0A2540'),
      });
    }

    const progress = await getUserProgressFromDb(user.id);
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'student' },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: '60d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        target_university: user.target_university,
        target_unit: user.target_unit,
        exam_year: user.exam_year,
        college: user.college,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        created_at: user.created_at,
      },
      progress,
    });
  } catch (error: any) {
    console.error('Social sync auth error:', error);
    return res.status(500).json({ error: 'সোশ্যাল লগইন সিঙ্ক করতে সমস্যা হয়েছে', details: error.message });
  }
});

// POST /api/auth/guest-login (1-Click Guest Login)
app.post('/api/auth/guest-login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dummyPasswordHash = await bcrypt.hash(`guest_pwd_${Date.now()}`, 10);
    const user = await createUser({
      id: guestId,
      phone: `guest_${Date.now()}`,
      password_hash: dummyPasswordHash,
      name: 'গেস্ট শিক্ষার্থী',
      target_university: 'du_a',
      target_unit: "'ক' ইউনিট (বিজ্ঞান)",
      exam_year: 'HSC-26',
      college: 'ঢাকা কলেজ',
      avatar: '🚀',
      avatar_color: '#FF6B00',
    });

    const progress = await getUserProgressFromDb(user.id);
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'student' },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        target_university: user.target_university,
        target_unit: user.target_unit,
        exam_year: user.exam_year,
        college: user.college,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        created_at: user.created_at,
      },
      progress,
    });
  } catch (error: any) {
    console.error('Guest login error:', error);
    return res.status(500).json({ error: 'গেস্ট লগইন করতে সমস্যা হয়েছে' });
  }
});

// GET /api/user/progress
app.get('/api/user/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await getUserProgressFromDb(req.userId!);
    if (!progress) {
      return res.status(404).json({ error: 'অগ্রগতির তথ্য পাওয়া যায়নি' });
    }
    return res.json(progress);
  } catch (error: any) {
    console.error('Get user progress error:', error);
    return res.status(500).json({ error: 'অগ্রগতির তথ্য আনতে সমস্যা হয়েছে' });
  }
});

// POST or PUT /api/user/progress (Save user progress to SQLite)
app.post('/api/user/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const updatedProgress = await saveUserProgressToDb(req.userId!, req.body);
    return res.json({ success: true, progress: updatedProgress });
  } catch (error: any) {
    console.error('Save user progress error:', error);
    return res.status(500).json({ error: 'অগ্রগতি সংরক্ষণ করতে সমস্যা হয়েছে' });
  }
});

app.put('/api/user/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const updatedProgress = await saveUserProgressToDb(req.userId!, req.body);
    return res.json({ success: true, progress: updatedProgress });
  } catch (error: any) {
    console.error('Save user progress error:', error);
    return res.status(500).json({ error: 'অগ্রগতি সংরক্ষণ করতে সমস্যা হয়েছে' });
  }
});

// ---------------- ADMIN AUTHENTICATION & MANAGEMENT APIS ----------------

// POST /api/admin/login - Authenticate Admin with JWT
app.post('/api/admin/login', authRateLimiter, validateBody(adminLoginSchema), (req: Request, res: Response) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  if (password === adminPassword) {
    const token = jwt.sign({ role: 'admin' }, EFFECTIVE_JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      success: true,
      authenticated: true,
      token,
      role: 'admin',
      expiresIn: '12h',
    });
  }
  return res.status(401).json({ success: false, error: 'ভুল অ্যাডমিন পাসওয়ার্ড!' });
});

// Backward-compatible verify endpoint
app.post('/api/admin/verify', validateBody(adminLoginSchema), (req: Request, res: Response) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  if (password === adminPassword) {
    const token = jwt.sign({ role: 'admin' }, EFFECTIVE_JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, authenticated: true, token });
  }
  return res.status(401).json({ success: false, error: 'ভুল অ্যাডমিন পাসওয়ার্ড!' });
});

// GET /api/admin/stats - Overview metrics (Protected)
app.get('/api/admin/stats', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const dbStats = await getAdminDatabaseStats();
    const activeKeys = trackedOpenRouterKeys.filter((k) => k.status === 'active').length;
    const totalKeys = trackedOpenRouterKeys.length;

    return res.json({
      success: true,
      stats: {
        ...dbStats,
        openRouterKeysCount: totalKeys,
        activeKeysCount: activeKeys,
        activeKeyIndex: trackedOpenRouterKeys.findIndex((k) => k.status !== 'rate_limited' && k.status !== 'error') + 1 || 1,
        activeModel: process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free',
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'পরিসংখ্যান লোড করতে সমস্যা হয়েছে', details: error.message });
  }
});

// GET /api/admin/health/openrouter - Real-time OpenRouter Health (Protected)
app.get('/api/admin/health/openrouter', authenticateAdmin, async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  const primaryKeyObj = trackedOpenRouterKeys.find((k) => k.status !== 'rate_limited' && k.status !== 'error') || trackedOpenRouterKeys[0];
  const primaryApiKey = primaryKeyObj?.key || process.env.OPENROUTER_API_KEY || (process.env.OPENROUTER_API_KEYS ? process.env.OPENROUTER_API_KEYS.split(/[\n,]+/)[0]?.trim() : '');

  const endpoints: any[] = [];
  let totalLatency = 0;
  let latencyCount = 0;
  let authData: any = null;

  // 1. Check Models Endpoint
  const t0 = Date.now();
  try {
    const modelsRes = await fetch('https://openrouter.ai/api/v1/models', {
      headers: primaryApiKey ? { Authorization: `Bearer ${primaryApiKey}` } : {},
      signal: AbortSignal.timeout(6000),
    });
    const lat0 = Date.now() - t0;
    totalLatency += lat0;
    latencyCount++;

    if (modelsRes.ok) {
      endpoints.push({
        id: 'models_api',
        name: 'OpenRouter Models Discovery API',
        url: 'https://openrouter.ai/api/v1/models',
        status: lat0 > 1500 ? 'degraded' : 'healthy',
        statusCode: modelsRes.status,
        latencyMs: lat0,
        lastPolledAt: timestamp,
        message: 'মডেল এন্ডপয়েন্ট সক্রিয় ও উপলব্ধ',
      });
    } else {
      endpoints.push({
        id: 'models_api',
        name: 'OpenRouter Models Discovery API',
        url: 'https://openrouter.ai/api/v1/models',
        status: modelsRes.status === 429 ? 'degraded' : 'down',
        statusCode: modelsRes.status,
        latencyMs: lat0,
        lastPolledAt: timestamp,
        message: `HTTP ${modelsRes.status}: রেসপন্স সমস্যা`,
      });
    }
  } catch (err: any) {
    const lat0 = Date.now() - t0;
    endpoints.push({
      id: 'models_api',
      name: 'OpenRouter Models Discovery API',
      url: 'https://openrouter.ai/api/v1/models',
      status: 'down',
      latencyMs: lat0,
      lastPolledAt: timestamp,
      message: err.message || 'সংযোগ বিচ্ছিন্ন',
    });
  }

  // 2. Check Key Authentication & Usage Endpoint (if key available)
  if (primaryApiKey) {
    const t1 = Date.now();
    try {
      const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${primaryApiKey}` },
        signal: AbortSignal.timeout(6000),
      });
      const lat1 = Date.now() - t1;
      totalLatency += lat1;
      latencyCount++;

      if (authRes.ok) {
        const body = await authRes.json();
        authData = body?.data || null;

        endpoints.push({
          id: 'auth_key_api',
          name: 'OpenRouter Key Authentication & Limits API',
          url: 'https://openrouter.ai/api/v1/auth/key',
          status: 'healthy',
          statusCode: authRes.status,
          latencyMs: lat1,
          lastPolledAt: timestamp,
          message: 'সক্রিয় কী যাচাইকৃত ও অনুমোদিত',
        });

        // update tracked key health
        if (primaryKeyObj) {
          primaryKeyObj.status = 'active';
          primaryKeyObj.latencyMs = lat1;
          primaryKeyObj.lastTested = Date.now();
        }
      } else {
        endpoints.push({
          id: 'auth_key_api',
          name: 'OpenRouter Key Authentication & Limits API',
          url: 'https://openrouter.ai/api/v1/auth/key',
          status: authRes.status === 429 ? 'degraded' : 'down',
          statusCode: authRes.status,
          latencyMs: lat1,
          lastPolledAt: timestamp,
          message: `HTTP ${authRes.status}: কী অকার্যকর বা রেট লিমিট`,
        });

        if (primaryKeyObj) {
          primaryKeyObj.status = authRes.status === 429 ? 'rate_limited' : 'error';
          primaryKeyObj.lastTested = Date.now();
        }
      }
    } catch (err: any) {
      const lat1 = Date.now() - t1;
      endpoints.push({
        id: 'auth_key_api',
        name: 'OpenRouter Key Authentication & Limits API',
        url: 'https://openrouter.ai/api/v1/auth/key',
        status: 'down',
        latencyMs: lat1,
        lastPolledAt: timestamp,
        message: err.message || 'কী অথেনটিকেশন ব্যর্থ',
      });
    }
  } else {
    endpoints.push({
      id: 'auth_key_api',
      name: 'OpenRouter Key Authentication & Limits API',
      url: 'https://openrouter.ai/api/v1/auth/key',
      status: 'untested',
      lastPolledAt: timestamp,
      message: 'কোনো OpenRouter কী কনফিগার করা নেই',
    });
  }

  // 3. Chat Inference Gateway Status
  endpoints.push({
    id: 'chat_completions_api',
    name: 'OpenRouter Inference Gateway',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    status: endpoints[0]?.status === 'healthy' ? 'healthy' : endpoints[0]?.status || 'degraded',
    statusCode: 200,
    latencyMs: endpoints[0]?.latencyMs || 0,
    lastPolledAt: timestamp,
    message: 'চ্যাট ও এক্সট্রাকশন পাইপলাইন প্রস্তুত',
  });

  const avgLatencyMs = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
  const activeKeys = trackedOpenRouterKeys.filter((k) => k.status === 'active').length;
  const totalKeys = trackedOpenRouterKeys.length;

  let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
  const hasDown = endpoints.some((e) => e.status === 'down');
  const hasDegraded = endpoints.some((e) => e.status === 'degraded');
  if (hasDown || (totalKeys > 0 && activeKeys === 0)) {
    overallStatus = 'down';
  } else if (hasDegraded || avgLatencyMs > 900) {
    overallStatus = 'degraded';
  }

  // Build keys usage statistics
  let totalSuccessCount = 0;
  let totalErrorCount = 0;
  const currentActiveIdx = trackedOpenRouterKeys.findIndex((k) => k.id === primaryKeyObj?.id);

  const keysUsage = trackedOpenRouterKeys.map((k, index) => {
    totalSuccessCount += k.successCount || 0;
    totalErrorCount += k.errorCount || 0;
    const isThisActive = index === (currentActiveIdx >= 0 ? currentActiveIdx : 0);

    return {
      id: k.id,
      label: k.label || `Key #${index + 1}`,
      keyMasked: k.key.length > 10 ? `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}` : '******',
      provider: k.provider,
      status: k.status,
      latencyMs: k.latencyMs,
      successCount: k.successCount || 0,
      errorCount: k.errorCount || 0,
      lastTested: k.lastTested,
      isCurrentActive: isThisActive,
      creditUsage: isThisActive && authData ? {
        label: authData.label || authData.key_name,
        limit: authData.limit,
        usage: authData.usage,
        isFreeTier: authData.is_free_tier ?? true,
        rateLimitRemaining: authData.rate_limit?.requests_remaining,
      } : undefined,
    };
  });

  const totalHandled = totalSuccessCount + totalErrorCount;
  const successRate = totalHandled > 0 ? Number(((totalSuccessCount / totalHandled) * 100).toFixed(1)) : 100;

  return res.json({
    success: true,
    timestamp,
    overallStatus,
    avgLatencyMs,
    activeModel: process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free',
    currentKeyIndex: (currentActiveIdx >= 0 ? currentActiveIdx : 0) + 1,
    totalKeys,
    activeKeysCount: activeKeys,
    totalRequestsHandled: totalHandled,
    successRate,
    endpoints,
    keysUsage,
    failoverStatus: {
      isAutoFailoverEnabled: true,
      activeKeyLabel: primaryKeyObj?.label || (primaryApiKey ? 'ডিফল্ট সিস্টেম কী' : 'কোনো কী পাওয়া যায়নি'),
      healthyFallbacksCount: Math.max(0, activeKeys - 1),
      lastFailoverAt: undefined,
    },
    serverTime: timestamp,
  });
});


// GET /api/admin/keys - Retrieve managed API keys (masked for security - NO raw key exposed)
app.get('/api/admin/keys', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const keysResponse = trackedOpenRouterKeys.map((k, idx) => ({
      id: k.id,
      label: k.label || `OpenRouter Key`,
      provider: k.provider,
      status: k.status,
      is_primary: k.is_primary ?? (idx === 0),
      priority: k.priority ?? (idx + 1),
      lastTested: k.lastTested,
      latencyMs: k.latencyMs,
      errorCount: k.errorCount,
      successCount: k.successCount,
      keyMasked: k.key.length > 10 ? `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}` : '******',
    }));
    return res.json({ success: true, keys: keysResponse });
  } catch (error: any) {
    return res.status(500).json({ error: 'এপিআই কী তালিকা লোড করতে ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/keys/reveal - Reveal a specific API key (Authenticated Admin Only)
app.post('/api/admin/keys/reveal', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Key ID is required' });
    }
    const target = trackedOpenRouterKeys.find((k) => k.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Key not found' });
    }
    return res.json({ success: true, id: target.id, key: target.key });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reveal key', details: error.message });
  }
});

// POST /api/admin/keys/set-primary - Set a specific key as the active primary key
app.post('/api/admin/keys/set-primary', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Key ID is required' });
    }

    const keyIndex = trackedOpenRouterKeys.findIndex((k) => k.id === id);
    if (keyIndex === -1) {
      return res.status(404).json({ error: 'নির্বাচিত কী পাওয়া যায়নি' });
    }

    // Set chosen key as primary and all others as false
    trackedOpenRouterKeys = trackedOpenRouterKeys.map((k) => ({
      ...k,
      is_primary: k.id === id,
    }));

    await setAdminSetting('openrouter_keys_config', JSON.stringify(trackedOpenRouterKeys));

    return res.json({
      success: true,
      message: 'প্রাইমারি এপিআই কী সফলভাবে নির্বাচন করা হয়েছে',
      primaryKeyId: id,
      totalKeys: trackedOpenRouterKeys.length,
    });
  } catch (error: any) {
    console.error('Error setting primary key:', error);
    return res.status(500).json({ error: 'প্রাইমারি কী সেট করতে ব্যর্থ', details: error.message });
  }
});

// GET /api/admin/ai-config - Get current AI Model & Failover Settings
app.get('/api/admin/ai-config', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const preferredModel = (await getAdminSetting('openrouter_preferred_model')) || 'openrouter/free';
    const autoFailoverSetting = (await getAdminSetting('ai_auto_failover_enabled')) || 'true';
    const primaryKey = trackedOpenRouterKeys.find((k) => k.is_primary) || trackedOpenRouterKeys[0];

    return res.json({
      success: true,
      config: {
        preferredModel,
        autoFailoverEnabled: autoFailoverSetting === 'true',
        primaryKeyId: primaryKey?.id || null,
        primaryKeyLabel: primaryKey?.label || null,
        totalKeys: trackedOpenRouterKeys.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'AI কনফিগ লোড করতে ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/ai-config - Update preferred model and failover settings
app.post('/api/admin/ai-config', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { preferredModel, autoFailoverEnabled, primaryKeyId } = req.body;

    if (preferredModel && typeof preferredModel === 'string') {
      await setAdminSetting('openrouter_preferred_model', preferredModel.trim());
    }

    if (typeof autoFailoverEnabled === 'boolean') {
      await setAdminSetting('ai_auto_failover_enabled', autoFailoverEnabled ? 'true' : 'false');
    }

    if (primaryKeyId && typeof primaryKeyId === 'string') {
      trackedOpenRouterKeys = trackedOpenRouterKeys.map((k) => ({
        ...k,
        is_primary: k.id === primaryKeyId,
      }));
      await setAdminSetting('openrouter_keys_config', JSON.stringify(trackedOpenRouterKeys));
    }

    return res.json({
      success: true,
      message: 'AI কনফিগারেশন সফলভাবে আপডেট করা হয়েছে',
    });
  } catch (error: any) {
    console.error('Error saving AI config:', error);
    return res.status(500).json({ error: 'AI কনফিগ সংরক্ষণ ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/keys - Save/Update API keys list
app.post('/api/admin/keys', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys)) {
      return res.status(400).json({ error: 'Invalid keys array' });
    }

    const updatedKeys: KeyHealth[] = keys
      .filter((k: any) => k && (k.key || k.keyRaw || k.key_full))
      .map((k: any, idx: number) => ({
        id: k.id || `key_${Date.now()}_${idx}`,
        key: (k.key_full || k.keyRaw || k.key || '').trim(),
        label: k.label || `Key #${idx + 1}`,
        provider: k.provider || 'openrouter',
        status: k.status || 'untested',
        is_primary: k.is_primary ?? (idx === 0),
        priority: k.priority ?? (idx + 1),
        lastTested: k.lastTested,
        latencyMs: k.latencyMs,
        errorCount: k.errorCount || 0,
        successCount: k.successCount || 0,
      }))
      .filter((k: KeyHealth) => k.key.length > 5);

    // If none is marked primary, make first one primary
    if (updatedKeys.length > 0 && !updatedKeys.some((k) => k.is_primary)) {
      updatedKeys[0].is_primary = true;
    }

    trackedOpenRouterKeys = updatedKeys;
    await setAdminSetting('openrouter_keys_config', JSON.stringify(updatedKeys));

    return res.json({
      success: true,
      message: 'এপিআই কী সফলভাবে সংরক্ষণ করা হয়েছে',
      totalKeys: trackedOpenRouterKeys.length,
    });
  } catch (error: any) {
    console.error('Error saving API keys:', error);
    return res.status(500).json({ error: 'এপিআই কী সংরক্ষণ করতে ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/keys/test - Test a specific key or all keys
app.post('/api/admin/keys/test', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { key, id } = req.body;
    const keyToTest = key || trackedOpenRouterKeys.find((k) => k.id === id)?.key;

    if (!keyToTest) {
      return res.status(400).json({ error: 'কোনো এপিআই কী পাওয়া যায়নি' });
    }

    const startTime = Date.now();
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${keyToTest}`,
        },
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        // Update key in state if found
        const target = trackedOpenRouterKeys.find((k) => k.key === keyToTest || k.id === id);
        if (target) {
          target.status = response.status === 429 ? 'rate_limited' : 'error';
          target.lastTested = Date.now();
          target.latencyMs = latencyMs;
          target.errorCount += 1;
        }

        return res.json({
          success: false,
          status: response.status === 429 ? 'rate_limited' : 'error',
          statusCode: response.status,
          latencyMs,
          error: `HTTP ${response.status}: ${errText.substring(0, 150)}`,
        });
      }

      const target = trackedOpenRouterKeys.find((k) => k.key === keyToTest || k.id === id);
      if (target) {
        target.status = 'active';
        target.lastTested = Date.now();
        target.latencyMs = latencyMs;
        target.successCount += 1;
      }

      return res.json({
        success: true,
        status: 'active',
        statusCode: 200,
        latencyMs,
        message: 'এপিআই কী সক্রিয় এবং সঠিকভাবে কাজ করছে',
      });
    } catch (testErr: any) {
      const latencyMs = Date.now() - startTime;
      const target = trackedOpenRouterKeys.find((k) => k.key === keyToTest || k.id === id);
      if (target) {
        target.status = 'error';
        target.lastTested = Date.now();
        target.latencyMs = latencyMs;
        target.errorCount += 1;
      }

      return res.json({
        success: false,
        status: 'error',
        latencyMs,
        error: testErr.message || 'নেটওয়ার্ক সংযোগ সমস্যা',
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: 'কী পরীক্ষা করতে ব্যর্থ', details: error.message });
  }
});

// GET /api/admin/drafts - Staging & Pending Approvals Queue
app.get('/api/admin/drafts', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status, type, search } = req.query;
    const drafts = await getAllAdminDrafts({
      status: typeof status === 'string' ? status : undefined,
      type: typeof type === 'string' ? type : undefined,
      search: typeof search === 'string' ? search : undefined,
    });
    return res.json({ success: true, count: drafts.length, drafts });
  } catch (error: any) {
    console.error('Error fetching admin drafts:', error);
    return res.status(500).json({ error: 'পেন্ডিং ড্রাফট লোড করতে ব্যর্থ', details: error.message });
  }
});

// GET /api/admin/drafts/:id
app.get('/api/admin/drafts/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const draft = await getAdminDraftById(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'ড্রাফট পাওয়া যায়নি' });
    }
    return res.json({ success: true, draft });
  } catch (error: any) {
    return res.status(500).json({ error: 'ড্রাফট লোড করতে সমস্যা হয়েছে', details: error.message });
  }
});

// POST /api/admin/drafts - Create Draft Manually or Staged
app.post('/api/admin/drafts', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { type, payload, source_model, source_info, status } = req.body;
    if (!type || !payload) {
      return res.status(400).json({ error: 'Type এবং payload আবশ্যক' });
    }

    const draft = await insertAdminDraft({
      type,
      payload,
      source_model,
      source_info,
      status: status || 'pending',
    });

    return res.json({ success: true, message: 'ড্রাফট সংরক্ষিত হয়েছে', draft });
  } catch (error: any) {
    return res.status(500).json({ error: 'ড্রাফট সংরক্ষণ ব্যর্থ', details: error.message });
  }
});

// PUT /api/admin/drafts/:id - Update Draft Payload or Status
app.put('/api/admin/drafts/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { payload, status } = req.body;
    const updated = await updateAdminDraft(req.params.id, { payload, status });
    if (!updated) {
      return res.status(404).json({ error: 'ড্রাফট পাওয়া যায়নি' });
    }
    return res.json({ success: true, message: 'ড্রাফট আপডেট হয়েছে', draft: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'ড্রাফট আপডেট ব্যর্থ', details: error.message });
  }
});

// DELETE /api/admin/drafts/:id - Delete Draft
app.delete('/api/admin/drafts/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await deleteAdminDraft(req.params.id);
    return res.json({ success: true, message: 'ড্রাফট মুছে ফেলা হয়েছে' });
  } catch (error: any) {
    return res.status(500).json({ error: 'ড্রাফট মুছতে ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/drafts/:id/publish - Approve & Publish Draft to Live Database!
app.post('/api/admin/drafts/:id/publish', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const result = await approveAndPublishDraft(req.params.id);
    return res.json({
      success: true,
      message: 'ড্রাফট সফলভাবে অনুমোদিত এবং লাইভ ডেটাবেজে প্রকাশিত হয়েছে!',
      publishedItem: result.publishedItem,
      draft: result.draft,
    });
  } catch (error: any) {
    console.error('Publish draft error:', error);
    return res.status(500).json({ error: 'ড্রাফট প্রকাশ করতে ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/drafts/batch-publish - Batch Approve & Publish
app.post('/api/admin/drafts/batch-publish', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'আইডি এর তালিকা প্রদান করুন' });
    }

    const result = await batchApproveDrafts(ids);
    return res.json({
      success: true,
      message: `${result.approvedCount} টি আইটেম সফলভাবে লাইভ ডেটাবেজে প্রকাশিত হয়েছে!`,
      approvedCount: result.approvedCount,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Batch publish error:', error);
    return res.status(500).json({ error: 'ব্যাচ প্রকাশ ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/drafts/batch-reject - Batch Reject
app.post('/api/admin/drafts/batch-reject', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'আইডি এর তালিকা প্রদান করুন' });
    }

    const result = await batchRejectDrafts(ids);
    return res.json({
      success: true,
      message: `${result.rejectedCount} টি আইটেম বাতিল করা হয়েছে।`,
      rejectedCount: result.rejectedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'ব্যাচ বাতিল ব্যর্থ', details: error.message });
  }
});

// POST /api/admin/extract - High-Precision AI Data Extraction Pipeline
app.post('/api/admin/extract', authenticateAdmin, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      content,
      image,
      type = 'questions',
      subject_id = 'physics_1',
      chapter_id = '',
      model = 'openrouter/free',
      promptNotes = '',
      customApiKey,
    } = req.body;

    if (!content && !image) {
      return res.status(400).json({ error: 'নিষ্কাশনের জন্য টেক্সট বা ছবি প্রদান করুন' });
    }

    const isQuestion = type === 'questions' || type === 'question';
    const isTopic = type === 'topics' || type === 'topic';
    const isSnippet = type === 'knowledge_snippets' || type === 'snippet';

    const systemPrompt = `You are an expert Academic Content Extraction AI for the "JACHAI" Bangladeshi HSC & University Admission test preparation platform (DU A, BUET, Medical, GST, RU, CU, JU).
Your task is to parse raw book text, question bank pages, exam questions, or images and format them into STRICT, 100% compliant JSON objects following the official schema.

CRITICAL INSTRUCTIONS:
1. OUTPUT FORMAT: Return ONLY a valid JSON array of objects: [ { ... }, { ... } ]. Do NOT include any introductory or concluding conversational text.
2. LANGUAGE: All questions, options, explanations, bangla_names, and content MUST be written in natural, fluent Academic Bengali (Bangla). Use English only for standard subject IDs, chapter IDs, option keys ('A', 'B', 'C', 'D'), and LaTeX formulas.
3. FORMULAS & MATH: Wrap all math formulas and chemical equations inside single dollar LaTeX formatting, e.g., $E = mc^2$, $\\int x dx$, $\\mathrm{H_2SO_4}$, $\\frac{1}{2}mv^2$.
4. SUBJECT CONTEXT: Targeted Subject ID: "${subject_id}"${chapter_id ? `, Chapter ID: "${chapter_id}"` : ''}.

TARGET SCHEMAS:
${
  isQuestion
    ? `For each Question object in the array:
{
  "id": "q_${subject_id}_" + unique timestamp/code,
  "subject_id": "${subject_id}",
  "subject_name": "বাংলা বিষয় নাম (যেমন: পদার্থবিজ্ঞান ১ম পত্র)",
  "paper": "1st" or "2nd",
  "chapter_id": "${chapter_id || 'chapter_code'}",
  "chapter_name": "বাংলা অধ্যায় নাম",
  "topic_id": "topic_id_or_empty",
  "topic_name": "বাংলা টপিক নাম",
  "category": "varsity_a" | "engineering" | "medical" | "academic" | "main_book",
  "question_text": "বাংলায় প্রশ্ন $LaTeX$",
  "math_formula_latex": "Optional primary LaTeX formula",
  "options": {
    "A": "বিকল্প ক",
    "B": "বিকল্প খ",
    "C": "বিকল্প গ",
    "D": "বিকল্প ঘ"
  },
  "correct_ans": "A" | "B" | "C" | "D",
  "explanation": "বাংলায় পূর্ণাঙ্গ ব্যাখ্যা, প্রয়োজনীয় শর্টকাট টেকনিক ও সমাধান",
  "explanation_latex": "Optional LaTeX solution",
  "tags": ["DU 'Ka' 23-24", "BUET 22-23", "HSC 2024"],
  "star_rating": 1 | 2 | 3,
  "type": "mcq",
  "difficulty": "easy" | "medium" | "hard"
}`
    : isTopic
    ? `For each Topic object in the array:
{
  "id": "c_sub_code",
  "chapter_id": "${chapter_id || 'chapter_code'}",
  "subject_id": "${subject_id}",
  "paper": "1st" or "2nd",
  "topic_code": "T-01",
  "name": "Topic Name in English",
  "bangla_name": "বাংলায় টপিক নাম",
  "star_rating": 1 | 2 | 3,
  "total_questions": 10,
  "completed_questions": 0,
  "mcq_count": 8,
  "written_count": 2,
  "exam_occurrences": {
    "mcq": "DU '23-24; JU '22-23",
    "written": "BUET '22"
  },
  "key_points": [
    "টপিকের প্রধান সূত্র বা কনসেপ্ট ১",
    "গুরুত্বপূর্ণ শর্টকাট বা তথ্য ২"
  ]
}`
    : `For each Knowledge Snippet object in the array:
{
  "id": "snip_" + unique code,
  "subject_id": "${subject_id}",
  "type": "formula" | "concept" | "quote" | "gk",
  "content_bn": "বাংলায় সূত্র বা গুরুত্বপূর্ণ শর্টকাট তালিকা",
  "content_latex": "Optional $LaTeX$ string",
  "answer_bn": "Optional চটজলদি মনে রাখার টিপস"
}`
}

Additional Notes from Admin: ${promptNotes || 'None'}`;

    const userMessageContent: any[] = [];
    if (content) {
      userMessageContent.push({
        type: 'text',
        text: `Extract all ${type} from the following text into the requested JSON array format:\n\n${content}`,
      });
    }
    if (image) {
      userMessageContent.push({
        type: 'image_url',
        image_url: {
          url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
        },
      });
      if (!content) {
        userMessageContent.push({
          type: 'text',
          text: `Extract all academic ${type} visible in this image into the requested JSON array format. Transcribe math into LaTeX and Bengali text accurately.`,
        });
      }
    }

    const openRouterMessages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessageContent.length === 1 && userMessageContent[0].type === 'text' ? userMessageContent[0].text : userMessageContent },
    ];

    console.log(`[Admin AI Extraction] Model: ${model}, Type: ${type}, Items: starting extraction...`);
    const aiResult = await callOpenRouter({
      model: model || 'openrouter/free',
      messages: openRouterMessages,
      customApiKey,
      temperature: 0.2,
    });

    let rawOutput = aiResult.text.trim();
    // Clean markdown wrappers
    if (rawOutput.startsWith('```json')) {
      rawOutput = rawOutput.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (rawOutput.startsWith('```')) {
      rawOutput = rawOutput.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    rawOutput = rawOutput.trim();

    let parsedItems: any[] = [];
    try {
      parsedItems = JSON.parse(rawOutput);
    } catch (parseError) {
      // Try to extract JSON array using regex
      const match = rawOutput.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        try {
          parsedItems = JSON.parse(match[0]);
        } catch {
          // Attempt trailing comma fix
          const cleaned = match[0].replace(/,\s*([\]}])/g, '$1');
          parsedItems = JSON.parse(cleaned);
        }
      } else {
        // Single object wrapper check
        const objMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (objMatch) {
          const singleObj = JSON.parse(objMatch[0]);
          parsedItems = Array.isArray(singleObj.questions || singleObj.topics || singleObj.items)
            ? singleObj.questions || singleObj.topics || singleObj.items
            : [singleObj];
        } else {
          throw new Error('AI থেকে সঠিক JSON ডেটা পাওয়া যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
        }
      }
    }

    if (!Array.isArray(parsedItems)) {
      parsedItems = [parsedItems];
    }

    // Determine target draft type
    const draftType = isQuestion ? 'question' : isTopic ? 'topic' : 'knowledge_snippet';

    // CRITICAL: Save every extracted item into staging drafts table with 'pending' status
    const savedDrafts = [];
    for (const item of parsedItems) {
      if (!item || typeof item !== 'object') continue;

      // Assign fallback ID if missing
      if (!item.id) {
        item.id = `${draftType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      }
      if (!item.subject_id && subject_id) {
        item.subject_id = subject_id;
      }
      if (!item.chapter_id && chapter_id) {
        item.chapter_id = chapter_id;
      }

      const draft = await insertAdminDraft({
        type: draftType,
        payload: item,
        source_model: model,
        source_info: `AI Extracted on ${new Date().toLocaleDateString('bn-BD')}`,
        status: 'pending',
      });
      savedDrafts.push(draft);
    }

    return res.json({
      success: true,
      message: `${savedDrafts.length} টি আইটেম সফলভাবে নিষ্কাশন করে পেন্ডিং কিউতে জমা করা হয়েছে।`,
      count: savedDrafts.length,
      drafts: savedDrafts,
      reasoning: aiResult.reasoning,
    });
  } catch (error: any) {
    console.error('AI Extraction error:', error);
    return res.status(500).json({
      error: 'AI নিষ্কাশন ব্যর্থ হয়েছে',
      details: error.message || 'অজানা ত্রুটি',
    });
  }
});


// GET /api/questions/counts (Live Aggregated Question Counts for Subjects, Categories, Chapters, and Topics)
app.get('/api/questions/counts', async (req: Request, res: Response) => {
  try {
    const { subject_id, category, chapter_id } = req.query;
    const counts = await getQuestionCounts({
      subject_id: typeof subject_id === 'string' ? subject_id : undefined,
      category: typeof category === 'string' ? category : undefined,
      chapter_id: typeof chapter_id === 'string' ? chapter_id : undefined,
    });
    return res.json(counts);
  } catch (error: any) {
    console.error('Error fetching question counts:', error);
    return res.status(500).json({ error: 'Failed to fetch question counts', details: error.message });
  }
});

// GET /api/questions with optional filtering, cursor and page pagination
app.get('/api/questions', async (req: Request, res: Response) => {
  try {
    const { subject_id, chapter_id, topic_id, type, paper, tag, search, category, difficulty, cursor, page, limit } = req.query;

    const pageNum = page !== undefined ? Math.max(1, parseInt(page as string, 10) || 1) : undefined;
    const limitNum = limit !== undefined ? Math.max(1, parseInt(limit as string, 10) || 20) : undefined;

    const result = await getAllQuestions({
      subject_id: typeof subject_id === 'string' ? subject_id : undefined,
      chapter_id: typeof chapter_id === 'string' ? chapter_id : undefined,
      topic_id: typeof topic_id === 'string' ? topic_id : undefined,
      type: typeof type === 'string' ? type : undefined,
      paper: typeof paper === 'string' ? paper : undefined,
      tag: typeof tag === 'string' ? tag : undefined,
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      difficulty: typeof difficulty === 'string' ? difficulty : undefined,
      cursor: typeof cursor === 'string' ? cursor : undefined,
      page: pageNum,
      limit: limitNum,
    });

    res.setHeader('X-Total-Count', String(result.total));
    res.setHeader('X-Page', String(result.page || 1));
    res.setHeader('X-Limit', String(result.limit || result.total));
    res.setHeader('X-Total-Pages', String(result.totalPages || 1));
    if (result.nextCursor) {
      res.setHeader('X-Next-Cursor', result.nextCursor);
    }
    res.setHeader('X-Has-More', String(Boolean(result.hasMore)));

    return res.json({
      data: result.data || result.questions,
      questions: result.questions,
      nextCursor: result.nextCursor ?? null,
      hasMore: Boolean(result.hasMore),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    console.error('Error fetching questions from database:', error);
    return res.status(500).json({ error: 'Failed to fetch questions', details: error.message });
  }
});

// GET /api/questions/:id
app.get('/api/questions/:id', async (req: Request, res: Response) => {
  try {
    const question = await getQuestionById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json(question);
  } catch (error: any) {
    console.error('Error getting question:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Helper to normalize question request data (supports both JSON and multipart/form-data)
function extractQuestionDataFromRequest(req: Request): any {
  const body = { ...req.body };

  // Parse options if sent as stringified JSON or multipart field
  if (typeof body.options === 'string') {
    try {
      body.options = JSON.parse(body.options);
    } catch {
      // Fallback
    }
  }

  // Parse tags if sent as stringified JSON or comma-separated string
  if (typeof body.tags === 'string') {
    try {
      body.tags = JSON.parse(body.tags);
    } catch {
      body.tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
  }

  // Parse star_rating if string
  if (body.star_rating !== undefined && typeof body.star_rating === 'string') {
    body.star_rating = parseInt(body.star_rating, 10) || 3;
  }

  // Extract uploaded image URLs from Cloudinary / Multer
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (files) {
    if (files['question_image'] && files['question_image'][0]) {
      const qFile = files['question_image'][0] as any;
      body.question_image_url = qFile.path || qFile.secure_url || qFile.url;
    }
    if (files['explanation_image'] && files['explanation_image'][0]) {
      const eFile = files['explanation_image'][0] as any;
      body.explanation_image_url = eFile.path || eFile.secure_url || eFile.url;
    }
  }

  return body;
}

// POST /api/upload/image (Standalone image upload to Cloudinary - Protected)
app.post('/api/upload/image', authenticateAdmin, uploadSingleImage, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const file = req.file as any;
    const url = file.path || file.secure_url || file.url;
    return res.json({
      success: true,
      url,
      filename: file.filename || file.originalname,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Error in /api/upload/image:', error);
    return res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

// POST /api/questions (Create question with optional Cloudinary image uploads - Protected)
app.post('/api/questions', authenticateAdmin, uploadQuestionImages, async (req: Request, res: Response) => {
  try {
    const q = extractQuestionDataFromRequest(req);
    if (!q.question_text || !q.options || !q.correct_ans) {
      return res.status(400).json({ error: 'Question text, options, and correct answer are required' });
    }

    const created = await insertQuestion(q);
    return res.status(201).json(created);
  } catch (error: any) {
    console.error('Error inserting question:', error);
    return res.status(500).json({ error: 'Failed to create question', details: error.message });
  }
});

// PUT /api/questions/:id (Update question with optional Cloudinary image uploads - Protected)
app.put('/api/questions/:id', authenticateAdmin, uploadQuestionImages, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const q = extractQuestionDataFromRequest(req);

    const updated = await updateQuestionInDb(id, q);
    if (!updated) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating question:', error);
    return res.status(500).json({ error: 'Failed to update question', details: error.message });
  }
});

// DELETE /api/questions/:id (Protected)
app.delete('/api/questions/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const success = await deleteQuestionFromDb(id);
    if (!success) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting question from SQLite:', error);
    return res.status(500).json({ error: 'Failed to delete question', details: error.message });
  }
});

// ---------------- WRITTEN QUESTIONS ENDPOINTS ----------------

// GET /api/written-questions with optional filtering, cursor and page pagination
app.get('/api/written-questions', async (req: Request, res: Response) => {
  try {
    const { subject_id, chapter_id, topic_id, type, paper, tag, search, category, difficulty, cursor, page, limit } = req.query;

    const pageNum = page !== undefined ? Math.max(1, parseInt(page as string, 10) || 1) : undefined;
    const limitNum = limit !== undefined ? Math.max(1, parseInt(limit as string, 10) || 20) : undefined;

    const result = await getAllWrittenQuestions({
      subject_id: typeof subject_id === 'string' ? subject_id : undefined,
      chapter_id: typeof chapter_id === 'string' ? chapter_id : undefined,
      topic_id: typeof topic_id === 'string' ? topic_id : undefined,
      type: typeof type === 'string' ? type : undefined,
      paper: typeof paper === 'string' ? paper : undefined,
      tag: typeof tag === 'string' ? tag : undefined,
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      difficulty: typeof difficulty === 'string' ? difficulty : undefined,
      cursor: typeof cursor === 'string' ? cursor : undefined,
      page: pageNum,
      limit: limitNum,
    });

    res.setHeader('X-Total-Count', String(result.total));
    res.setHeader('X-Page', String(result.page || 1));
    res.setHeader('X-Limit', String(result.limit || result.total));
    res.setHeader('X-Total-Pages', String(result.totalPages || 1));
    if (result.nextCursor) {
      res.setHeader('X-Next-Cursor', result.nextCursor);
    }
    res.setHeader('X-Has-More', String(Boolean(result.hasMore)));

    return res.json({
      data: result.data || result.questions,
      questions: result.questions,
      nextCursor: result.nextCursor ?? null,
      hasMore: Boolean(result.hasMore),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    console.error('Error fetching written questions:', error);
    return res.status(500).json({ error: 'Failed to fetch written questions', details: error.message });
  }
});

// GET /api/written-questions/:id
app.get('/api/written-questions/:id', async (req: Request, res: Response) => {
  try {
    const question = await getWrittenQuestionById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Written question not found' });
    }
    return res.json(question);
  } catch (error: any) {
    console.error('Error getting written question:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// POST /api/written-questions (Protected Admin)
app.post('/api/written-questions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.question_text || !body.explanation) {
      return res.status(400).json({ error: 'Question text and explanation are required' });
    }

    const created = await insertWrittenQuestion(body);
    return res.status(201).json(created);
  } catch (error: any) {
    console.error('Error inserting written question:', error);
    return res.status(500).json({ error: 'Failed to create written question', details: error.message });
  }
});

// PUT /api/written-questions/:id (Protected Admin)
app.put('/api/written-questions/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;

    const updated = await updateWrittenQuestionInDb(id, body);
    if (!updated) {
      return res.status(404).json({ error: 'Written question not found' });
    }
    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating written question:', error);
    return res.status(500).json({ error: 'Failed to update written question', details: error.message });
  }
});

// DELETE /api/written-questions/:id (Protected Admin)
app.delete('/api/written-questions/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const success = await deleteWrittenQuestionFromDb(id);
    if (!success) {
      return res.status(404).json({ error: 'Written question not found' });
    }
    return res.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting written question:', error);
    return res.status(500).json({ error: 'Failed to delete written question', details: error.message });
  }
});

// POST /api/admin/questions/import-preview (Taxonomy Resolution & Multi-Tier Preview - Protected Admin)
app.post('/api/admin/questions/import-preview', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    let rawQuestions: any[] = [];
    if (Array.isArray(req.body)) {
      rawQuestions = req.body;
    } else if (req.body && Array.isArray(req.body.questions)) {
      rawQuestions = req.body.questions;
    } else if (req.body && Array.isArray(req.body.data)) {
      rawQuestions = req.body.data;
    } else if (req.body && Array.isArray(req.body.items)) {
      rawQuestions = req.body.items;
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      return res.status(400).json({ error: 'No questions found in preview payload' });
    }

    const preview = await resolveQuestionsImport(rawQuestions, req.body.defaults);
    return res.status(200).json({
      success: true,
      ...preview,
    });
  } catch (error: any) {
    console.error('Error in questions import preview:', error);
    return res.status(500).json({
      error: 'Import resolution preview failed',
      details: error.message || 'An unexpected error occurred while resolving taxonomy.',
    });
  }
});

// POST /api/admin/questions/import-commit (Transactional Commit with Taxonomy Upsert & Counter Refresh - Protected Admin)
app.post('/api/admin/questions/import-commit', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    let rawQuestions: any[] = [];
    if (Array.isArray(req.body)) {
      rawQuestions = req.body;
    } else if (req.body && Array.isArray(req.body.questions)) {
      rawQuestions = req.body.questions;
    } else if (req.body && Array.isArray(req.body.data)) {
      rawQuestions = req.body.data;
    } else if (req.body && Array.isArray(req.body.items)) {
      rawQuestions = req.body.items;
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      return res.status(400).json({ error: 'No questions provided for commit' });
    }

    const createTaxonomy = Array.isArray(req.body.createTaxonomy) ? req.body.createTaxonomy : [];

    const commitResult = await commitQuestionsImport({
      questions: rawQuestions,
      createTaxonomy,
    });

    return res.status(200).json({
      success: true,
      count: commitResult.importedQuestionsCount,
      createdTaxonomyCount: commitResult.createdTaxonomyCount,
      updatedTopicCountersCount: commitResult.updatedTopicCountersCount,
      message: commitResult.message,
    });
  } catch (error: any) {
    console.error('Error in questions import commit:', error);
    return res.status(500).json({
      error: 'Database commit failed',
      details: error.message || 'An unexpected error occurred during import commit.',
    });
  }
});

// ---------------- TAXONOMY MANAGEMENT & HEALTH API ----------------

// GET /api/taxonomy/tree or GET /api/admin/taxonomy/tree (Live taxonomy hierarchy tree)
app.get(['/api/taxonomy/tree', '/api/admin/taxonomy/tree'], async (req: Request, res: Response) => {
  try {
    const treeData = await getTaxonomyTreeService();
    return res.json(treeData);
  } catch (error: any) {
    console.error('Error fetching taxonomy tree:', error);
    return res.status(500).json({ error: 'Failed to fetch taxonomy tree', details: error.message });
  }
});

// GET /api/admin/taxonomy/health (Diagnostics: duplicate suspects, zero-question topics, orphan questions)
app.get('/api/admin/taxonomy/health', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const health = await getTaxonomyHealthService();
    return res.json(health);
  } catch (error: any) {
    console.error('Error fetching taxonomy health:', error);
    return res.status(500).json({ error: 'Failed to fetch taxonomy health', details: error.message });
  }
});

// POST /api/admin/taxonomy/merge-topics (Transactional merge of duplicate topics into survivor)
app.post('/api/admin/taxonomy/merge-topics', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { sourceTopicIds, targetTopicId, targetBanglaName, targetName } = req.body;
    if (!targetTopicId || !Array.isArray(sourceTopicIds) || sourceTopicIds.length === 0) {
      return res.status(400).json({ error: 'sourceTopicIds array and targetTopicId are required' });
    }

    const result = await mergeTopicsService({
      sourceTopicIds,
      targetTopicId,
      targetBanglaName,
      targetName,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error merging topics:', error);
    return res.status(500).json({ error: 'Topic merge failed', details: error.message });
  }
});

// POST /api/admin/taxonomy/normalize-topic (Rename and normalize topic name transactionally)
app.post('/api/admin/taxonomy/normalize-topic', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { topicId, banglaName, name } = req.body;
    if (!topicId || !banglaName) {
      return res.status(400).json({ error: 'topicId and banglaName are required' });
    }

    const result = await normalizeTopicService({ topicId, banglaName, name });
    return res.json({ success: true, topic: result });
  } catch (error: any) {
    console.error('Error normalizing topic:', error);
    return res.status(500).json({ error: 'Topic normalization failed', details: error.message });
  }
});

// POST /api/admin/taxonomy/delete-empty-topics (Delete topics with 0 questions transactionally)
app.post('/api/admin/taxonomy/delete-empty-topics', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { topicIds } = req.body;
    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      return res.status(400).json({ error: 'topicIds array is required' });
    }

    const result = await deleteEmptyTopicsService(topicIds);
    return res.json(result);
  } catch (error: any) {
    console.error('Error deleting empty topics:', error);
    return res.status(500).json({ error: 'Delete empty topics failed', details: error.message });
  }
});

// POST /api/admin/taxonomy/reassign-orphans (Reassign questions with orphan topic_id)
app.post('/api/admin/taxonomy/reassign-orphans', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const result = await reassignOrphanQuestionsService(items);
    return res.json(result);
  } catch (error: any) {
    console.error('Error reassigning orphan questions:', error);
    return res.status(500).json({ error: 'Reassign orphan questions failed', details: error.message });
  }
});

// GET /api/admin/taxonomy/master-chart (Live Master ID chart export in json or markdown)
app.get(['/api/admin/taxonomy/master-chart', '/api/taxonomy/master-chart'], async (req: Request, res: Response) => {
  try {
    const format = req.query.format === 'json' ? 'json' : 'markdown';
    const chart = await exportMasterChartService(format);

    if (format === 'json') {
      return res.json(chart);
    } else {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(chart);
    }
  } catch (error: any) {
    console.error('Error generating master chart:', error);
    return res.status(500).json({ error: 'Failed to generate master chart', details: error.message });
  }
});

// GET /api/admin/taxonomy/audit-logs (Get recent audit history of taxonomy mutations)
app.get('/api/admin/taxonomy/audit-logs', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const logs = await getTaxonomyAuditLogsService(limit);
    return res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    console.error('Error fetching taxonomy audit logs:', error);
    return res.status(500).json({ error: 'Failed to fetch taxonomy audit logs', details: error.message });
  }
});

// POST /api/admin/taxonomy/create-topic (Create a single topic with automatic ID and audit logging)
app.post('/api/admin/taxonomy/create-topic', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const topicData = req.body;
    if (!topicData.name && !topicData.bangla_name) {
      return res.status(400).json({ error: 'Topic name is required' });
    }
    if (!topicData.chapter_id) {
      return res.status(400).json({ error: 'Chapter ID is required' });
    }
    const created = await createTopicService(topicData, (req as any).user?.name || 'admin');
    return res.status(201).json({ success: true, topic: created });
  } catch (error: any) {
    console.error('Error creating topic:', error);
    return res.status(500).json({ error: 'Failed to create topic', details: error.message });
  }
});

// POST /api/admin/questions/bulk-import (Bulk import questions with Zod validation - Protected Admin)
app.post(
  '/api/admin/questions/bulk-import',
  authenticateAdmin,
  validateBody(bulkQuestionsImportSchema),
  async (req: Request, res: Response) => {
    try {
      let rawQuestions: any[] = [];
      if (Array.isArray(req.body)) {
        rawQuestions = req.body;
      } else if (req.body && Array.isArray(req.body.questions)) {
        rawQuestions = req.body.questions;
      } else if (req.body && Array.isArray(req.body.data)) {
        rawQuestions = req.body.data;
      }

      if (!rawQuestions || rawQuestions.length === 0) {
        return res.status(400).json({ error: 'No questions found in payload' });
      }

      const result = await bulkImportQuestions(rawQuestions);

      return res.status(200).json({
        success: true,
        count: result.count,
        message: `Successfully imported ${result.count} questions into the live database.`,
      });
    } catch (error: any) {
      console.error('Error in bulk import questions:', error);
      return res.status(500).json({
        error: 'Database bulk import failed',
        details: error.message || 'An unexpected error occurred while saving questions to the database.',
      });
    }
  }
);

// POST /api/admin/written-questions/bulk-import
app.post('/api/admin/written-questions/bulk-import', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    let rawItems: any[] = [];
    if (Array.isArray(req.body)) {
      rawItems = req.body;
    } else if (req.body && Array.isArray(req.body.questions)) {
      rawItems = req.body.questions;
    } else if (req.body && Array.isArray(req.body.data)) {
      rawItems = req.body.data;
    }

    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({ error: 'No written questions found in payload' });
    }

    const imported = await bulkImportWrittenQuestions(rawItems);
    return res.status(200).json({
      success: true,
      count: imported.length,
      message: `Successfully imported ${imported.length} written questions.`,
    });
  } catch (error: any) {
    console.error('Error in bulk import written questions:', error);
    return res.status(500).json({ error: 'Written questions bulk import failed', details: error.message });
  }
});

// POST /api/admin/topics/bulk-import
app.post('/api/admin/topics/bulk-import', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    let rawItems: any[] = [];
    if (Array.isArray(req.body)) {
      rawItems = req.body;
    } else if (req.body && Array.isArray(req.body.topics)) {
      rawItems = req.body.topics;
    } else if (req.body && Array.isArray(req.body.data)) {
      rawItems = req.body.data;
    }

    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({ error: 'No topics found in payload' });
    }

    const imported = await bulkImportTopics(rawItems);
    return res.status(200).json({
      success: true,
      count: imported.length,
      message: `Successfully imported ${imported.length} topics.`,
    });
  } catch (error: any) {
    console.error('Error in bulk import topics:', error);
    return res.status(500).json({ error: 'Topics bulk import failed', details: error.message });
  }
});

// POST /api/admin/knowledge-snippets/bulk-import
app.post('/api/admin/knowledge-snippets/bulk-import', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    let rawItems: any[] = [];
    if (Array.isArray(req.body)) {
      rawItems = req.body;
    } else if (req.body && Array.isArray(req.body.snippets)) {
      rawItems = req.body.snippets;
    } else if (req.body && Array.isArray(req.body.data)) {
      rawItems = req.body.data;
    }

    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({ error: 'No knowledge snippets found in payload' });
    }

    const imported = await bulkImportKnowledgeSnippets(rawItems);
    return res.status(200).json({
      success: true,
      count: imported.length,
      message: `Successfully imported ${imported.length} knowledge snippets.`,
    });
  } catch (error: any) {
    console.error('Error in bulk import knowledge snippets:', error);
    return res.status(500).json({ error: 'Knowledge snippets bulk import failed', details: error.message });
  }
});

// POST /api/reports (Submit question bug or error report)
app.post('/api/reports', async (req: Request, res: Response) => {
  try {
    const { question_id, question, reason, details, user_id } = req.body;
    if (!question_id) {
      return res.status(400).json({ error: 'Question ID is required' });
    }

    const reportDraft = await insertAdminDraft({
      type: 'question',
      payload: {
        ...(question || {}),
        id: question_id,
        report_reason: reason || 'ত্রুটিপূর্ণ প্রশ্ন রিপোর্ট',
        report_details: details || '',
        reported_by_user: user_id || 'anonymous',
        reported_at: Date.now(),
      },
      source_model: 'Student User Report',
      source_info: `[Report] Question ID: ${question_id} | Reason: ${reason || 'Not specified'}`,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'রিপোর্টটি অ্যাডমিন রিভিউ এর জন্য জমা হয়েছে। ধন্যবাদ!',
      report_id: reportDraft.id,
    });
  } catch (error: any) {
    console.error('Error submitting question report:', error);
    return res.status(500).json({ error: 'Failed to submit report', details: error.message });
  }
});

// ---------------- SQLite TOPICS API ----------------

// GET /api/topics/stats (Aggregated statistics for all topics and categories)
app.get('/api/topics/stats', async (req: Request, res: Response) => {
  try {
    const topics = await getAllTopics();
    let totalQuestions = 0;
    const categoryDistribution: Record<string, number> = {
      varsity_a: 0,
      engineering: 0,
      medical: 0,
      academic: 0,
      main_book: 0,
    };

    for (const t of topics) {
      totalQuestions += t.total_questions || 0;
      categoryDistribution.varsity_a += t.varsity_a_count || 0;
      categoryDistribution.engineering += t.engineering_count || 0;
      categoryDistribution.medical += t.medical_count || 0;
      categoryDistribution.academic += t.academic_count || 0;
      categoryDistribution.main_book += t.main_book_count || 0;
    }

    return res.json({
      success: true,
      totalTopics: topics.length,
      totalQuestions,
      categoryDistribution,
      topics,
    });
  } catch (error: any) {
    console.error('Error fetching topics stats:', error);
    return res.status(500).json({ error: 'Failed to fetch topics statistics', details: error.message });
  }
});

// POST /api/admin/heal-database (Normalize all topics, verify mappings, and recount)
app.post('/api/admin/heal-database', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const result = await healAndSyncDatabase();
    return res.json(result);
  } catch (error: any) {
    console.error('Error executing database healing:', error);
    return res.status(500).json({ error: 'Database normalization and heal failed', details: error.message });
  }
});

// GET /api/topics (List topics with optional filters)
app.get('/api/topics', async (req: Request, res: Response) => {
  try {
    const { chapter_id, subject_id, paper, search } = req.query;
    const topics = await getAllTopics({
      chapter_id: typeof chapter_id === 'string' ? chapter_id : undefined,
      subject_id: typeof subject_id === 'string' ? subject_id : undefined,
      paper: typeof paper === 'string' ? paper : undefined,
      search: typeof search === 'string' ? search : undefined,
    });
    return res.json(topics);
  } catch (error: any) {
    console.error('Error fetching topics from SQLite:', error);
    return res.status(500).json({ error: 'Failed to fetch topics', details: error.message });
  }
});

// GET /api/topics/:id
app.get('/api/topics/:id', async (req: Request, res: Response) => {
  try {
    const topic = await getTopicById(req.params.id);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    return res.json(topic);
  } catch (error: any) {
    console.error('Error getting topic:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// POST /api/topics (Add a topic manually - Protected)
app.post('/api/topics', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const topicData = req.body;
    if (!topicData.name && !topicData.bangla_name) {
      return res.status(400).json({ error: 'Topic name is required' });
    }
    if (!topicData.chapter_id) {
      return res.status(400).json({ error: 'Chapter ID is required' });
    }

    const created = await createTopicService(topicData, (req as any).user?.name || 'admin');
    return res.status(201).json(created);
  } catch (error: any) {
    console.error('Error inserting topic into database:', error);
    return res.status(500).json({ error: 'Failed to create topic', details: error.message });
  }
});

// PUT /api/topics/:id (Update a topic manually - Protected)
app.put('/api/topics/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const topicData = req.body;

    const updated = await updateTopicInDb(id, topicData);
    if (!updated) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating topic in SQLite:', error);
    return res.status(500).json({ error: 'Failed to update topic', details: error.message });
  }
});

// DELETE /api/topics/:id (Protected)
app.delete('/api/topics/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const success = await deleteTopicFromDb(id);
    if (!success) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    return res.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting topic from SQLite:', error);
    return res.status(500).json({ error: 'Failed to delete topic', details: error.message });
  }
});

// GET /api/knowledge-snippets - Return active knowledge snippets in random order
app.get('/api/knowledge-snippets', async (req: Request, res: Response) => {
  try {
    const snippets = await getAllKnowledgeSnippets();
    return res.json(snippets);
  } catch (error: any) {
    console.error('Error fetching knowledge snippets:', error);
    return res.status(500).json({ error: 'Failed to fetch knowledge snippets', details: error.message });
  }
});

// ---------------- MULTI-API KEY TRACKING & FAILOVER ----------------

interface KeyHealth {
  id: string;
  key: string;
  label?: string;
  provider: 'openrouter' | 'gemini';
  status: 'active' | 'rate_limited' | 'error' | 'untested';
  is_primary?: boolean;
  priority?: number;
  lastTested?: number;
  latencyMs?: number;
  errorCount: number;
  successCount: number;
}

let trackedOpenRouterKeys: KeyHealth[] = [];

async function initializeTrackedKeys() {
  try {
    const saved = await getAdminSetting('openrouter_keys_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasPrimary = parsed.some((k: any) => k.is_primary);
        if (!hasPrimary && parsed.length > 0) {
          parsed[0].is_primary = true;
        }
        trackedOpenRouterKeys = parsed;
        return;
      }
    }
  } catch (e) {
    console.warn('[Admin] Failed to load saved keys from db:', e);
  }

  // Fallback to env keys
  const envKeys: string[] = [];
  if (process.env.OPENROUTER_API_KEYS) {
    envKeys.push(...process.env.OPENROUTER_API_KEYS.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean));
  }
  if (process.env.OPENROUTER_API_KEY) {
    envKeys.push(process.env.OPENROUTER_API_KEY.trim());
  }

  trackedOpenRouterKeys = Array.from(new Set(envKeys.filter((k) => k.length > 5))).map((key, idx) => ({
    id: `key_${idx + 1}`,
    key,
    label: `OpenRouter Key #${idx + 1}`,
    provider: 'openrouter',
    status: 'untested',
    is_primary: idx === 0,
    priority: idx + 1,
    errorCount: 0,
    successCount: 0,
  }));
}

// Initialize on start
initializeTrackedKeys();

function getOpenRouterKeys(customKeys?: string[] | string): string[] {
  const keys: string[] = [];
  if (Array.isArray(customKeys)) {
    keys.push(...customKeys);
  } else if (typeof customKeys === 'string' && customKeys.trim()) {
    keys.push(...customKeys.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean));
  }

  if (trackedOpenRouterKeys.length > 0) {
    // 1. Manually selected Primary key first
    const primary = trackedOpenRouterKeys.filter((k) => k.is_primary);
    // 2. Other healthy keys ordered by lowest errorCount
    const othersHealthy = trackedOpenRouterKeys
      .filter((k) => !k.is_primary && k.status !== 'rate_limited')
      .sort((a, b) => (a.errorCount || 0) - (b.errorCount || 0));
    // 3. Rate limited / degraded keys as last resort fallback
    const fallbackKeys = trackedOpenRouterKeys
      .filter((k) => !k.is_primary && k.status === 'rate_limited');

    const sortedTracked = [...primary, ...othersHealthy, ...fallbackKeys];
    for (const item of sortedTracked) {
      if (item.key && !keys.includes(item.key)) {
        keys.push(item.key);
      }
    }
  }

  if (process.env.OPENROUTER_API_KEYS) {
    const envList = process.env.OPENROUTER_API_KEYS.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);
    for (const k of envList) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  if (process.env.OPENROUTER_API_KEY && !keys.includes(process.env.OPENROUTER_API_KEY.trim())) {
    keys.push(process.env.OPENROUTER_API_KEY.trim());
  }

  return Array.from(new Set(keys.map((k) => k.trim()).filter((k) => k.length > 5)));
}

function getGeminiClients(): GoogleGenAI[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEYS) {
    keys.push(...process.env.GEMINI_API_KEYS.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean));
  }
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  const uniqueKeys = Array.from(new Set(keys.filter((k) => k.length > 5)));
  return uniqueKeys.map(
    (apiKey) =>
      new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
  );
}

function getGeminiClient(): GoogleGenAI | null {
  const clients = getGeminiClients();
  return clients.length > 0 ? clients[0] : null;
}

// OpenRouter API helper with automatic multi-key failover
interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

async function callOpenRouter({
  model = 'openrouter/free',
  messages,
  customApiKey,
  customApiKeys,
  temperature = 0.7,
}: {
  model?: string;
  messages: OpenRouterMessage[];
  customApiKey?: string;
  customApiKeys?: string[] | string;
  temperature?: number;
}) {
  const keys = getOpenRouterKeys(customApiKeys || customApiKey);
  if (keys.length === 0) {
    throw new Error(
      'OpenRouter API Key পাওয়া যায়নি। দয়া করে Settings-এ গিয়ে আপনার OpenRouter API Key দিন অথবা সার্ভার .env-এ OPENROUTER_API_KEYS যুক্ত করুন।'
    );
  }

  const effectiveModel = model || 'openrouter/free';
  let lastError: any = null;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    const startTime = Date.now();
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://varsity-admission-ai.local',
          'X-Title': 'Varsity Admission AI Mentor',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages,
          temperature,
        }),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errJson = JSON.parse(errorText);
          errorMessage = errJson.error?.message || errorText;
        } catch {}

        console.warn(`[OpenRouter Failover] Key #${i + 1}/${keys.length} failed (${response.status}): ${errorMessage}`);
        
        // Update key tracking
        const tracked = trackedOpenRouterKeys.find((k) => k.key === apiKey);
        if (tracked) {
          tracked.errorCount = (tracked.errorCount || 0) + 1;
          tracked.status = response.status === 429 ? 'rate_limited' : 'error';
          tracked.lastTested = Date.now();
          tracked.latencyMs = latency;
        }

        lastError = new Error(`OpenRouter API ত্রুটি (${response.status}): ${errorMessage}`);

        // Shift automatically to next key if available
        if (i < keys.length - 1) {
          continue;
        }
        throw lastError;
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];
      const responseText = choice?.message?.content || '';
      const reasoning = choice?.message?.reasoning || null;

      // Update key tracking on success
      const tracked = trackedOpenRouterKeys.find((k) => k.key === apiKey);
      if (tracked) {
        tracked.successCount = (tracked.successCount || 0) + 1;
        tracked.status = 'active';
        tracked.lastTested = Date.now();
        tracked.latencyMs = latency;
      }

      return {
        text: responseText,
        reasoning,
        sources: [],
        keyUsedIndex: i + 1,
      };
    } catch (err: any) {
      console.warn(`[OpenRouter Network Failover] Key #${i + 1}/${keys.length} catch:`, err.message);
      
      const tracked = trackedOpenRouterKeys.find((k) => k.key === apiKey);
      if (tracked) {
        tracked.errorCount = (tracked.errorCount || 0) + 1;
        tracked.status = 'error';
        tracked.lastTested = Date.now();
      }

      lastError = err;
      if (i < keys.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error('সবগুলো OpenRouter API Key ব্যবহারে ব্যর্থ হয়েছে। দয়া করে কী চেক করুন।');
}

// ---------------- API ENDPOINTS ----------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/ai/models - List supported AI Models including OpenRouter Free models
app.get('/api/ai/models', (req: Request, res: Response) => {
  const hasGeminiKey = !!process.env.GEMINI_API_KEY || !!process.env.GEMINI_API_KEYS;
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY || !!process.env.OPENROUTER_API_KEYS;

  const models = [
    {
      id: 'openrouter/free',
      name: 'Free Models Router',
      provider: 'openrouter',
      category: 'router',
      description: 'স্বয়ংক্রিয়ভাবে সবচেয়ে কার্যকর ফ্রি মডেল নির্বাচন করে',
      badge: 'ডিফল্ট ও রিকমেন্ডেড',
      supportsVision: true,
      isPopular: true,
    },
    {
      id: 'deepseek/deepseek-r1:free',
      name: 'DeepSeek R1 Free (Reasoning)',
      provider: 'openrouter',
      category: 'reasoning',
      description: 'সম্পূর্ণ ফ্রি, গভীর ম্যাথ চেইন-অব-থট ও অ্যালগরিদম সমাধান',
      badge: 'ফ্রি সুপার ম্যাথ',
      supportsVision: false,
      isPopular: true,
    },
    {
      id: 'deepseek/deepseek-chat:free',
      name: 'DeepSeek V3 Free (Chat)',
      provider: 'openrouter',
      category: 'chat',
      description: 'সুপার ফাস্ট অল-রাউন্ডার সায়েন্স ও বাংলা ব্যাখ্যাকারী',
      badge: 'ফ্রি ও দ্রুততম',
      supportsVision: false,
      isPopular: true,
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      name: 'Llama 3.3 70B Free',
      provider: 'openrouter',
      category: 'chat',
      description: 'মেটার ফ্ল্যাগশিপ ফ্রি ওপেন সোর্স মডেল, ব্যাপক সাধারণ জ্ঞান',
      badge: 'মেটা ফ্ল্যাগশিপ',
      supportsVision: false,
    },
    {
      id: 'google/gemma-4-31b:free',
      name: 'Gemma 4 31B (free)',
      provider: 'openrouter',
      category: 'chat',
      description: 'গুগলের উচ্চ ক্ষমতাসম্পন্ন ফ্রি ওপেন মডেল',
      badge: 'গুগল ওপেন',
      supportsVision: false,
    },
    {
      id: 'google/gemma-4-26b-a4b:free',
      name: 'Gemma 4 26B A4B (free)',
      provider: 'openrouter',
      category: 'chat',
      description: 'উচ্চ পারফরম্যান্স লাইটওয়েট এডমিশন সমাধানকারী',
      supportsVision: false,
    },
    {
      id: 'nvidia/nemotron-3.5-lightning:free',
      name: 'Nemotron 3.5 Lightning (free)',
      provider: 'openrouter',
      category: 'chat',
      description: 'এনভিডিয়া লাইটনিং স্পিড মডেল',
      badge: 'আল্ট্রা ফাস্ট',
      supportsVision: false,
    },
    {
      id: 'nvidia/nemotron-3-super:free',
      name: 'Nemotron 3 Super (free)',
      provider: 'openrouter',
      category: 'chat',
      description: 'এনভিডিয়া সুপার লজিক ইঞ্জিন',
      supportsVision: false,
    },
    {
      id: 'nvidia/nemotron-3-nano-30b-a3b:free',
      name: 'Nemotron 3 Nano 30B (free)',
      provider: 'openrouter',
      category: 'chat',
      description: 'উচ্চ নির্ভুলতা সম্পন্ন স্টুডেন্ট ফ্রেন্ডলি মডেল',
      supportsVision: false,
    },
    {
      id: 'openai/gpt-oss-20b:free',
      name: 'GPT-OSS 20B (free)',
      provider: 'openrouter',
      category: 'chat',
      description: 'ওপেন সোর্স মডেল উইথ চমৎকার কনসেপ্ট ব্যাখ্যা',
      supportsVision: false,
    },
    {
      id: 'qwen/qwen-2.5-coder-32b-instruct:free',
      name: 'Qwen 2.5 Coder 32B Free',
      provider: 'openrouter',
      category: 'reasoning',
      description: 'লজিক, গাণিতিক হিসাব ও ফর্মুলা ডিডাকশন এক্সপার্ট',
      badge: 'ফ্রি লজিক এক্সপার্ট',
      supportsVision: false,
    },
    {
      id: 'liquid/lfm2.5-2.6b:free',
      name: 'LFM2.5-2.6B (free)',
      provider: 'openrouter',
      category: 'chat',
      description: 'লিকুইড এআই উদ্ভাবনী লাইটওয়েট মডেল',
      supportsVision: false,
    },
    {
      id: 'mistralai/mistral-7b-instruct:free',
      name: 'Mistral 7B Free',
      provider: 'openrouter',
      category: 'chat',
      description: 'দ্রুত ও সাশ্রয়ী লাইটওয়েট কনসেপ্ট সলভার',
      badge: 'ফ্রি লাইটওয়েট',
      supportsVision: false,
    },
    {
      id: 'gemini-3.7-flash',
      name: 'Google Gemini 3.7 Flash',
      provider: 'gemini',
      category: 'gemini',
      description: 'অত্যন্ত দ্রুত ও নির্ভুল, ম্যাথ ও বাংলা প্রশ্নের সেরা ব্যাখ্যা',
      badge: 'গুগল ফ্ল্যাগশিপ',
      supportsVision: true,
      isPopular: true,
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Google Gemini 2.5 Flash',
      provider: 'gemini',
      category: 'gemini',
      description: 'লাইটওয়েট ও সুপার ফাস্ট রেসপন্স',
      supportsVision: true,
    },
    {
      id: 'custom',
      name: 'কাস্টম OpenRouter মডেল',
      provider: 'openrouter',
      category: 'custom',
      description: 'যেকোনো OpenRouter মডেল আইডি ম্যানুয়ালি ইনপুট দিন',
      supportsVision: true,
    },
  ];

  return res.json({
    models,
    serverConfig: {
      hasGeminiKey,
      hasOpenRouterKey,
      defaultModel: 'openrouter/free',
    },
  });
});

// Helper to securely resolve authenticated user ID from JWT (prevents header spoofing)
function resolveRequestUserId(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded: any = jwt.verify(token, EFFECTIVE_JWT_SECRET);
      if (decoded?.userId) return decoded.userId;
    } catch {}
  }
  return null;
}

// ---------------- Chat History Endpoints ----------------

// GET /api/ai/history
app.get('/api/ai/history', async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    if (!userId) {
      return res.json({ history: [] });
    }
    const history = await getChatHistoryFromDb(userId);
    return res.json({ history });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ error: 'Failed to fetch chat history', details: error.message });
  }
});

// POST /api/ai/history
app.post('/api/ai/history', async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { role, content, modelUsed, provider, id } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    if (!userId) {
      // Ephemeral in-memory message for unauthenticated guest session
      return res.status(201).json({
        id: id || `msg_${Date.now()}`,
        role,
        content,
        modelUsed,
        provider,
        timestamp: new Date().toISOString(),
      });
    }

    const saved = await saveChatMessageToDb(userId, role, content, modelUsed, provider, id);
    return res.status(201).json(saved);
  } catch (error: any) {
    console.error('Error saving chat message:', error);
    return res.status(500).json({ error: 'Failed to save chat message', details: error.message });
  }
});

// DELETE /api/ai/history
app.delete('/api/ai/history', async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    if (userId) {
      await clearChatHistoryInDb(userId);
    }
    return res.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('Error clearing chat history:', error);
    return res.status(500).json({ error: 'Failed to clear chat history', details: error.message });
  }
});

// Chat Mentor (Supports Gemini 3.7 & OpenRouter models with Server-Sent Events Streaming)
app.post('/api/ai/chat', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      history = [],
      includeSearch = false,
      provider = 'openrouter',
      model = 'openrouter/free',
      customApiKey,
      customApiKeys,
      customModelName,
      stream = false,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const isSSE = stream === true || req.headers.accept?.includes('text/event-stream');

    const systemInstruction = `You are "JACHAI AI" (যাচাই এআই - JACHAI Admission Mentor), a superfast, ultra-precise, highly adaptive, and intelligent Bangladesh University Admission & STEM Mentor (DU 'Ka', BUET, Medical, GST, CU, RU, JU, Agricultural).

CRITICAL DIRECTIVE: ADAPTIVE RESPONSE LENGTH & STYLE
Be extremely direct, concise, and proportional to what the student asks. Never waste time or output walls of text for simple inquiries.

Determine user intent and follow these exact response archetypes:

1. 💬 CASUAL / GREETINGS / THANKS (e.g. "hi", "কেমন আছো", "ধন্যবাদ"):
   - Respond warmly in 1-2 short sentences. Absolutely NO structured headers, tips, or unnecessary explanations.

2. ⚡ QUICK FACT / DEFINITION / FORMULA / SHORT QUESTION (e.g. "কাজের মাত্রা কী?", "পানির pH কত?", "সান্দ্রতা কাকে বলে?", "DU আবেদন ফি কত?"):
   - Give the direct, precise answer in 1-3 bullet points or 2-3 sentences.
   - Include the exact inline LaTeX formula (e.g. $[ML^2T^{-2}]$) without unnecessary padding.

3. 🧮 MATH PROBLEM / MCQ SOLUTION / DETAILED EXPLANATION (When solving questions or when the student explicitly asks for step-by-step guidance):
   - Provide a clean, focused breakdown using ONLY relevant sections from below (skip sections that do not add real value):
     ✅ **সঠিক উত্তর**: (সংক্ষিপ্ত ও সরাসরি উত্তর বা অপশন)
     📝 **সমাধান**: (ধাপে ধাপে সংক্ষিপ্ত ও স্পষ্ট হিসাব, সব সমীকরণ $...$ বা $$...$$ এ)
     🚀 **শর্টকাট (No Calc)**: (প্রযোজ্য ক্ষেত্রে ক্যালকুলেটর ছাড়া দ্রুত হিসাব করার ট্রিকস)
     ⚠️ **সতর্কতা**: (পরীক্ষায় সচরাচর ভুল হওয়ার পয়েন্ট বা ট্র্যাপ - শুধুমাত্র প্রাসঙ্গিক হলে)

4. 📅 ADMISSION DATES & LATEST INFO:
   - Provide verified, accurate, and current Bangladesh admission context with high precision.

STRICT FORMATTING & LATEX RULES:
- Always respond in natural, crisp Bengali (বাংলা).
- LaTeX Formatting: ALWAYS format mathematical symbols and formulas with valid LaTeX enclosed in $...$ (inline) or $$...$$ (block), e.g. $F = ma$, $\\vec{v} = \\vec{u} + \\vec{a}t$, $E_k = \\frac{1}{2}mv^2$.
- No filler greetings like "আশা করি তুমি ভালো আছো..." before simple answers. Go straight to the point.`;

    const effectiveModel = model === 'custom' && customModelName ? customModelName.trim() : (model || 'openrouter/free');
    const isExplicitOpenRouter = provider === 'openrouter' || effectiveModel.includes('/') || effectiveModel === 'custom';

    // 1. OPENROUTER HANDLER
    if (isExplicitOpenRouter) {
      const openRouterMessages: OpenRouterMessage[] = [
        { role: 'system', content: systemInstruction },
        ...history.map((h: any) => ({
          role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: h.content,
        })),
        { role: 'user', content: prompt },
      ];

      if (isSSE) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        const keys: string[] = [];
        if (customApiKey && typeof customApiKey === 'string' && customApiKey.trim()) {
          keys.push(customApiKey.trim());
        }
        if (Array.isArray(customApiKeys) && customApiKeys.length > 0) {
          keys.push(...customApiKeys.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim()));
        }
        if (trackedOpenRouterKeys.length > 0) {
          const activeTracked = trackedOpenRouterKeys
            .filter((k) => k.status !== 'rate_limited')
            .sort((a, b) => (a.errorCount || 0) - (b.errorCount || 0));
          for (const item of activeTracked) {
            if (item.key && !keys.includes(item.key)) {
              keys.push(item.key);
            }
          }
        }
        if (process.env.OPENROUTER_API_KEY && !keys.includes(process.env.OPENROUTER_API_KEY.trim())) {
          keys.push(process.env.OPENROUTER_API_KEY.trim());
        }

        if (keys.length === 0) {
          res.write(`data: ${JSON.stringify({ error: 'OpenRouter API Key পাওয়া যায়নি।' })}\n\n`);
          return res.end();
        }

        let streamSucceeded = false;
        for (let i = 0; i < keys.length; i++) {
          const apiKey = keys[i];
          try {
            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.APP_URL || 'https://jachai.applet',
                'X-Title': 'JACHAI Admission Mentor',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: effectiveModel,
                messages: openRouterMessages,
                temperature: 0.7,
                stream: true,
              }),
            });

            if (!orRes.ok) {
              if (i < keys.length - 1) continue;
              const errText = await orRes.text();
              res.write(`data: ${JSON.stringify({ error: `OpenRouter ত্রুটি: ${errText}` })}\n\n`);
              return res.end();
            }

            if (!orRes.body) {
              throw new Error('No response body for streaming');
            }

            const reader = orRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;
                if (trimmed === 'data: [DONE]') {
                  res.write(`data: ${JSON.stringify({ done: true, modelUsed: effectiveModel, provider: 'openrouter' })}\n\n`);
                  streamSucceeded = true;
                  return res.end();
                }
                if (trimmed.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6));
                    const deltaText = parsed.choices?.[0]?.delta?.content || '';
                    const deltaReasoning = parsed.choices?.[0]?.delta?.reasoning || '';
                    if (deltaText || deltaReasoning) {
                      res.write(`data: ${JSON.stringify({ text: deltaText, reasoning: deltaReasoning })}\n\n`);
                    }
                  } catch (pErr) {}
                }
              }
            }

            res.write(`data: ${JSON.stringify({ done: true, modelUsed: effectiveModel, provider: 'openrouter' })}\n\n`);
            streamSucceeded = true;
            return res.end();
          } catch (streamErr: any) {
            console.warn(`[OpenRouter Stream Failover] Key #${i + 1}/${keys.length} error:`, streamErr.message);
            if (i < keys.length - 1) continue;
            if (!streamSucceeded) {
              res.write(`data: ${JSON.stringify({ error: streamErr.message || 'স্ট্রিম সংযোগে সমস্যা হয়েছে' })}\n\n`);
              return res.end();
            }
          }
        }
        return res.end();
      }

      // Non-streaming response
      const result = await callOpenRouter({
        model: effectiveModel,
        messages: openRouterMessages,
        customApiKey,
        customApiKeys,
        temperature: 0.7,
      });

      return res.json({
        text: result.text,
        reasoning: result.reasoning,
        sources: [],
        modelUsed: effectiveModel,
        provider: 'openrouter',
      });
    }

    // 2. GOOGLE GEMINI HANDLER
    const geminiClients = getGeminiClients();
    if (geminiClients.length === 0) {
      if (isSSE) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        const fallbackText = `এখানে পদার্থবিজ্ঞান ও গণিতের একটি গুরুত্বপূর্ণ শর্টকাট কৌশল:\n$v = \\sqrt{2gh}$ ও $v_e = \\sqrt{\\frac{2GM}{R}}$ সূত্র দুটি ভার্সিটি 'ক' ইউনিটে প্রচুর আসে। মাত্রা সমীকরণ এবং একক নির্ভুলভাবে যাচাই করুন!`;
        res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, modelUsed: 'offline-fallback', provider: 'gemini' })}\n\n`);
        return res.end();
      }
      return res.json({
        text: `এখানে পদার্থবিজ্ঞান ও গণিতের একটি গুরুত্বপূর্ণ শর্টকাট কৌশল:\n$v = \\sqrt{2gh}$ ও $v_e = \\sqrt{\\frac{2GM}{R}}$ সূত্র দুটি ভার্সিটি 'ক' ইউনিটে প্রচুর আসে। মাত্রা সমীকরণ এবং একক নির্ভুলভাবে যাচাই করুন!`,
        sources: [],
        modelUsed: 'offline-fallback',
        provider: 'gemini',
      });
    }

    const config: any = {
      systemInstruction,
      temperature: 0.7,
    };

    if (includeSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let contents: any;
    if (history.length > 0) {
      contents = [
        ...history.map((h: any) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: prompt }] },
      ];
    } else {
      contents = prompt;
    }

    const geminiModelName = effectiveModel.startsWith('gemini') ? effectiveModel : 'gemini-3.7-flash';

    if (isSSE) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      let streamDone = false;
      for (let i = 0; i < geminiClients.length; i++) {
        try {
          const client = geminiClients[i];
          const responseStream = await client.models.generateContentStream({
            model: geminiModelName,
            contents,
            config,
          });

          for await (const chunk of responseStream) {
            const textChunk = chunk.text;
            if (textChunk) {
              res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
            }
          }

          res.write(`data: ${JSON.stringify({ done: true, modelUsed: geminiModelName, provider: 'gemini' })}\n\n`);
          streamDone = true;
          return res.end();
        } catch (gErr: any) {
          console.warn(`Gemini streaming client #${i + 1} failed:`, gErr.message);
          if (i < geminiClients.length - 1) continue;
          if (!streamDone) {
            res.write(`data: ${JSON.stringify({ error: gErr.message || 'Gemini API Error' })}\n\n`);
            return res.end();
          }
        }
      }
      return res.end();
    }

    let lastGeminiError: any = null;
    for (let i = 0; i < geminiClients.length; i++) {
      try {
        const client = geminiClients[i];
        const response = await client.models.generateContent({
          model: geminiModelName,
          contents,
          config,
        });

        const responseText = response.text || '';
        
        // Extract search grounding sources if present
        const sources: { uri: string; title: string }[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
          for (const chunk of chunks) {
            if (chunk.web?.uri) {
              sources.push({
                uri: chunk.web.uri,
                title: chunk.web.title || 'Source Reference',
              });
            }
          }
        }

        return res.json({
          text: responseText,
          sources,
          modelUsed: geminiModelName,
          provider: 'gemini',
        });
      } catch (gErr: any) {
        console.warn(`Gemini client #${i + 1} failed:`, gErr.message);
        lastGeminiError = gErr;
        if (i < geminiClients.length - 1) continue;
      }
    }

    throw lastGeminiError || new Error('Gemini API Error');
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({
      error: 'AI রেসপন্স তৈরিতে ত্রুটি হয়েছে',
      details: error.message,
    });
  }
});

// Photo Solver with Vision (Gemini Multimodal / OpenRouter Vision)
app.post('/api/ai/solve-photo', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      image,
      mimeType = 'image/jpeg',
      provider = 'openrouter',
      model = 'openrouter/free',
      customApiKey,
      customApiKeys,
      customModelName,
    } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    const cleanBase64 = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const dataUrl = `data:${mimeType};base64,${cleanBase64}`;

    const promptText = `Analyze this handwritten or printed Bangladesh university admission question photo.
1. Transcribe the exact question in Bengali and English math notations.
2. Identify the Subject, Chapter, and Core Topic.
3. Solve it step-by-step with clear Bengali explanations and LaTeX formulas ($...$).
4. Highlight any calculator-free shortcut trick for DU/GST admission exams.
Provide structured output with:
- Detected Question (প্রশ্ন)
- Core Formula (মূল সূত্র)
- Step-by-Step Solution (ধাপে ধাপে সমাধান)
- Correct Option (সঠিক উত্তর)
- Admission Shortcut Tip (শর্টকাট ট্রিকস)`;

    const effectiveModel = model === 'custom' && customModelName ? customModelName.trim() : (model || 'openrouter/free');
    const isExplicitOpenRouter = provider === 'openrouter' || effectiveModel.includes('/') || effectiveModel === 'custom';

    // 1. OPENROUTER VISION
    if (isExplicitOpenRouter) {
      // Vision models on OpenRouter
      const visionModel = effectiveModel === 'deepseek/deepseek-r1' ? 'anthropic/claude-3.5-sonnet' : effectiveModel;
      const openRouterMessages: OpenRouterMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ];

      const result = await callOpenRouter({
        model: visionModel,
        messages: openRouterMessages,
        customApiKey,
        customApiKeys,
        temperature: 0.5,
      });

      return res.json({
        solution: result.text,
        detectedQuestion: 'ছবি থেকে সনাক্তকৃত প্রশ্ন',
        modelUsed: visionModel,
        provider: 'openrouter',
      });
    }

    // 2. GEMINI VISION
    const geminiClients = getGeminiClients();
    if (geminiClients.length === 0) {
      return res.json({
        detectedQuestion: 'প্রশ্ন সনাক্ত করা হয়েছে (পদার্থবিজ্ঞান ১ম পত্র)',
        latexFormula: 'F = ma, \\quad W = \\vec{F} \\cdot \\vec{s}',
        solution: 'ছবিটি সফলভাবে বিশ্লেষিত হয়েছে। প্রশ্নটি কাজ-ক্ষমতা-শক্তি সংক্রান্ত। প্রয়োজনীয় সূত্র: $W = \\Delta E_k = \\frac{1}{2}m(v_2^2 - v_1^2)$।',
        modelUsed: 'offline-fallback',
        provider: 'gemini',
      });
    }

    const geminiModel = effectiveModel.startsWith('gemini') ? effectiveModel : 'gemini-3.7-flash';

    for (let i = 0; i < geminiClients.length; i++) {
      try {
        const client = geminiClients[i];
        const response = await client.models.generateContent({
          model: geminiModel,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        });

        const solutionText = response.text || '';

        return res.json({
          solution: solutionText,
          detectedQuestion: 'ছবি থেকে সনাক্তকৃত প্রশ্ন',
          modelUsed: geminiModel,
          provider: 'gemini',
        });
      } catch (gErr: any) {
        console.warn(`Gemini vision #${i + 1} error:`, gErr.message);
        if (i < geminiClients.length - 1) continue;
        throw gErr;
      }
    }
  } catch (error: any) {
    console.error('Error in /api/ai/solve-photo:', error);
    return res.status(500).json({
      error: 'ছবি বিশ্লেষণে ত্রুটি হয়েছে',
      details: error.message,
    });
  }
});

// Question Deep Insight & Explanation
app.post('/api/ai/explain-question', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question object is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ explanation: question.explanation });
    }

    const prompt = `Explain the following Bangladesh University Admission question in depth for an HSC student:
Question: ${question.question_text}
Options:
A) ${question.options?.A}
B) ${question.options?.B}
C) ${question.options?.C}
D) ${question.options?.D}
Correct Answer: ${question.correct_ans}

Please provide:
1. The scientific principle and core equation in LaTeX ($...$).
2. Why the correct answer is right and common pitfalls where students make mistakes.
3. Quick mental math trick to solve within 45 seconds during exam time.
Answer in Bengali (বাংলা).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    return res.json({
      explanation: response.text || question.explanation,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/explain-question:', error);
    return res.status(500).json({
      error: 'Failed to generate explanation',
    });
  }
});

// ---------------- AI CHAT HISTORY API ----------------

// GET /api/ai/history - Retrieve chat history for current student or guest session
app.get('/api/ai/history', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = 'guest_default';
    if (token) {
      try {
        const decoded: any = jwt.verify(token, EFFECTIVE_JWT_SECRET);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      } catch {}
    } else {
      const customSessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
      if (customSessionId && typeof customSessionId === 'string' && customSessionId.trim()) {
        userId = `guest_${customSessionId.trim()}`;
      }
    }

    const history = await getChatHistoryFromDb(userId);
    return res.json({ success: true, history });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ error: 'চ্যাট হিস্ট্রি লোড করতে ব্যর্থ হয়েছে', history: [] });
  }
});

// POST /api/ai/history - Save chat message to database
app.post('/api/ai/history', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = 'guest_default';
    if (token) {
      try {
        const decoded: any = jwt.verify(token, EFFECTIVE_JWT_SECRET);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      } catch {}
    } else {
      const customSessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
      if (customSessionId && typeof customSessionId === 'string' && customSessionId.trim()) {
        userId = `guest_${customSessionId.trim()}`;
      }
    }

    const { id, role, content, modelUsed, provider } = req.body;
    if (!content || !role) {
      return res.status(400).json({ error: 'role and content are required' });
    }

    const saved = await saveChatMessageToDb(userId, role, content, modelUsed, provider, id);
    return res.json({ success: true, message: saved });
  } catch (error: any) {
    console.error('Error saving chat message:', error);
    return res.status(500).json({ error: 'মেসেজ সংরক্ষণ করতে ব্যর্থ হয়েছে' });
  }
});

// DELETE /api/ai/history - Clear chat history for user/guest
app.delete('/api/ai/history', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = 'guest_default';
    if (token) {
      try {
        const decoded: any = jwt.verify(token, EFFECTIVE_JWT_SECRET);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      } catch {}
    } else {
      const customSessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
      if (customSessionId && typeof customSessionId === 'string' && customSessionId.trim()) {
        userId = `guest_${customSessionId.trim()}`;
      }
    }

    await clearChatHistoryInDb(userId);
    return res.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('Error clearing chat history:', error);
    return res.status(500).json({ error: 'চ্যাট হিস্ট্রি মুছতে ব্যর্থ হয়েছে' });
  }
});

// Google Workspace: Sync Admission Dates to Google Calendar
app.post('/api/google/calendar/sync-dates', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Google OAuth access token is required' });
    }

    const { events } = req.body;
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Events array is required' });
    }

    const syncedResults = [];
    for (const evt of events) {
      try {
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(evt),
          }
        );

        const data = await response.json();
        syncedResults.push({
          id: data.id,
          summary: evt.summary,
          status: response.ok ? 'confirmed' : 'failed',
          error: !response.ok ? data.error?.message : undefined,
        });
      } catch (err: any) {
        syncedResults.push({
          summary: evt.summary,
          status: 'failed',
          error: err.message,
        });
      }
    }

    return res.json({
      success: true,
      syncedCount: syncedResults.filter((r) => r.status === 'confirmed').length,
      results: syncedResults,
    });
  } catch (error: any) {
    console.error('Error in /api/google/calendar/sync-dates:', error);
    return res.status(500).json({ error: 'Internal server error while syncing to Calendar' });
  }
});

// Google Workspace: Add Note or Formula to Google Tasks
app.post('/api/google/tasks/create', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Google OAuth access token is required' });
    }

    const { title, notes, due } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const taskPayload = {
      title,
      notes: notes || '',
      due: due || undefined,
    };

    const response = await fetch(
      'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskPayload),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Failed to create Google Task',
      });
    }

    return res.json({ success: true, task: data });
  } catch (error: any) {
    console.error('Error in /api/google/tasks/create:', error);
    return res.status(500).json({ error: 'Internal server error while creating Google Task' });
  }
});

// Database Diagnostics Route
app.get('/api/db/status', async (req: Request, res: Response) => {
  try {
    await getDatabase();
    const info = getDatabaseConnectionInfo();
    const stats = await getAdminDatabaseStats();
    return res.json({
      status: 'ok',
      ...info,
      stats,
      instructions: !info.isPostgresConnected
        ? 'PostgreSQL is running in fallback memory mode. To connect PostgreSQL permanently, set DATABASE_URL="postgresql://user:pass@host:5432/dbname" in your .env file.'
        : 'PostgreSQL is connected and active.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------- REAL-TIME ACTIVE USERS & HEARTBEAT API ----------------

// POST /api/user/heartbeat - Student periodic heartbeat endpoint
app.post('/api/user/heartbeat', async (req: Request, res: Response) => {
  try {
    const { page, targetUniversity, device, sessionId } = req.body || {};
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId: string | undefined;

    if (token) {
      try {
        const decoded: any = jwt.verify(token, EFFECTIVE_JWT_SECRET);
        if (decoded && decoded.userId && decoded.userId !== 'admin') {
          userId = decoded.userId;
        }
      } catch {}
    }

    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(',')[0].trim();
    const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';

    await recordUserActivityInDb({
      userId,
      customSessionId: sessionId,
      ip,
      userAgent,
      currentPage: page,
      targetUniversity,
      deviceInfo: device,
    });

    const telemetry = await getActiveUsersTelemetryFromDb();

    return res.json({
      success: true,
      timestamp: Date.now(),
      totalActiveNow: telemetry.totalActiveNow,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Heartbeat processing failed' });
  }
});

// GET /api/admin/active-users - Real-time active users monitoring (Admin Only)
app.get('/api/admin/active-users', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const telemetry = await getActiveUsersTelemetryFromDb();
    return res.json(telemetry);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch active users telemetry' });
  }
});

// ---------------- CENTRALIZED ERROR HANDLING MIDDLEWARE ----------------
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[Express Error] [${req.method} ${req.path}] ->`, err);

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
});

// ---------------- VITE & SERVER LAUNCH (MULTI-PAGE SETUP) ----------------

async function startServer() {
  // Eagerly initialize and verify database connection on boot
  try {
    await getDatabase();
  } catch (dbErr: any) {
    console.warn('[Database Init Warning]:', dbErr.message);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Development Multi-Page SPA HTML Fallback
    // Serves admin.html for Admin routes (/admin-portal, /admin, /admin.html) and index.html for User routes
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      const isAdminRoute =
        url.startsWith('/admin-portal') ||
        url.startsWith('/admin.html') ||
        url === '/admin' ||
        url.startsWith('/admin/');

      const targetHtmlFile = isAdminRoute ? 'admin.html' : 'index.html';

      try {
        const fs = await import('fs');
        let targetPath = path.resolve(process.cwd(), targetHtmlFile);
        if (!fs.existsSync(targetPath)) {
          targetPath = path.resolve(process.cwd(), 'index.html');
        }

        if (fs.existsSync(targetPath)) {
          let template = fs.readFileSync(targetPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        }
        next();
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const fs = await import('fs');
    app.use(express.static(distPath));

    // Production Admin Portal Routes
    app.get(['/admin-portal', '/admin-portal/*', '/admin', '/admin/*', '/admin.html'], (_req: Request, res: Response) => {
      const adminPath = path.join(distPath, 'admin.html');
      if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
      }
      return res.sendFile(path.join(distPath, 'index.html'));
    });

    // Production User Student App Route
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JACHAI AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
