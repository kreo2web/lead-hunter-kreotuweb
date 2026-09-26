export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  cleanPhone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  searchQuery?: string | null;
  rating: number | null;
  reviewsCount: number | null;
  googleMapsUrl: string;
  placeId: string;
  email: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialTiktok: string | null;
  socialTwitter: string | null;
  hasWebsite: boolean | number;
  isOutdatedWebsite: boolean | number;
  websiteAuditNotes: string | null;
  rankingScore: number;
  rankingLevel: 'ALTO' | 'MEDIO' | 'BAJO';
  status: 'NUEVO' | 'CONTACTADO_WA' | 'CONTACTADO_EMAIL' | 'INTERESADO' | 'DESCARTADO' | 'CERRADO';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  type: 'WHATSAPP' | 'EMAIL';
  targetRanking: 'ALTO' | 'MEDIO' | 'BAJO' | 'TODOS';
  subject?: string;
  content: string;
  isDefault: number;
  createdAt: string;
}

export interface Settings {
  company_name?: string;
  company_website?: string;
  sender_name?: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_secure?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_pass_set?: string;
  smtp_from?: string;
  admin_user?: string;
  // AI WhatsApp bot settings
  gemini_api_key?: string;
  openai_api_key?: string;
  wa_bot_enabled?: boolean;
  wa_bot_name?: string;
  wa_bot_instructions?: string;
  wa_bot_faq_json?: string;
  wa_bot_provider?: 'gemini' | 'openai';
  // Social media search settings
  social_fb_cookie?: string;
  social_ig_cookie?: string;
}

export interface WaChat {
  id: string;
  phone: string;
  leadId?: string;
  leadName?: string;
  rankingLevel?: 'ALTO' | 'MEDIO' | 'BAJO';
  botActive: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface WaMessage {
  id: string;
  chatId: string;
  sender: 'lead' | 'bot' | 'me';
  content: string;
  timestamp: string;
}

export interface Stats {
  total: number;
  alto: number;
  medio: number;
  bajo: number;
  withPhone: number;
  withEmail: number;
  contacted: number;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  companyName?: string;
  companyWebsite?: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpSecure?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  createdAt?: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}
