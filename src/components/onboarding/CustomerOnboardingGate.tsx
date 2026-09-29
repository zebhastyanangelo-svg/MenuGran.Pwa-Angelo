import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, TABLE_NAMES } from '../../services/supabase';
import { OnboardingModal } from './OnboardingModal';
import { isOnboardingCompleted, markOnboardingCompleted } from './onboardingStorage';

/** Persiste la marca de onboarding en el perfil de Supabase (best-effort). */
async function persistOnboardingInProfile(userId: string): Promise<void> {
  try {
    await supabase
      .from(TABLE_NAMES.profiles)
      .update({ onboarding_completed: true })
      .eq('id', userId);
  } catch {
    // Best-effort: la marca en localStorage es la fuente principal.
  }
}

/**
 * Muestra el tutorial de onboarding ÚNICAMENTE la primera vez que entra
 * un cliente (rol customer), guardando `menugram_onboarding_completed: true`
 * en localStorage y, de forma best-effort, en el perfil de Supabase.
 */
export function CustomerOnboardingGate() {
  const { user, profile, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isLoading || user === null || profile === null) return;
    if (profile.role !== 'customer') return;
    if (isOnboardingCompleted() || profile.onboarding_completed === true) return;
    setShowOnboarding(true);
  }, [isLoading, user, profile]);

  const handleFinish = () => {
    setShowOnboarding(false);
    markOnboardingCompleted();
    if (user !== null) {
      void persistOnboardingInProfile(user.id);
    }
  };

  if (!showOnboarding) return null;

  return <OnboardingModal onFinish={handleFinish} />;
}
