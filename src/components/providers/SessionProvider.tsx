'use client'

import { SessionContext, SessionContextType } from "@/lib/context/session-context";
import { useCallback, useState } from "react";

interface LocationUpdate {
  uuid: string;
  display: string;
}

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Omit<SessionContextType, "hasPrivilege">; // exclude hasPrivilege, we’ll add it
}) {
  const [sessionState, setSessionState] = useState<Omit<SessionContextType, "hasPrivilege">>(initialSession);

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
    (key: string) => sessionState.privileges.includes(key),
    [sessionState.privileges]
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
