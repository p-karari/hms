// app/dashboard/admin/users/create/page.tsx

// import { fetchAllRolesForForm } from '@/lib/openmrs/metadata'; 
import { CreateUserForm } from "@/components/users/CreateUserForm"; // Adjust path if necessary
import { fetchAllRolesForForm } from "@/lib/openmrs-api/metadata";
import { AlertTriangle } from 'lucide-react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

// Define a type for the role data
interface RoleOption {
    uuid: string;
    display: string;
}

// This is the Server Component where data fetching MUST occur.
export default async function CreateUserPage() {
    let roles: RoleOption[] = [];
    const error: string | null = null;

    try {
        // 1. Fetch data on the Server
        roles = await fetchAllRolesForForm();
    } catch (err: unknown) {
        // 2. Handle Authentication Redirect or General Errors
        if (isRedirectError(err)) {
             throw err; // Re-throw to trigger Next.js redirection
        }
        console.error('An unhandled error occurred:', err);    }

    if (error) {
        // 3. Render an error state if role fetching failed
        return (
            <div className="py-10 max-w-3xl mx-auto p-8 mt-10 bg-red-100 text-red-700 border border-red-300 rounded-xl shadow-lg flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                <p>
                    <strong>Data Error:</strong> {error}
                    <br/>
                    Cannot proceed with user creation.
                </p>
            </div>
        );
    }

    // 4. Pass the fetched roles as a prop to the Client Component
    return (
        <div className="py-10">
            {/* The props are passed here in the page component */}
            <CreateUserForm roles={roles} /> 
        </div>
    );
}