export interface AuditResult {
  hasWebsite: boolean;
  isOutdatedWebsite: boolean;
  isSocialAsWebsite?: boolean;
  socialPlatformName?: string | null;
  websiteAuditNotes: string;
  rankingScore: number;
  rankingLevel: 'ALTO' | 'MEDIO' | 'BAJO';
}

const SOCIAL_DOMAINS = [
  { domain: 'facebook.com', name: 'Facebook' },
  { domain: 'fb.com', name: 'Facebook' },
  { domain: 'instagram.com', name: 'Instagram' },
  { domain: 'linktr.ee', name: 'Linktree' },
  { domain: 'tiktok.com', name: 'TikTok' },
  { domain: 'twitter.com', name: 'Twitter' },
  { domain: 'x.com', name: 'X (Twitter)' },
  { domain: 'linkedin.com', name: 'LinkedIn' },
  { domain: 'wa.me', name: 'WhatsApp' },
  { domain: 'whatsapp.com', name: 'WhatsApp' },
  { domain: 'youtube.com', name: 'YouTube' },
];

export function checkIsSocialUrl(url: string | null | undefined): { isSocial: boolean; platform: string | null } {
  if (!url) return { isSocial: false, platform: null };
  const lower = url.toLowerCase();
  for (const item of SOCIAL_DOMAINS) {
    if (lower.includes(item.domain)) {
      return { isSocial: true, platform: item.name };
    }
  }
  return { isSocial: false, platform: null };
}

export function calculateRanking(
  hasWebsite: boolean,
  audit?: {
    hasSsl?: boolean;
    isResponsive?: boolean;
    copyrightYear?: number | null;
    isSlowOrFailing?: boolean;
    detectedIssues?: string[];
    isSocialAsWebsite?: boolean;
    socialPlatformName?: string | null;
  }
): AuditResult {
  // If using social media profile as website -> Top opportunity (ALTO)
  if (audit?.isSocialAsWebsite) {
    const platform = audit.socialPlatformName || 'red social';
    return {
      hasWebsite: false,
      isOutdatedWebsite: false,
      isSocialAsWebsite: true,
      socialPlatformName: platform,
      websiteAuditNotes: `No tiene sitio web propio; utiliza su perfil de ${platform} como página de contacto. Oportunidad ideal para venderle un sitio web profesional e independiente.`,
      rankingScore: 98,
      rankingLevel: 'ALTO',
    };
  }

  if (!hasWebsite) {
    return {
      hasWebsite: false,
      isOutdatedWebsite: false,
      websiteAuditNotes: 'No tiene sitio web oficial en Google Maps. Oportunidad alta para venta de desarrollo web.',
      rankingScore: 95,
      rankingLevel: 'ALTO',
    };
  }

  const issues: string[] = audit?.detectedIssues || [];
  const currentYear = new Date().getFullYear();

  if (audit?.hasSsl === false) {
    issues.push('Sitio sin certificado SSL seguro (HTTP no seguro)');
  }

  if (audit?.isResponsive === false) {
    issues.push('No está optimizado para dispositivos móviles (sin viewport adaptativo)');
  }

  if (audit?.copyrightYear && audit.copyrightYear < currentYear - 2) {
    issues.push(`Copyright desactualizado (Año ${audit.copyrightYear})`);
  }

  if (audit?.isSlowOrFailing) {
    issues.push('Sitio web caído, inaccesible o con respuesta muy lenta');
  }

  if (issues.length > 0) {
    return {
      hasWebsite: true,
      isOutdatedWebsite: true,
      websiteAuditNotes: issues.join('. '),
      rankingScore: 70 + Math.min(issues.length * 5, 20),
      rankingLevel: 'MEDIO',
    };
  }

  return {
    hasWebsite: true,
    isOutdatedWebsite: false,
    websiteAuditNotes: 'Sitio web moderno con SSL activo y diseño responsive.',
    rankingScore: 30,
    rankingLevel: 'BAJO',
  };
}
