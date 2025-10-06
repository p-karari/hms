// src/app/dashboard/layout.jsx

import { DashboardSidebar } from "@/components/layout/DashboardSideBar";
import { Topbar } from "@/components/layout/TopBar";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { getOpenMRSSessionDetails, getPrivilegesForUser } from "@/lib/openmrs-api/session";

// NOTE: It's a nested layout, so we'll rename the component to DashboardLayout 
// for conceptual clarity, though the export default is what matters.
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
  
  // FIX: Explicitly include a placeholder for the required setter function 
  // to satisfy the Omit<SessionContextType, "hasPrivilege"> type check.
  const initialSession = {
    ...coreData,
    privileges,
    isAuthenticated: coreData.authenticated,
    
    // This no-op function is added solely to make TypeScript happy, 
    // as the real function is created inside SessionProvider.
    setSessionLocationContext: () => {}, 
  };
  
  return (
    <SessionProvider initialSession={initialSession}>
      
      {/* Main Dashboard Layout Structure (Flex Container) */}
      {/* Removed w-[25rem] to allow the layout to use the full screen width */}
      <div className="flex min-h-screen w-full">
        
        {/* 1. Sidebar Component (Fixed on the left, but takes up NO space in flow) */}
        <DashboardSidebar /> 

        {/* Content Area (Requires Margin Offset) */}
        {/* FIX: Added ml-64 (margin-left: 16rem) to push content past the fixed sidebar. */}
        <div className="flex-1 flex flex-col ml-64">
          
          {/* 2. Topbar Component */}
          {/* Topbar will now start exactly where the main content begins (ml-64) */}
          <Topbar /> 
          
          {/* 3. Main Content Wrapper */}
          <main className="flex-1 p-6 overflow-y-auto">
            {children} {/* This renders the content of pages like /dashboard/patients */}
          </main>
        </div>
      </div>
      
    </SessionProvider>
  );
}