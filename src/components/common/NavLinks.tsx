// 'use client';

// import React, { useContext } from 'react';
// // ✅ FIX 1: Import official Next.js routing components/hooks
// import Link from 'next/link';
// import { usePathname } from 'next/navigation';

// // IMPORTANT: Adjust the relative path to your context file based on your folder structure!
// import { SessionContext } from '../../lib/context/session-context'; 


// interface NavLinkProps {
//     href: string;
//     label: string;
//     // The privilege required to view this link. If not provided, it's visible by default.
//     requiredPrivilege?: string; 
//     icon: React.ReactNode; 
// }

// export function NavLink({ href, label, requiredPrivilege, icon }: NavLinkProps) {
//     // ✅ FIX 2: Use the Next.js hook to safely determine the current path
//     const pathname = usePathname(); 

//     // 1. Scoop the data from the SessionContext
//     // Assuming SessionContext is safe for client-side use
//     const { isAuthenticated, sessionLocation, hasPrivilege, isLoading } = useContext(SessionContext);
    

//     // Don't show anything until the session data is loaded
//     if (isLoading) {
//         return null; 
//     }

//     // --- Visibility and Permission Checks ---

//     // Check 1: Must be authenticated
//     if (!isAuthenticated) {
//         return null;
//     }

//     // Check 2: Privilege Check
//     // If a requiredPrivilege is set AND the user doesn't have it, hide the link.
//     if (requiredPrivilege && !hasPrivilege?.(requiredPrivilege)) {
//         return null;
//     }

//     // Check 3: Location Check (Essential for most clinical apps)
//     const isLocationSet = !!sessionLocation?.uuid;
//     // Assume any link requiring a 'Task:' privilege needs a location set.
//     const requiresLocation = requiredPrivilege && requiredPrivilege.startsWith('Task:');

//     if (requiresLocation && !isLocationSet) {
//         // If a clinical task is required but no location is set, hide the link.
//         return null; 
//     }

//     // --- Styling and Rendering ---

//     // Determine active state for styling
//     // Use startsWith for dynamic routes like /dashboard/patients/[uuid]
//     const isActive = pathname.startsWith(href);

//     const baseClasses = 'flex items-center p-3 my-2 transition-colors duration-200 rounded-lg text-sm font-medium';
//     // Use conditional classes based on active state
//     const activeClasses = 'bg-indigo-600 text-white shadow-lg';
//     const inactiveClasses = 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700';

//     return (
//         // ✅ FIX 3: Use the Next.js Link component
//         <Link 
//             href={href} 
//             className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
//         >
//             {icon && <span className="mr-3">{icon}</span>}
//             <span>{label}</span>
//         </Link>
//     );
// }

// // NOTE: The obsolete LocalLink and useCurrentPath have been removed.