'use client'
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


export const SessionContext = createContext<SessionContextType>(
    DEFAULT_SESSION_CONTEXT
);