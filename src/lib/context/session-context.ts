'use client'
import { createContext } from "react";

export interface SessionContextType {
  user: {
    uuid: string;
    display: string;
    username: string | null;
    systemId: string;
    person: {
      uuid: string;
      display: string;
    };
    roles: Array<{
      uuid: string;
      display: string;
      name?: string;
    }>;
    privileges: Array<{
      uuid: string;
      display: string;
    }>;
    userProperties?: Record<string, any>;
  };
  sessionLocation: {
    uuid: string;
    display: string;
  };
  locale: string;
  allowedLocales: string[];
  currentProvider?: {
    uuid: string;
    display: string;
  };
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
    username: null,
    systemId: '',
    person: {
      uuid: '',
      display: ''
    },
    roles: [],
    privileges: [],
    userProperties: {}
  },
  sessionLocation: {
    uuid: '',
    display: 'No Location Set',
  },
  locale: 'en',
  allowedLocales: ['en'],
  hasPrivilege: () => false,
  setSessionLocationContext: () => {}
}

export const SessionContext = createContext<SessionContextType>(
  DEFAULT_SESSION_CONTEXT
);