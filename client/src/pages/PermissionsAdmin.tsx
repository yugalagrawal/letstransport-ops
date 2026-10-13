import { useState, useEffect, useRef } from 'react';
import { ROLE_LABELS } from '../hooks/useAuth';
import type { Role } from '../hooks/useAuth';

interface FunctionDef {
  id: string;
  label: string;
  module: string;
}

interface UserPerm {
  email: string;
  name: string;
  role: Role;
  roles: Role[];
  appliedRoles: Role[];
  functions: string[];
  cities: string[];
  hasOverride: boolean;
}

interface Meta {
  functions: FunctionDef[];
  roleDefaults: Record<string, string[]>;
  cities: string[];
}

export default function PermissionsAdmin() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [users, setUsers] = useState<UserPerm[]>([]);
  const [selected, setSelected] = useState<UserPerm | null>(null);
  const [draftFns, setDraftFns] = useState<Set<string>>(new Set());
  const [appliedRoles, setAppliedRoles] = useState<Role[]>([]);
  const [draftCities, setDraftCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/permissions/meta').then(r => r.json()),
      fetch('/api/permissions/users').then(r => r.json()),
    ]).then(([m, u]) => {
      setMeta(m);
      setUsers(u);
    });
  }, []);

  function selectUser(u: UserPerm) {
    setSelected(u);
    setDraftFns(new Set(u.functions));
    setAppliedRoles(u.appliedRoles);
    setDraftCities(u.cities ?? []);
    setCitySearch('');
    setCityDropdownOpen(false);
    setSaved(false);
  }

  function toggleCity(city: string) {
    setDraftCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
    setSaved(false);
  }

  function applyRolePreset(role: Role) {
    if (!meta) return;
    const roleFns = meta.roleDefaults[role] ?? [];
    const merged = new Set([...draftFns, ...roleFns]);
    setDraftFns(merged);
    setAppliedRoles(prev => prev.includes(role) ? prev : [...prev, role]);
  }

  function removeRolePreset(role: Role) {
    if (!meta) return;
    const roleFns = new Set(meta.roleDefaults[role] ?? []);
    // remove only fns that aren't covered by other applied roles
    const remainingRoles = appliedRoles.filter(r => r !== role);
    const stillNeeded = new Set(remainingRoles.flatMap(r => meta.roleDefaults[r] ?? []));
    const next = new Set([...draftFns].filter(f => stillNeeded.has(f) || !roleFns.has(f)));
    setDraftFns(next);
    setAppliedRoles(remainingRoles);
  }

  function toggleFn(id: string) {
    setDraftFns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/permissions/user/${encodeURIComponent(selected.email)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appliedRoles, functions: [...draftFns], cities: draftCities }),
    });
    // refresh list
    const updated: UserPerm[] = await fetch('/api/permissions/users').then(r => r.json());
    setUsers(updated);
    const refreshed = updated.find(u => u.email === selected.email)!;
    setSelected(refreshed);
    setSaving(false);
    setSaved(true);
  }

  async function revert() {
    if (!selected) return;
    await fetch(`/api/permissions/user/${encodeURIComponent(selected.email)}`, { method: 'DELETE' });
    const updated: UserPerm[] = await fetch('/api/permissions/users').then(r => r.json());
    setUsers(updated);
    const refreshed = updated.find(u => u.email === selected.email)!;
    selectUser(refreshed);
  }

  const cityDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allRoles = Object.keys(ROLE_LABELS) as Role[];

  const modules = meta
    ? [...new Set(meta.functions.map(f => f.module))]
    : [];

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — user list */}
      <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-brand-navy mb-2">User Accounts</h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-brand-orange/50"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map(u => (
            <button
              key={u.email}
              onClick={() => selectUser(u)}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                selected?.email === u.email ? 'bg-brand-orange/5 border-l-2 border-l-brand-orange' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {u.appliedRoles.map(r => ROLE_LABELS[r] ?? r).join(', ')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {u.hasOverride && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      Custom
                    </span>
                  )}
                  {u.cities?.length > 0 && (
                    <span className="text-[9px] bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded-full">
                      {u.cities.length} {u.cities.length === 1 ? 'city' : 'cities'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — edit */}
      {selected ? (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-5">
          {/* User header */}
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-brand-navy text-sm">{selected.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{selected.email}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Active role: <span className="font-medium text-brand-navy">{ROLE_LABELS[selected.role] ?? selected.role}</span>
                {selected.roles.length > 1 && (
                  <span className="ml-1 text-slate-400">
                    + {selected.roles.length - 1} more switchable
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {selected.hasOverride && (
                <button
                  onClick={revert}
                  className="text-[11px] text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Revert to role defaults
                </button>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="text-[11px] bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg px-4 py-1.5 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Permissions'}
              </button>
            </div>
          </div>

          {/* Role presets */}
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Apply Role Presets</p>
            <p className="text-[11px] text-slate-400 mb-3">
              Selecting a preset loads its default functions. You can then add or remove individual functions below.
            </p>
            <div className="flex flex-wrap gap-2">
              {allRoles.map(role => {
                const active = appliedRoles.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => active ? removeRolePreset(role) : applyRolePreset(role)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-navy hover:text-brand-navy'
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {ROLE_LABELS[role] ?? role}
                  </button>
                );
              })}
            </div>
            {appliedRoles.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-3">
                Applied: {appliedRoles.map(r => ROLE_LABELS[r] ?? r).join(' + ')}
              </p>
            )}
          </div>

          {/* City Access */}
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-600">City Access</p>
              <span className="text-[11px] text-brand-orange font-medium">
                {draftCities.length === 0 ? 'All cities (unrestricted)' : `${draftCities.length} city${draftCities.length > 1 ? 'ies' : ''} selected`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Leave empty to allow access across all cities. Selected cities restrict this user's functions to those locations only.
            </p>

            {/* Selected city chips */}
            {draftCities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {draftCities.map(city => (
                  <span key={city} className="flex items-center gap-1 text-[11px] bg-brand-navy/10 text-brand-navy px-2.5 py-1 rounded-full font-medium">
                    {city}
                    <button onClick={() => toggleCity(city)} className="text-brand-navy/50 hover:text-brand-navy leading-none ml-0.5">×</button>
                  </span>
                ))}
                <button
                  onClick={() => setDraftCities([])}
                  className="text-[10px] text-slate-400 hover:text-red-500 px-2 py-1 rounded-full border border-slate-200 hover:border-red-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Dropdown trigger */}
            <div className="relative" ref={cityDropdownRef}>
              <button
                onClick={() => setCityDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-600 hover:border-brand-orange/60 transition-colors bg-white"
              >
                <span className="text-slate-400">{cityDropdownOpen ? 'Close city selector' : 'Add cities…'}</span>
                <span className="text-slate-400">{cityDropdownOpen ? '▲' : '▼'}</span>
              </button>

              {cityDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <input
                      autoFocus
                      value={citySearch}
                      onChange={e => setCitySearch(e.target.value)}
                      placeholder="Search cities…"
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-orange/40"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {(meta?.cities ?? [])
                      .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
                      .map(city => {
                        const checked = draftCities.includes(city);
                        return (
                          <button
                            key={city}
                            onClick={() => toggleCity(city)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left ${checked ? 'text-brand-navy' : 'text-slate-600'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              checked ? 'bg-brand-orange border-brand-orange' : 'border-slate-300'
                            }`}>
                              {checked && <span className="text-white text-[8px] leading-none">✓</span>}
                            </div>
                            {city}
                          </button>
                        );
                      })
                    }
                  </div>
                  {(meta?.cities ?? []).filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                    <p className="text-xs text-slate-400 px-3 py-3 text-center">No cities match</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Function checklist by module */}
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">Assigned Functions</p>
              <span className="text-[11px] text-brand-orange font-medium">
                {draftFns.size} / {meta?.functions.length ?? 0} selected
              </span>
            </div>
            <div className="space-y-4">
              {modules.map(mod => {
                const fns = (meta?.functions ?? []).filter(f => f.module === mod);
                const allChecked = fns.every(f => draftFns.has(f.id));
                const someChecked = fns.some(f => draftFns.has(f.id));
                return (
                  <div key={mod}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={() => {
                          const next = new Set(draftFns);
                          if (allChecked) fns.forEach(f => next.delete(f.id));
                          else fns.forEach(f => next.add(f.id));
                          setDraftFns(next);
                        }}
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          allChecked
                            ? 'bg-brand-orange border-brand-orange'
                            : someChecked
                            ? 'bg-brand-orange/40 border-brand-orange/60'
                            : 'border-slate-300'
                        }`}
                      >
                        {(allChecked || someChecked) && (
                          <span className="text-white text-[8px] leading-none">{allChecked ? '✓' : '–'}</span>
                        )}
                      </button>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{mod}</span>
                    </div>
                    <div className="ml-5 space-y-1">
                      {fns.map(f => (
                        <label key={f.id} className="flex items-center gap-2.5 cursor-pointer group">
                          <div
                            onClick={() => toggleFn(f.id)}
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              draftFns.has(f.id)
                                ? 'bg-brand-orange border-brand-orange'
                                : 'border-slate-300 group-hover:border-slate-400'
                            }`}
                          >
                            {draftFns.has(f.id) && (
                              <span className="text-white text-[8px] leading-none">✓</span>
                            )}
                          </div>
                          <span
                            onClick={() => toggleFn(f.id)}
                            className={`text-xs transition-colors ${
                              draftFns.has(f.id) ? 'text-slate-800' : 'text-slate-400'
                            }`}
                          >
                            {f.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center text-slate-400">
            <div className="text-4xl mb-3">🔐</div>
            <p className="text-sm font-medium">Select a user to manage permissions</p>
            <p className="text-xs mt-1">Changes take effect on their next page load</p>
          </div>
        </div>
      )}
    </div>
  );
}
