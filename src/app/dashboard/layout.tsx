// src/app/dashboard/layout.jsx

import { DashboardSidebar } from "@/components/layout/DashboardSideBar";
import { Topbar } from "@/components/layout/TopBar";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { getOpenMRSSessionDetails, getPrivilegesForUser } from "@/lib/openmrs-api/session";

export default async function DashboardLayout({ 
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const session = await getOpenMRSSessionDetails();
  const privileges = session.authenticated
    ? await getPrivilegesForUser(session.user.uuid)
    : [];
  
  // Transform to match SessionContextType structure
  const initialSession = {
    isAuthenticated: session.authenticated,
    authenticated: session.authenticated,
    user: {
      uuid: session.user.uuid,
      display: session.user.display, // Keep as-is for now
      username: null, // Not available in current API
      systemId: session.user.uuid, // Fallback to UUID
      person: {
        uuid: session.user.uuid, // Person UUID not available, use user UUID
        display: session.user.display,
      },
      roles: session.user.roles,
      privileges: privileges.map(p => ({ uuid: '', display: p })), // Convert string[] to {uuid, display}[]
      userProperties: {},
    },
    sessionLocation: session.sessionLocation,
    locale: 'en',
    allowedLocales: ['en'],
    privileges: privileges, // Keep the string array as separate property if needed
  };
  
  return (
    <SessionProvider initialSession={initialSession}>
      
      {/* Main Dashboard Layout Structure */}
      <div className="flex min-h-screen w-full bg-gray-50">
        
        {/* Fixed Sidebar */}
        <DashboardSidebar /> 

        {/* Content Area - Adjusted for sidebar width */}
        <div className="flex-1 flex flex-col lg:ml-56 min-w-0">
          
          {/* Sticky Topbar */}
          <Topbar /> 
          
          {/* Main Content Area with proper padding and constraints */}
          <main className="flex-1 overflow-y-auto">
            <div className="w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
      
    </SessionProvider>
  );
}