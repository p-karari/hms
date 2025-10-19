'use client'

import { SessionContext, SessionContextType } from "@/lib/context/session-context";
import { useCallback, useState } from "react";

interface LocationUpdate {
  uuid: string;
  display: string;
}

// Define the type for the serializable data passed from the server.
// It omits BOTH functions: hasPrivilege and setSessionLocationContext.
type SerializableSessionData = Omit<
  SessionContextType,
  "hasPrivilege" | "setSessionLocationContext"
>;

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: SerializableSessionData; // <--- UPDATED TYPE
}) {
  // Use the serializable data type for the internal state
  const [sessionState, setSessionState] = useState<SerializableSessionData>(initialSession);

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

  // The context value is the full SessionContextType, combining the state and the functions.
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