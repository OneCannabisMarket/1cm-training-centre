export const ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
};

export function isAdmin(role) {
  return role === ROLE.ADMIN;
}

export function isManager(role) {
  return role === ROLE.MANAGER;
}

export function isStaff(role) {
  return role === ROLE.STAFF;
}