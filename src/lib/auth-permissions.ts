// Single source of truth for the hardcoded admin allowlist and the
// permission checks built on top of it. Import from here instead of
// redeclaring ADMIN_EMAILS locally — this file has no server-only
// dependencies, so it's safe to import from both server and client code.

export const ADMIN_EMAILS = ['arne.smets@sporthousegroup.com', 'deryan.spiessens@sporthousegroup.com']

type PermissionUser = {
  email?: string | null
  app_metadata?: { permissions?: { sections?: string[] } } & Record<string, unknown>
} | null | undefined

export function getSections(user: PermissionUser): string[] {
  return user?.app_metadata?.permissions?.sections ?? []
}

export function isAdminUser(user: PermissionUser): boolean {
  return ADMIN_EMAILS.includes(user?.email ?? '') || getSections(user).includes('beheer')
}

export function hasSection(user: PermissionUser, section: string): boolean {
  return isAdminUser(user) || getSections(user).includes(section)
}
