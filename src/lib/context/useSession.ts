// File: src/lib/context/useSession.ts (or wherever you prefer)

'use client';

import { useContext } from 'react';
// Ensure the path below matches the location of your context file
import { SessionContext, SessionContextType } from './session-context'; 

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  // Optional: Check if the context value is the default or undefined, 
  // though typically `useContext` returns the default value if outside a provider.
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};