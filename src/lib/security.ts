import { z } from 'zod';

// Input validation schemas
export const SecuritySchemas = {
  // Wallet address validation
  walletAddress: z.string()
    .min(32, 'Invalid wallet address length')
    .max(44, 'Invalid wallet address length')
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid wallet address format'),

  // Token creation validation
  tokenCreation: z.object({
    name: z.string()
      .min(1, 'Token name is required')
      .max(32, 'Token name too long')
      .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid characters in token name'),
    
    symbol: z.string()
      .min(1, 'Token symbol is required')
      .max(10, 'Token symbol too long')
      .regex(/^[A-Z0-9]+$/, 'Token symbol must be uppercase alphanumeric'),
    
    description: z.string()
      .max(500, 'Description too long')
      .optional(),
    
    image: z.string()
      .url('Invalid image URL')
      .optional(),
    
    x_url: z.string()
      .url('Invalid X URL')
      .refine(url => url.includes('x.com') || url.includes('twitter.com'), 'Must be a valid X/Twitter URL')
      .optional(),
    
    telegram_url: z.string()
      .url('Invalid Telegram URL')
      .refine(url => url.includes('t.me'), 'Must be a valid Telegram URL')
      .optional()
  }),

  // Trading validation
  tradeAmount: z.number()
    .positive('Trade amount must be positive')
    .max(1000, 'Trade amount too large')
    .refine(val => val >= 0.001, 'Minimum trade amount is 0.001 SOL'),

  // Slippage validation
  slippage: z.number()
    .min(0.1, 'Minimum slippage is 0.1%')
    .max(50, 'Maximum slippage is 50%'),

  // Priority fee validation
  priorityFee: z.number()
    .min(0, 'Priority fee cannot be negative')
    .max(0.1, 'Priority fee too high'),

  // Message content validation (for chat/copilot)
  messageContent: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long')
    .refine(content => !containsHarmfulContent(content), 'Message contains inappropriate content'),

  // Profile validation
  profile: z.object({
    username: z.string()
      .min(3, 'Username too short')
      .max(20, 'Username too long')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .optional(),
    
    avatar_url: z.string()
      .url('Invalid avatar URL')
      .optional()
  })
};

// Rate limiting utilities
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private limits = {
    tokenCreation: { requests: 5, windowMs: 3600000 }, // 5 per hour
    trading: { requests: 100, windowMs: 60000 }, // 100 per minute
    api: { requests: 1000, windowMs: 60000 }, // 1000 per minute
    message: { requests: 50, windowMs: 60000 } // 50 per minute
  };

  isAllowed(key: string, type: keyof typeof this.limits): boolean {
    const limit = this.limits[type];
    const now = Date.now();
    const record = this.requests.get(key);

    // Clean up expired records
    if (record && now > record.resetTime) {
      this.requests.delete(key);
    }

    const currentRecord = this.requests.get(key);
    
    if (!currentRecord) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + limit.windowMs
      });
      return true;
    }

    if (currentRecord.count >= limit.requests) {
      return false;
    }

    currentRecord.count++;
    return true;
  }

  getRemainingRequests(key: string, type: keyof typeof this.limits): number {
    const limit = this.limits[type];
    const record = this.requests.get(key);
    
    if (!record || Date.now() > record.resetTime) {
      return limit.requests;
    }

    return Math.max(0, limit.requests - record.count);
  }

  getResetTime(key: string): number {
    const record = this.requests.get(key);
    return record ? record.resetTime : Date.now();
  }

  clear(): void {
    this.requests.clear();
  }
}

// Content filtering
function containsHarmfulContent(content: string): boolean {
  const harmfulPatterns = [
    /hack|exploit|vulnerability/i,
    /private.?key|seed.?phrase|mnemonic/i,
    /spam|scam|phishing/i,
    /<script|javascript:|data:/i,
    /\b(?:fuck|shit|damn|bitch)\b/i // Basic profanity filter
  ];

  return harmfulPatterns.some(pattern => pattern.test(content));
}

// XSS protection utilities
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
};

// CSRF token management
class CSRFManager {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // Generate new token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    this.token = Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('');
    this.tokenExpiry = Date.now() + 3600000; // 1 hour

    return this.token;
  }

  validateToken(token: string): boolean {
    return this.token === token && Date.now() < this.tokenExpiry;
  }
}

// Security headers utility
export const getSecurityHeaders = () => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.helius.xyz https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
};

// Vulnerability scanner
export const scanForVulnerabilities = () => {
  const vulnerabilities: string[] = [];

  // Check for common security issues
  if (typeof window !== 'undefined') {
    // Check for exposed debugging tools
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      vulnerabilities.push('React DevTools detected in production');
    }

    // Check for console methods that might leak information
    if (console.log.toString().includes('native code')) {
      // Console hasn't been overridden, which is good for debugging but bad for production
    }

    // Check for localStorage/sessionStorage usage with sensitive data
    try {
      const localStorage = window.localStorage;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('key') || key.includes('secret') || key.includes('token'))) {
          vulnerabilities.push(`Potentially sensitive data in localStorage: ${key}`);
        }
      }
    } catch (e) {
      // localStorage might not be available
    }

    // Check for mixed content
    if (location.protocol === 'https:' && document.querySelector('script[src^="http:"]')) {
      vulnerabilities.push('Mixed content detected: HTTP scripts on HTTPS page');
    }
  }

  return vulnerabilities;
};

// Global instances
export const rateLimiter = new RateLimiter();
export const csrfManager = new CSRFManager();

// Validation helper
export const validateAndSanitize = <T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => e.message).join(', ')
      };
    }
    return { success: false, error: 'Validation failed' };
  }
};

// Security monitoring
export const logSecurityEvent = (event: {
  type: 'validation_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 'vulnerability_detected';
  details: string;
  userAgent?: string;
  ip?: string;
}) => {
  const securityLog = {
    ...event,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: event.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown')
  };

  console.warn('Security Event:', securityLog);
  
  // In production, send to security monitoring service
  // await fetch('/api/security-log', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(securityLog)
  // });
};