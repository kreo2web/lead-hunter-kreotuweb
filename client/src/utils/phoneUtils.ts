import { Lead, PhoneOption } from '../types';

export function getLeadPhoneOptions(lead: Lead | null): PhoneOption[] {
  if (!lead) return [];
  const options: PhoneOption[] = [];

  if (lead.phonesJson) {
    try {
      const parsed = JSON.parse(lead.phonesJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.phone && item.cleanPhone) {
            options.push({
              phone: item.phone,
              cleanPhone: item.cleanPhone,
              source: item.source || 'Detectado',
              isDefault: item.isDefault || false,
            });
          }
        }
      }
    } catch {}
  }

  // Ensure current active lead.phone is included
  if (lead.phone && lead.cleanPhone) {
    const exists = options.find((o) => o.cleanPhone === lead.cleanPhone);
    if (!exists) {
      options.unshift({
        phone: lead.phone,
        cleanPhone: lead.cleanPhone,
        source: lead.phoneSource || 'Google Maps',
        isDefault: true,
      });
    } else {
      exists.isDefault = true;
    }
  }

  // Ensure socialPhone is included if distinct
  if (lead.socialPhone) {
    const cleanSocial = lead.socialPhone.replace(/[^0-9]/g, '');
    if (cleanSocial && !options.some((o) => o.cleanPhone === cleanSocial)) {
      options.push({
        phone: lead.socialPhone,
        cleanPhone: cleanSocial,
        source: 'Redes Sociales',
        isDefault: options.length === 0,
      });
    }
  }

  return options;
}
