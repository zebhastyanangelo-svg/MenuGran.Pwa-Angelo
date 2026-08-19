import { describe, it, expect } from 'vitest';
import { supabase } from './services/supabase';

describe('Direct supabase auth test', () => {
  it('should test supabase client', async () => {
    // Just test that the supabase client is importable
    expect(supabase).toBeDefined();
  });
});
