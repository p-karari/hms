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
  const coreData = await getOpenMRSSessionDetails();
  const privileges = session.authenticated
    ? await getPrivilegesForUser(session.user.uuid)
    : [];
  
  const initialSession = {
    ...coreData,
    privileges,
    isAuthenticated: coreData.authenticated,
  };
  
  return (
    <SessionProvider initialSession={initialSession}>
      
      {/* Main Dashboard Layout Structure */}
      <div className="flex min-h-screen w-full bg-gray-50">
        
        {/* Fixed Sidebar */}
        <DashboardSidebar /> 

        {/* Content Area - Adjusted for sidebar width */}
        <div className="flex-1 flex flex-col ml-64 min-w-0">
          
          {/* Sticky Topbar */}
          <Topbar /> 
          
          {/* Main Content Area with proper padding and constraints */}
          <main className="flex-1  overflow-y-auto">
            <div className="max-w-7xl w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
      
    </SessionProvider>
  );
}