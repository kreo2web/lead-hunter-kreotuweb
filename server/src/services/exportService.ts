import * as XLSX from 'xlsx';

export function formatLeadsForExport(leads: any[]) {
  return leads.map((lead) => ({
    'Nombre del Negocio': lead.name || '',
    'Prioridad Ranking': lead.rankingLevel || '',
    'Puntaje Oportunidad': lead.rankingScore || 0,
    'Teléfono': lead.phone || '',
    'Enlace WhatsApp': lead.cleanPhone ? `https://wa.me/${lead.cleanPhone}` : '',
    'Correo Electrónico': lead.email || '',
    'Sitio Web': lead.website || 'Sin Sitio Web',
    'Auditoría / Diagnóstico': lead.websiteAuditNotes || '',
    'Instagram': lead.socialInstagram || '',
    'Facebook': lead.socialFacebook || '',
    'LinkedIn': lead.socialLinkedin || '',
    'TikTok': lead.socialTiktok || '',
    'Dirección': lead.address || '',
    'Ciudad': lead.city || '',
    'Categoría': lead.category || '',
    'Calificación': lead.rating || '',
    'Total Reseñas': lead.reviewsCount || 0,
    'Estado': lead.status || 'NUEVO',
    'Notas': lead.notes || '',
    'Ficha Google Maps': lead.googleMapsUrl || '',
  }));
}

export function generateExcelBuffer(leads: any[]): Buffer {
  const data = formatLeadsForExport(leads);
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-adjust column widths
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospectos Kreotuweb');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function generateCsvString(leads: any[]): string {
  const data = formatLeadsForExport(leads);
  const worksheet = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(worksheet);
}
