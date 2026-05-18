import { useEffect, useState } from "react";
import { UserPlus, Pencil, Trash2, Check, X, Loader2, AlertCircle, Users } from "lucide-react";
import { api } from "./api";
import Layout from "./Layout";

const ROLES = ["Employee", "Manager", "Admin"];
const ROLE_BADGE = { Employee:"badge-employee", Manager:"badge-manager", Admin:"badge-admin" };
const EMPTY_FORM = { name:"", email:"", password:"", role:"Employee", mgr_id:"" };

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState("");
  const [editId, setEditId]     = useState(null);

  const managers = users.filter(u => u.role === "Manager" || u.role === "Admin");

  async function load() {
    setLoading(true); setErr("");
    try { setUsers(await api("/users")); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM); setEditId(null); setFormErr(""); setShowForm(true);
  }

  function openEdit(u) {
    setForm({ name:u.name, email:u.email, password:"", role:u.role, mgr_id:u.mgr_id||"" });
    setEditId(u.id); setFormErr(""); setShowForm(true);
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      if (editId) {
        const body = { name:form.name, role:form.role, mgr_id:form.mgr_id||null };
        if (form.password) body.password = form.password;
        await api(`/users/${editId}`, { method:"PATCH", body });
      } else {
        await api("/users", { method:"POST", body:{
          name:form.name, email:form.email, password:form.password,
          role:form.role, mgr_id:form.mgr_id||null,
        }});
      }
      setShowForm(false); await load();
    } catch (e) { setFormErr(e.message); }
    finally { setSaving(false); }
  }

  async function remove(u) {
    if (!window.confirm(`Delete ${u.name}? This will also delete their goal sheets.`)) return;
    try { await api(`/users/${u.id}`, { method:"DELETE" }); await load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <Layout
      title="User Management"
      actions={
        <button onClick={openCreate} className="btn btn-primary">
          <UserPlus size={15}/> Add User
        </button>
      }
    >
      {err && <div className="alert alert-err mb-6"><AlertCircle size={16}/>{err}</div>}

      {/* Role summary strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-8 stagger">
          {ROLES.map(role => {
            const count = users.filter(u => u.role === role).length;
            return (
              <div key={role} className="stat-card card animate-fade-up">
                <div className="flex items-center justify-between">
                  <span className="label">{role}s</span>
                  <span className={`badge ${ROLE_BADGE[role]}`}>{role}</span>
                </div>
                <div className="value">{count}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="card p-6 mb-8 animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">{editId ? "Edit User" : "Add New User"}</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={18}/></button>
          </div>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
              <input className="input" required value={form.name}
                onChange={e => setForm({...form, name:e.target.value})} placeholder="Jane Smith"/>
            </div>
            {!editId && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                <input className="input" type="email" required value={form.email}
                  onChange={e => setForm({...form, email:e.target.value})} placeholder="jane@company.com"/>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {editId ? "New Password (leave blank to keep)" : "Password *"}
              </label>
              <input className="input" type="password" required={!editId} value={form.password}
                onChange={e => setForm({...form, password:e.target.value})} placeholder="••••••••"/>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role *</label>
              <select className="input" value={form.role}
                onChange={e => setForm({...form, role:e.target.value})}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {form.role === "Employee" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reporting Manager</label>
                <select className="input" value={form.mgr_id}
                  onChange={e => setForm({...form, mgr_id:e.target.value})}>
                  <option value="">— None —</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
            )}
            {formErr && (
              <div className="sm:col-span-2">
                <div className="alert alert-err"><AlertCircle size={15}/>{formErr}</div>
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <Loader2 size={15} className="animate-spin-slow"/> : <Check size={15}/>}
                {editId ? "Save Changes" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
          <Loader2 className="animate-spin-slow" size={22}/> Loading users…
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{users.length} Users</h2>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Manager</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const mgr = users.find(m => m.id === u.mgr_id);
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                          {u.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="text-slate-500 text-sm">{u.email}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                    <td className="text-slate-500 text-sm">{mgr?.name || "—"}</td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(u)} title="Edit"
                          className="btn btn-ghost" style={{ padding:"6px 9px" }}>
                          <Pencil size={14}/>
                        </button>
                        {u.role !== "Admin" && (
                          <button onClick={() => remove(u)} title="Delete"
                            className="btn btn-ghost text-red-500 hover:bg-red-50" style={{ padding:"6px 9px" }}>
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
