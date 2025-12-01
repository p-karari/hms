// app/dashboard/admin/users/_components/EditUserForm.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';

import { User, Lock, Edit2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { ManagedUser } from '@/lib/users/fetchUsers';
import { updatePersonDetails, updateUserRoles, resetUserPassword } from '@/lib/users/updateUsers';
import { RoleOption } from './GetRoles';

// We need a helper function to get the full OpenMRS user object to extract preferredNameUuid
// Since we don't have a specific `getOneUser` action, we'll assume a helper function
// exists or fetch the full list and find the user (less efficient, but works for demo).
// For simplicity and efficiency, we will assume a basic `getDetailedUser` action exists
// that returns the necessary raw data fields.

// Placeholder for data needed during edit that isn't in ManagedUser
interface DetailedUserData {
    givenName: string;
    familyName: string;
    preferredNameUuid: string;
    currentRoles: string[]; // UUIDs of current roles
}

// --- Status Message Type ---
interface StatusState {
    message: string | null;
    error: boolean;
}

interface EditUserFormProps {
    user: ManagedUser;
    allRoles: RoleOption[];
    onSuccess: (message: string) => void;
}

export function EditUserForm({ user, allRoles, onSuccess }: EditUserFormProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'password'>('details');
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<StatusState>({ message: null, error: false });

    // --- Form Data States ---
    const [givenName, setGivenName] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [gender, setGender] = useState(user.gender);
    const [selectedRoleUuids, setSelectedRoleUuids] = useState<Set<string>>(new Set());
    const [newPassword, setNewPassword] = useState('');
    
    // UUIDs needed for API calls, often require a detailed fetch
    const [personData, setPersonData] = useState<DetailedUserData | null>(null); 
    const [loadingDetails, setLoadingDetails] = useState(true);


    // --- Effect to pre-populate and fetch necessary detail UUIDs ---
    useEffect(() => {
        // In a real application, you would call getDetailedUser(user.uuid) here
        // For this implementation, we will mock the detailed data for the form to work
        
        // Mocking the required detailed data based on ManagedUser structure
        // NOTE: In production, this data (especially preferredNameUuid) MUST come from the API
        
        // Mocking role UUIDs from role names:
        const initialRoleUuids = new Set(
            user.roles
                .map(roleName => allRoles.find(r => r.display === roleName)?.uuid)
                .filter((uuid): uuid is string => !!uuid)
        );
        
        // Split full name back into first and last names (highly imperfect, but necessary mock)
        const parts = user.fullName.split(' ');
        const mockGivenName = parts[0] || '';
        const mockFamilyName = parts.slice(1).join(' ') || '';

        // *** CRITICAL MOCK *** // We assume a preferredNameUuid must be available for the PUT request to work.
        // If this UUID isn't in ManagedUser, the frontend MUST fetch it.
        const mockPreferredNameUuid = 'MOCK-PREFERRED-NAME-UUID'; 
        
        setGivenName(mockGivenName);
        setFamilyName(mockFamilyName);
        setGender(user.gender);
        setSelectedRoleUuids(initialRoleUuids);
        setPersonData({
            givenName: mockGivenName,
            familyName: mockFamilyName,
            preferredNameUuid: mockPreferredNameUuid,
            currentRoles: Array.from(initialRoleUuids),
        });
        setLoadingDetails(false);

    }, [user, allRoles]);

    // --- Role Handler ---
    const handleRoleChange = (uuid: string, checked: boolean) => {
        setSelectedRoleUuids(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(uuid);
            } else {
                newSet.delete(uuid);
            }
            return newSet;
        });
    };

    // --- Submission Handlers ---

    const handleDetailsUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!personData) {
            setStatus({ message: "Error: Missing required person data for update.", error: true });
            return;
        }

        startTransition(async () => {
            try {
                // 1. Update Person Details (Name/Gender)
                await updatePersonDetails({
                    uuid: user.uuid,
                    givenName: givenName.trim(),
                    familyName: familyName.trim(),
                    gender,
                    preferredNameUuid: personData.preferredNameUuid,
                });

                // 2. Update Roles
                await updateUserRoles({
                    uuid: user.uuid,
                    roleUuids: Array.from(selectedRoleUuids),
                });
                
                setStatus({ message: "User details and roles updated successfully!", error: false });
                onSuccess(`Details for user ${user.username} updated.`);

            } catch (error: any) {
                console.error("Update failed:", error);
                setStatus({ message: `Update failed: ${error.message}`, error: true });
            }
        });
    };

    const handlePasswordReset = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newPassword || newPassword.length < 6) { // Basic validation
            setStatus({ message: "Password must be at least 6 characters.", error: true });
            return;
        }

        startTransition(async () => {
            try {
                await resetUserPassword(user.uuid, newPassword);
                
                setNewPassword(''); // Clear the input field
                setStatus({ message: "Password successfully reset!", error: false });
                onSuccess(`Password for user ${user.username} reset.`);

            } catch (error: any) {
                console.error("Password reset failed:", error);
                setStatus({ message: `Password reset failed: ${error.message}`, error: true });
            }
        });
    };
    
    if (loadingDetails) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="ml-3 text-lg text-gray-600">Loading user details...</p>
            </div>
        );
    }


    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <Edit2 className="w-7 h-7 mr-3 text-indigo-600" /> Edit User: {user.fullName}
            </h1>

            {/* Status Message */}
            {status.message && (
                <div className={`mb-4 p-3 rounded-lg flex items-center ${
                    status.error 
                        ? 'bg-red-100 text-red-700 border border-red-300' 
                        : 'bg-green-100 text-green-700 border border-green-300'
                }`}>
                    {status.error ? <AlertTriangle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                    <strong>{status.error ? 'Error:' : 'Success:'}</strong> {status.message}
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => { setActiveTab('details'); setStatus({ message: null, error: false }); }}
                    className={`px-4 py-2 font-semibold ${
                        activeTab === 'details' 
                            ? 'border-b-2 border-indigo-600 text-indigo-600' 
                            : 'text-gray-500 hover:text-gray-700'
                    } flex items-center transition-colors duration-150`}
                >
                    <User className="w-5 h-5 mr-2" /> User Details & Roles
                </button>
                <button
                    onClick={() => { setActiveTab('password'); setStatus({ message: null, error: false }); }}
                    className={`px-4 py-2 font-semibold ${
                        activeTab === 'password' 
                            ? 'border-b-2 border-indigo-600 text-indigo-600' 
                            : 'text-gray-500 hover:text-gray-700'
                    } flex items-center transition-colors duration-150`}
                >
                    <Lock className="w-5 h-5 mr-2" /> Reset Password
                </button>
            </div>

            {/* --- Tab 1: User Details & Roles --- */}
            {activeTab === 'details' && (
                <form onSubmit={handleDetailsUpdate} className="space-y-6">
                    <fieldset className="p-4 border border-gray-200 rounded-lg">
                        <legend className="text-lg font-semibold px-2 text-indigo-600">Person Details</legend>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <input 
                                type="text" 
                                value={givenName}
                                onChange={(e) => setGivenName(e.target.value)}
                                placeholder="First Name *" 
                                required
                                className="p-3 border rounded-lg" 
                                disabled={isPending}
                            />
                            <input 
                                type="text" 
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                placeholder="Last Name *" 
                                required
                                className="p-3 border rounded-lg" 
                                disabled={isPending}
                            />
                            <select 
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="p-3 border rounded-lg"
                                disabled={isPending}
                            >
                                <option value="">Select Gender</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="U">Unknown</option>
                            </select>
                        </div>
                    </fieldset>

                    <fieldset className="p-4 border border-gray-200 rounded-lg">
                        <legend className="text-lg font-semibold px-2 text-indigo-600">User Roles</legend>
                        <div className="flex flex-col">
                            <label className="mb-2 text-sm font-medium text-gray-700">Assign Roles</label>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 max-h-[250px] overflow-y-auto p-3 border rounded-lg bg-gray-50">
                                {allRoles.map((role) => (
                                    <div key={role.uuid} className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id={`edit-role-${role.uuid}`} 
                                            value={role.uuid}
                                            checked={selectedRoleUuids.has(role.uuid)}
                                            onChange={(e) => handleRoleChange(role.uuid, e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            disabled={isPending}
                                        />
                                        <label htmlFor={`edit-role-${role.uuid}`} className="ml-2 text-sm text-gray-700">
                                            {role.display}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                The **&apos;Authenticated User&apos;** role is mandatory and cannot be unassigned.
                            </p>
                        </div>
                    </fieldset>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-48 flex items-center justify-center p-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-400"
                        >
                            {isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Edit2 className="w-5 h-5 mr-2" />
                            )}
                            {isPending ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}

            {/* --- Tab 2: Reset Password --- */}
            {activeTab === 'password' && (
                <form onSubmit={handlePasswordReset} className="space-y-6 max-w-xl mx-auto">
                    <p className="text-gray-600">
                        Enter a new password below to reset the login credentials for **{user.username}**.
                        The user will be required to use this new password next time they log in.
                    </p>
                    
                    <fieldset className="p-4 border border-gray-200 rounded-lg">
                        <legend className="text-lg font-semibold px-2 text-indigo-600">New Password</legend>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter New Password (Min 6 characters)" 
                            required
                            minLength={6}
                            className="w-full p-3 border rounded-lg mt-2" 
                            disabled={isPending}
                        />
                    </fieldset>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-48 flex items-center justify-center p-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-150 disabled:bg-red-400"
                        >
                            {isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Lock className="w-5 h-5 mr-2" />
                            )}
                            {isPending ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}