import React, { useState } from 'react';
import { Template } from '../types';
import { Plus, Trash2, Edit2, MessageCircle, Mail, Save, X, Eye, Code } from 'lucide-react';

interface TemplatesManagerProps {
  templates: Template[];
  onRefreshTemplates: () => void;
}

export const TemplatesManager: React.FC<TemplatesManagerProps> = ({
  templates,
  onRefreshTemplates,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'WHATSAPP' | 'EMAIL'>('ALL');
  const [previewTab, setPreviewTab] = useState<'preview' | 'code'>('preview');

  const filtered = templates.filter((t) => (filterType === 'ALL' ? true : t.type === filterType));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name || !editingTemplate.content) return;

    try {
      const isNew = !editingTemplate.id;
      const url = isNew ? '/api/templates' : `/api/templates/${editingTemplate.id}`;
      const method = isNew ? 'POST' : 'PUT';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });

      setEditingTemplate(null);
      onRefreshTemplates();
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta plantilla?')) return;
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      onRefreshTemplates();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Gestor de Plantillas de Outreach</h2>
          <p className="text-sm text-slate-500">
            Configura mensajes personalizados para WhatsApp y correos electrónicos HTML para Kreotuweb.com.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="ALL">Todas las plantillas</option>
            <option value="WHATSAPP">Solo WhatsApp</option>
            <option value="EMAIL">Solo Email HTML</option>
          </select>

          <button
            onClick={() =>
              setEditingTemplate({
                name: 'Nueva Plantilla',
                type: 'WHATSAPP',
                targetRanking: 'TODOS',
                subject: '',
                content: '',
                isDefault: 0,
              })
            }
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Plantilla</span>
          </button>
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:border-brand-200 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-xl ${
                      t.type === 'WHATSAPP' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'
                    }`}
                  >
                    {t.type === 'WHATSAPP' ? (
                      <MessageCircle className="w-4 h-4 fill-current" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Dirigido a Ranking: <strong className="text-slate-700">{t.targetRanking}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingTemplate(t)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Editar plantilla"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar plantilla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {t.subject && (
                <p className="text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1.5 rounded-lg mb-2">
                  <strong className="text-slate-700">Asunto:</strong> {t.subject}
                </p>
              )}

              <div className="bg-slate-50 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-600 whitespace-pre-wrap border border-slate-100">
                {t.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingTemplate.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de la Plantilla
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Canal</label>
                  <select
                    value={editingTemplate.type || 'WHATSAPP'}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email HTML</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ranking Objetivo
                </label>
                <select
                  value={editingTemplate.targetRanking || 'TODOS'}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, targetRanking: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="TODOS">Todos los prospectos</option>
                  <option value="ALTO">Prioridad Alta (Sin Sitio Web)</option>
                  <option value="MEDIO">Prioridad Media (Sitio Web Antiguo)</option>
                  <option value="BAJO">Prioridad Baja (Sitio Web Activo - SEO)</option>
                </select>
              </div>

              {editingTemplate.type === 'EMAIL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asunto del Correo
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contenido ({editingTemplate.type === 'EMAIL' ? 'Código HTML' : 'Texto con Formato WhatsApp'})
                </label>
                <textarea
                  rows={10}
                  required
                  value={editingTemplate.content || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Plantilla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
