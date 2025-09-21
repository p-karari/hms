// 1. Define the necessary interfaces first

import { createContext } from "react";


export interface SessionContextType {
    user: {
        uuid: string;
        display: string;
        roles: {uuid: string, display: string}[];
    };
    sessionLocation: {
        uuid:string;
        display: string;
    };
    privileges: string[];
    isAuthenticated: boolean;
    isLoading?: boolean;
    hasPrivilege: (key: string) => boolean;
    setSessionLocationContext: (location: { uuid: string; display: string }) => void;
}
// 2. Define the initial/default state object (matching the interface)
export const DEFAULT_SESSION_CONTEXT: SessionContextType = {
    isAuthenticated: false,
    user: {
        uuid: '',
        display: 'Guest User',
        roles: []
    },
    sessionLocation: {
        uuid:'',
        display: 'No Location Set',
    },
    privileges: [],
    hasPrivilege: () => false,
    setSessionLocationContext: () => {}
    
}

// 3. Initialize and export the context object using createContext()

export const SessionContext = createContext<SessionContextType>(
    DEFAULT_SESSION_CONTEXT
);