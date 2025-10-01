"use client";

import { useFormState, useFormStatus } from 'react-dom';
// import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';
import { createUserAndProvider } from '@/lib/users/users'; 
import { RoleOption } from './GetRoles';
// import { RoleOption } from './CreateUserPage'; // Import the type from the new wrapper

// Define the initial state for the form
const initialState = {
    message: '',
    error: false,
    uuid: null as string | null,
};

// Component to show the loading status of the submission
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

// Accept the fetched roles as a prop
interface CreateUserFormProps {
    roles: RoleOption[];
}

export function CreateUserForm({ roles }: CreateUserFormProps) {
    // const router = useRouter();
    
    // The form action handles the server function call and error handling
    const [state, formAction] = useFormState(async (currentState: typeof initialState, formData: FormData) => {
        try {
            const result = await createUserAndProvider(formData);
            
            // Redirect or show success message
            return {
                uuid: result.uuid,
                message: `User '${result.username}' successfully created!`,
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
            // The server action now throws specific errors, so we display them directly
            console.error("User creation failed:", errorMessage);
            return { 
                uuid: null, 
                message: errorMessage || "An unexpected error occurred. Check server logs.", 
                error: true 
            };
        }
    }, initialState);

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-2xl border border-gray-100 text-black">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <UserPlus className="w-7 h-7 mr-3 text-green-600" /> Create New Staff Account
            </h1>

            {/* Status Messages */}
            {state.message && state.error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <strong>Error:</strong> {state.message}
                </div>
            )}
            {state.message && !state.error && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-lg flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <strong>Success:</strong> {state.message}
                </div>
            )}

            <form action={formAction} className="space-y-6">
                
                {/* --- PERSONAL DETAILS (Person Object) --- */}
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
                        <input type="date" name="birthdate" placeholder="Date of Birth"
                            className="p-3 border rounded-lg" />
                    </div>
                </fieldset>

                {/* --- USER ACCOUNT DETAILS (User Object) --- */}
                <fieldset className="p-4 border border-gray-200 rounded-lg">
                    <legend className="text-lg font-semibold px-2 text-green-600">Login Credentials</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <input type="text" name="username" placeholder="Username *" required
                            className="p-3 border rounded-lg" />
                        <input type="password" name="password" placeholder="Password *" required
                            className="p-3 border rounded-lg" />
                    </div>
                </fieldset>
                
                {/* --- ROLE SELECTION & PROVIDER DETAILS --- */}
                <fieldset className="p-4 border border-gray-200 rounded-lg">
                    <legend className="text-lg font-semibold px-2 text-green-600">Roles & Provider Status</legend>
                    <div className="space-y-4">
                        
                        {/* 1. Dynamic Role Selection (Multi-select) */}
                        <div className="flex flex-col">
                            <label htmlFor="roles" className="mb-1 text-sm font-medium text-gray-700">Assign Roles (Hold Ctrl/Cmd to select multiple)</label>
                            <select 
                                name="roles" 
                                id="roles"
                                multiple
                                size={5} // Show a fixed number of options
                                className="w-full p-3 border rounded-lg focus:ring-green-500 focus:border-green-500"
                            >
                                {roles.map((role) => (
                                    <option key={role.uuid} value={role.uuid}>
                                        {role.display}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                The essential **&apos;Authenticated User&apos;** role will be assigned automatically on the server.
                            </p>
                        </div>

                        {/* 2. Provider Checkbox */}
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

                {/* Submit Button */}
                <SubmitButton />
            </form>
        </div>
    );
}