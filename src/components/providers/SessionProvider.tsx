'use client'

import { SessionContext, SessionContextType } from "@/lib/context/session-context";
import { getOpenMRSSession } from "@/lib/context/sessionAction";
import { useCallback, useState, useEffect } from "react";
// import { getOpenMRSSession } from "@/lib/session/sessionActions";

interface LocationUpdate {
  uuid: string;
  display: string;
}

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Omit<SessionContextType, 'hasPrivilege' | 'setSessionLocationContext'>; 
}) {
  const [sessionState, setSessionState] = useState<Omit<SessionContextType, 'hasPrivilege' | 'setSessionLocationContext'>>(initialSession);

  // Optional: Refresh session on mount
  useEffect(() => {
    const refreshSession = async () => {
      try {
        const sessionData = await getOpenMRSSession();
        if (sessionData) {
          setSessionState({
            isAuthenticated: sessionData.authenticated,
            user: {
              uuid: sessionData.user.uuid,
              display: sessionData.user.person.display, // Use person.display, not user.display
              username: sessionData.user.username,
              systemId: sessionData.user.systemId,
              person: sessionData.user.person,
              roles: sessionData.user.roles,
              privileges: sessionData.user.privileges,
              userProperties: sessionData.user.userProperties,
            },
            sessionLocation: sessionData.sessionLocation,
            locale: sessionData.locale,
            allowedLocales: sessionData.allowedLocales,
            currentProvider: sessionData.currentProvider,
          });
        }
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    };
    
    refreshSession();
  }, []);

  const setSessionLocationContext = useCallback(
    (location: LocationUpdate) => {
      setSessionState(prevState => ({
        ...prevState,
        sessionLocation: location,
      }));
    },
    []
  );

  const hasPrivilege = useCallback(
    (key: string) => {
      // Check direct privileges
      const hasDirectPrivilege = sessionState.user.privileges.some(
        privilege => privilege.display === key
      );
      
      if (hasDirectPrivilege) return true;
      
      // Check role-based access (System Developer has all privileges)
      const hasAdminRole = sessionState.user.roles.some(role => 
        role.display === 'System Developer' || 
        role.display === 'Administrator'
      );
      
      return hasAdminRole;
    },
    [sessionState.user.privileges, sessionState.user.roles]
  );

  const contextValue: SessionContextType = {
    ...sessionState,
    hasPrivilege,
    setSessionLocationContext,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}