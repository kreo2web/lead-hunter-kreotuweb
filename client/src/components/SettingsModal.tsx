import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { Save, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Mail, Globe, User, Lock, Key } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    company_name: '',
    company_website: '',
    sender_name: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('lead_hunter_token') || '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ success: true, message: 'Configuración guardada exitosamente.' });
      } else {
        setFeedback({ success: false, message: data.error || 'Error al guardar configuración.' });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: `Error de red: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings/test-smtp', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ success: true, message: '✅ ' + data.message });
      } else {
        setFeedback({ success: false, message: '❌ ' + data.message });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: `Error probando conexión: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setChangingPass(true);
    setPassFeedback(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPassFeedback({ success: true, message: 'Contraseña actualizada correctamente.' });
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPassFeedback({ success: false, message: data.error || 'Error al actualizar contraseña.' });
      }
    } catch (err: any) {
      setPassFeedback({ success: false, message: `Error de red: ${err.message}` });
    } finally {
      setChangingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Configuración del Perfil y Servidor SMTP</h2>
        <p className="text-sm text-slate-500">
          Ajusta la información de tu marca, personaliza los mensajes de prospección y conecta tu propio servidor SMTP para el envío de correos.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-600" />
            <span>Datos de Tu Agencia o Empresa (Variables de Plantillas)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Empresa {'{mi_empresa}'}
              </label>
              <input
                type="text"
                placeholder="ej. Kreotuweb.com"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sitio Web Oficial {'{mi_web}'}
              </label>
              <input
                type="text"
                placeholder="https://kreotuweb.com"
                value={settings.company_website || ''}
                onChange={(e) => setSettings({ ...settings, company_website: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Firma / Remitente {'{nombre_remitente}'}
              </label>
              <input
                type="text"
                placeholder="ej. Equipo Kreotuweb"
                value={settings.sender_name || ''}
                onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* SMTP configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-600" />
              <span>Configuración de Tu Servidor SMTP (Envío de Emails)</span>
            </h3>
            <span className="text-xs text-slate-400">Compatible con Gmail, Zoho, cPanel, Outlook</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Host */}
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Servidor SMTP (Host)
              </label>
              <input
                type="text"
                placeholder="ej. smtp.gmail.com o mail.tudominio.com"
                value={settings.smtp_host || ''}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* Port */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Puerto</label>
              <input
                type="text"
                placeholder="587 o 465"
                value={settings.smtp_port || '587'}
                onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* SSL/TLS */}
            <div className="sm:col-span-2 flex items-end">
              <label className="flex items-center gap-2 pb-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.smtp_secure === 'true'}
                  onChange={(e) =>
                    setSettings({ ...settings, smtp_secure: e.target.checked ? 'true' : 'false' })
                  }
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>SSL Seguro (465)</span>
              </label>
            </div>

            {/* Username / Email */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuario / Correo Electrónico
              </label>
              <input
                type="text"
                placeholder="tu_correo@tudominio.com"
                value={settings.smtp_user || ''}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* Password */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña / Contraseña de Aplicación
              </label>
              <input
                type="password"
                placeholder={settings.smtp_pass_set === 'true' ? '•••••••• (Guardada)' : 'Contraseña SMTP'}
                value={settings.smtp_pass || ''}
                onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* From Address */}
            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dirección de Remitente (From)
              </label>
              <input
                type="text"
                placeholder="Tu Empresa <contacto@tudominio.com>"
                value={settings.smtp_from || ''}
                onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !settings.smtp_host || !settings.smtp_user}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
              <span>Probar Conexión SMTP</span>
            </button>
          </div>
        </div>

        {/* Social Media Search Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Búsqueda de Contacto en Redes Sociales (Facebook e Instagram)</span>
            </h3>
            <span className="text-xs text-slate-400">Extracción profunda de email y teléfono</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Cuando un prospecto no tenga correo o teléfono en Google Maps, el sistema buscará automáticamente en su página de Facebook y perfil de Instagram. Puedes configurar aquí cookies de sesión opcionales para evitar que Facebook o Instagram bloqueen el acceso a perfiles cerrados.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cookie de Sesión de Facebook (Opcional)
              </label>
              <input
                type="password"
                placeholder="c_user=...; xs=...;"
                value={settings.social_fb_cookie || ''}
                onChange={(e) => setSettings({ ...settings, social_fb_cookie: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Permite inspeccionar secciones de contacto completas en Fanpages de Facebook.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cookie de Sesión de Instagram (Opcional)
              </label>
              <input
                type="password"
                placeholder="sessionid=...;"
                value={settings.social_ig_cookie || ''}
                onChange={(e) => setSettings({ ...settings, social_ig_cookie: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Permite leer biografías completas y teléfonos de cuentas profesionales de Instagram.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
              feedback.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-md shadow-brand-500/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>

      {/* Change Password Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-600" />
          <span>Cambiar Contraseña de Acceso</span>
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña Actual
              </label>
              <input
                type="password"
                required
                placeholder="Tu contraseña actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Nueva contraseña deseada"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {passFeedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                passFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {passFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{passFeedback.message}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPass || !currentPassword || !newPassword}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {changingPass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>Actualizar Contraseña</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
