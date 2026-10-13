export type Role = 'SALES' | 'OPS' | 'ADMIN' | 'Sales_admin' | 'BizFin_admin' | 'OPM' | 'FieldOps' | 'CDE_UPC' | 'CRE' | 'Tripsheet_exec' | 'Payment_exec' | 'FQLC';

export const ROLE_LABELS: Record<Role, string> = {
  SALES:          'COB Executive',
  OPS:            'Ops',
  ADMIN:          'Permission Admin',
  Sales_admin:    'COB Admin',
  BizFin_admin:   'BizFin Executive',
  OPM:            'OPM',
  FieldOps:       'Field Ops F.O.',
  CDE_UPC:        'CDE (Upcountry)',
  CRE:            'CRE (Intra)',
  Tripsheet_exec: 'Tripsheet Executive',
  Payment_exec:   'Payment Executive',
  FQLC:           'FQLC',
};

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
  roles?: Role[];
}

const KEY = 'lt_ops_user';

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(KEY);
}

export function switchRole(role: Role): void {
  const user = getUser();
  if (!user) return;
  setUser({ ...user, role });
}

const PERMS_KEY = 'lt_ops_permissions';

export function cachePermissions(fns: string[]): void {
  localStorage.setItem(PERMS_KEY, JSON.stringify(fns));
}

export function hasFunction(fn: string): boolean {
  try {
    const raw = localStorage.getItem(PERMS_KEY);
    if (!raw) return false;
    const fns: string[] = JSON.parse(raw);
    return fns.includes(fn);
  } catch {
    return false;
  }
}
