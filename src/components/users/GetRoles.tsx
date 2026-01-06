// app/dashboard/admin/users/create/CreateUserPage.tsx

import { fetchAllRolesForForm } from '@/lib/openmrs-api/metadata';
import { AlertTriangle } from 'lucide-react';

export interface RoleOption {
    uuid: string;
    display: string;
}

export default async function CreateUserPage() {
    let roles: RoleOption[] = [];
    const error: string | null = null;

    try {
        roles = await fetchAllRolesForForm();
    } catch (error: unknown) {
        let errorMessage: string;
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = "An unrecoverable error of unknown type occurred.";
    }
        error = errorMessage || "Failed to load roles from the OpenMRS server.";
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto p-8 mt-10 bg-red-100 text-red-700 border border-red-300 rounded-xl shadow-lg flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                <p>
                    <strong>Data Error:</strong> {error}
                    <br/>
                    Please ensure the API is reachable and your user has the &apos;View Roles&apos; privilege.
                </p>
            </div>
        );
    }

}