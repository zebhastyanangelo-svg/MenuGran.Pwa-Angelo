export interface ProfileLike {
  phone?: string | null;
  ci?: string | null;
}

export function isProfileIncomplete(profile: ProfileLike | null): boolean {
  if (profile === null) return false;
  return !profile.phone || !profile.ci;
}
