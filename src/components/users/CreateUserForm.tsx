// app/dashboard/admin/users/_components/CreateUserForm.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { createUserAndProvider } from '@/lib/users/users'; 
import { RoleOption } from './GetRoles';
// import { RoleOption } from '@/lib/openmrs-api/metadata'; // Import RoleOption from metadata file

const initialState = {
    message: '',
    error: false,
    uuid: null as string | null,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 disabled:bg-green-400"
        >
            {pending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
                <UserPlus className="w-5 h-5 mr-2" />
            )}
            {pending ? 'Creating Account...' : 'Create New User'}
        </button>
    );
}

interface CreateUserFormProps {
    roles: RoleOption[];
    onSuccess: (message: string) => void; // New prop to handle success feedback
}

export function CreateUserForm({ roles, onSuccess }: CreateUserFormProps) {
    const rolesPerColumn = 5;
    const columns: RoleOption[][] = [];
    
    // Split roles into columns of 5 roles each
    for (let i = 0; i < roles.length; i += rolesPerColumn) {
        columns.push(roles.slice(i, i + rolesPerColumn));
    }

    const [state, formAction] = useFormState(async (currentState: typeof initialState, formData: FormData) => {
        try {
            const result = await createUserAndProvider(formData);
            
            // Call onSuccess callback to trigger UI refresh and modal close
            onSuccess(`User '${result.username}' successfully created!`);

            return {
                uuid: result.uuid,
                message: '', // Clear message as success is handled by callback
                error: false,
            };

        } catch (error: unknown) {
            let errorMessage: string;
    
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                errorMessage = "An unrecoverable error of unknown type occurred.";
            }
            console.error("User creation failed:", errorMessage);
            return { 
                uuid: null, 
                message: errorMessage || "An unexpected error occurred. Check server logs.", 
                error: true 
            };
        }
    }, initialState);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <UserPlus className="w-7 h-7 mr-3 text-green-600" /> Create New Staff Account
            </h1>

            {/* Only show error message here, success is handled by parent page callback */}
            {state.message && state.error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <strong>Error:</strong> {state.message}
                </div>
            )}

            <form action={formAction} className="space-y-6">
                
                <fieldset className="p-4 border border-gray-200 rounded-lg">
                    <legend className="text-lg font-semibold px-2 text-green-600">Staff Person Details</legend>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <input type="text" name="givenName" placeholder="First Name *" required
                            className="p-3 border rounded-lg" />
                        <input type="text" name="familyName" placeholder="Last Name *" required
                            className="p-3 border rounded-lg" />
                        <select name="gender" 
                            className="p-3 border rounded-lg">
                            <option value="">Select Gender</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                        {/* Assuming birthdate is not mandatory for staff creation */}
                        <input type="date" name="birthdate" placeholder="Date of Birth (Optional)"
                            className="p-3 border rounded-lg text-gray-500" /> 
                    </div>
                </fieldset>

                <fieldset className="p-4 border border-gray-200 rounded-lg">
                    <legend className="text-lg font-semibold px-2 text-green-600">Login Credentials</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <input type="text" name="username" placeholder="Username *" required
                            className="p-3 border rounded-lg" />
                        <input type="password" name="password" placeholder="Password *" required
                            className="p-3 border rounded-lg" />
                    </div>
                </fieldset>
                
                <fieldset className="p-4 border border-gray-200 rounded-lg">
                    <legend className="text-lg font-semibold px-2 text-green-600">Roles & Provider Status</legend>
                    <div className="space-y-4">
                        
                        <div className="flex flex-col">
                            <label className="mb-2 text-sm font-medium text-gray-700">Assign Roles</label>
                            
                            {/* ROLES LISTING IMPLEMENTATION (grouped into columns of 5) */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 max-h-[250px] overflow-y-auto p-3 border rounded-lg bg-gray-50">
                                {roles.map((role) => (
                                    <div key={role.uuid} className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            name="roles" 
                                            id={`role-${role.uuid}`} 
                                            value={role.uuid}
                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        />
                                        <label htmlFor={`role-${role.uuid}`} className="ml-2 text-sm text-gray-700">
                                            {role.display}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                The essential **&apos;Authenticated User&apos;** role will be assigned automatically on the server.
                            </p>
                        </div>

                        <div className="border-t pt-3">
                            <div className="flex items-center">
                                <input type="checkbox" id="isProvider" name="isProvider"
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                                <label htmlFor="isProvider" className="ml-2 text-sm font-medium text-gray-700">
                                    This user is a **Provider** (Creates a clinical record).
                                </label>
                            </div>
                            <input type="text" name="providerIdentifier" placeholder="Provider Identifier (Optional)"
                                className="w-full p-3 border rounded-lg mt-2" />
                        </div>
                    </div>
                </fieldset>

                <SubmitButton />
            </form>
        </div>
    );
}