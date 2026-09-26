import React, { useState, useEffect } from 'react';
import { User, AuthUser } from '../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  User as UserIcon,
  Trash2,
  Edit2,
  Lock,
  Mail,
  Globe,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Save,
  Key,
} from 'lucide-react';

interface UsersManagerProps {
  currentUser: AuthUser | null;
  authToken: string | null;
}

export const UsersManager: React.FC<UsersManagerProps> = ({ currentUser, authToken }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    companyName: '',
    companyWebsite: '',
    senderName: '',
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: 'false',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${authToken || localStorage.getItem('lead_hunter_token') || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json();
        setFeedback({ success: false, message: err.error || 'Error cargando usuarios' });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: `Error de red: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      companyName: '',
      companyWebsite: '',
      senderName: '',
      smtpHost: '',
      smtpPort: '587',
      smtpSecure: 'false',
      smtpUser: '',
      smtpPass: '',
      smtpFrom: '',
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // leave empty unless changing
      role: user.role,
      companyName: user.companyName || '',
      companyWebsite: user.companyWebsite || '',
      senderName: user.senderName || '',
      smtpHost: user.smtpHost || '',
      smtpPort: user.smtpPort || '587',
      smtpSecure: user.smtpSecure || 'false',
      smtpUser: user.smtpUser || '',
      smtpPass: '', // leave empty unless changing
      smtpFrom: user.smtpFrom || '',
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const token = authToken || localStorage.getItem('lead_hunter_token') || '';
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    try {
      if (editingUser) {
        // Update existing user
        const payload: any = {
          role: formData.role,
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite,
          senderName: formData.senderName,
          smtpHost: formData.smtpHost,
          smtpPort: formData.smtpPort,
          smtpSecure: formData.smtpSecure,
          smtpUser: formData.smtpUser,
          smtpFrom: formData.smtpFrom,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        if (formData.smtpPass.trim()) {
          payload.smtpPass = formData.smtpPass.trim();
        }

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback({ success: true, message: 'Usuario actualizado exitosamente.' });
          setIsModalOpen(false);
          fetchUsers();
        } else {
          setFeedback({ success: false, message: data.error || 'Error al actualizar usuario.' });
        }
      } else {
        // Create new user
        if (!formData.username.trim() || !formData.password.trim()) {
          setFeedback({ success: false, message: 'Nombre de usuario y contraseña son requeridos.' });
          setSaving(false);
          return;
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers,
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback({ success: true, message: `Usuario "${formData.username}" creado exitosamente.` });
          setIsModalOpen(false);
          fetchUsers();
        } else {
          setFeedback({ success: false, message: data.error || 'Error al crear usuario.' });
        }
      }
    } catch (err: any) {
      setFeedback({ success: false, message: `Error: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar al usuario "${user.username}"? Sus prospectos y plantillas personalizadas ya no estarán asociadas.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken || localStorage.getItem('lead_hunter_token') || ''}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ success: true, message: `Usuario "${user.username}" eliminado.` });
        fetchUsers();
      } else {
        setFeedback({ success: false, message: data.error || 'Error al eliminar usuario.' });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: `Error: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Gestión de Usuarios</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Crea y administra cuentas para tu equipo o clientes. Cada usuario cuenta con su propio servidor SMTP, datos de empresa y prospecciones independientes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-brand-500/20 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Alert / feedback */}
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

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Cargando lista de usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No hay usuarios registrados</p>
            <p className="text-xs text-slate-400 mt-1">Crea el primer usuario haciendo clic en "Crear Usuario".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Usuario</th>
                  <th className="px-6 py-3.5">Rol</th>
                  <th className="px-6 py-3.5">Empresa / Remitente</th>
                  <th className="px-6 py-3.5">Servidor SMTP</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = currentUser?.userId === u.id;
                  const hasSmtp = Boolean(u.smtpHost && u.smtpUser);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{u.username}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">ID: {u.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                            Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            <UserIcon className="w-3 h-3 text-sky-600" />
                            Usuario
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-800">{u.companyName || 'Sin empresa'}</p>
                          <p className="text-[11px] text-slate-500">{u.senderName || 'Remitente no definido'}</p>
                          {u.companyWebsite && (
                            <a
                              href={u.companyWebsite}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-brand-600 hover:underline block"
                            >
                              {u.companyWebsite}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {hasSmtp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {u.smtpHost}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            No configurado
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Editar usuario y SMTP"
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isCurrent}
                            title={isCurrent ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-100 my-8">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-brand-600 via-brand-700 to-sky-800 text-white relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-2 shadow-inner">
                {editingUser ? <Edit2 className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
              </div>
              <h3 className="text-lg font-bold tracking-tight">
                {editingUser ? `Editar Usuario: ${editingUser.username}` : 'Crear Nuevo Usuario'}
              </h3>
              <p className="text-xs text-sky-100 mt-0.5">
                Configura los accesos, datos de marca y servidor SMTP personalizado para este usuario.
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Account Credentials */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-brand-600" />
                  Credenciales de Acceso
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario *</label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingUser)}
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="ej. carlos_agencia"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Dejar en blanco para conservar' : '••••••••'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rol</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                    >
                      <option value="user">Usuario Estándar</option>
                      <option value="admin">Administrador Total</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Company / Brand Details */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-brand-600" />
                  Datos de Marca y Empresa
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Empresa</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="ej. Mi Agencia Web"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sitio Web</label>
                    <input
                      type="text"
                      value={formData.companyWebsite}
                      onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                      placeholder="https://miagencia.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Remitente</label>
                    <input
                      type="text"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      placeholder="Carlos - Asesor Web"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* SMTP Settings */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  Servidor SMTP Personalizado
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Host SMTP</label>
                    <input
                      type="text"
                      value={formData.smtpHost}
                      onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com o mail.miweb.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Puerto</label>
                    <input
                      type="text"
                      value={formData.smtpPort}
                      onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                      placeholder="587"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <label className="flex items-center gap-2 pb-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.smtpSecure === 'true'}
                        onChange={(e) =>
                          setFormData({ ...formData, smtpSecure: e.target.checked ? 'true' : 'false' })
                        }
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>SSL Seguro</span>
                    </label>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario / Email SMTP</label>
                    <input
                      type="text"
                      value={formData.smtpUser}
                      onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                      placeholder="contacto@miweb.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {editingUser ? 'Contraseña SMTP (Opcional)' : 'Contraseña SMTP'}
                    </label>
                    <input
                      type="password"
                      value={formData.smtpPass}
                      onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                      placeholder={editingUser ? '••••••••' : 'Contraseña o App Password'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-12">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Remitente (From)</label>
                    <input
                      type="text"
                      value={formData.smtpFrom}
                      onChange={(e) => setFormData({ ...formData, smtpFrom: e.target.value })}
                      placeholder="Mi Agencia <contacto@miweb.com>"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-brand-500/20 cursor-pointer disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
