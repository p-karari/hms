// app/dashboard/admin/users/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Loader2, UserPlus, AlertTriangle, XCircle, Users, Shield, RefreshCw } from 'lucide-react';
import { getAllUsers, ManagedUser } from '@/lib/users/fetchUsers';
import { RoleOption } from '@/components/users/GetRoles';
import { fetchAllRolesForForm } from '@/lib/openmrs-api/metadata';
import UserTable from '@/components/users/UserTable';
import { CreateUserForm } from '@/components/users/CreateUserForm';
import { EditUserForm } from '@/components/users/EditUserForm';

// Define state for the forms/modals
type FormMode = 'create' | 'edit' | null;

export default function UserManagementPage() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [formMode, setFormMode] = useState<FormMode>(null);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

    // --- Data Fetching ---
    const fetchAllData = () => {
        setLoading(true);
        setError(null);
        startTransition(async () => {
            try {
                // Fetch Users
                const userList = await getAllUsers();
                setUsers(userList);

                // Fetch Roles (if not already fetched or if needed for form)
                if (roles.length === 0) {
                    const roleList = await fetchAllRolesForForm();
                    setRoles(roleList);
                }

            } catch (err: any) {
                setError(`Failed to load data: ${err.message || String(err)}`);
                console.error(err);
            } finally {
                setLoading(false);
            }
        });
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // --- Modal Handlers ---
    const handleOpenCreate = () => {
        setEditingUser(null);
        setFormMode('create');
    };

    const handleOpenEdit = (user: ManagedUser) => {
        setEditingUser(user);
        setFormMode('edit');
    };

    const handleClose = () => {
        setEditingUser(null);
        setFormMode(null);
    };

    const handleSuccess = (message: string) => {
        // Close modal and refresh data after success
        handleClose();
        alert(message); // Simple alert for confirmation
        fetchAllData();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-6 w-6 text-blue-600" />
                            Staff & User Management
                        </h1>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Shield className="h-4 w-4" />
                            <span>Manage user accounts, roles, and permissions</span>
                        </div>
                    </div>
                    <button
                        onClick={fetchAllData}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
                {/* Error Message Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">{users.length}</span> user{users.length !== 1 ? 's' : ''} in system
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleOpenCreate}
                            disabled={roles.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <UserPlus className="h-5 w-5" />
                            Add New User
                        </button>
                    </div>
                </div>

                {/* User List Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {loading || isPending ? (
                        <div className="py-12 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                            <p className="text-gray-600">Loading user data...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center p-12">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 mb-1">No users found</p>
                            <p className="text-sm text-gray-600">Get started by adding your first user</p>
                        </div>
                    ) : (
                        <UserTable 
                            users={users} 
                            onEdit={handleOpenEdit} 
                            onSuccess={handleSuccess}
                        />
                    )}
                </div>
            </div>

            {/* --- Modals for Create and Edit --- */}
            {(formMode === 'create' || formMode === 'edit') && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {formMode === 'create' ? 'Create New User' : 'Edit User'}
                            </h2>
                            <button 
                                onClick={handleClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto">
                            {formMode === 'create' && (
                                <CreateUserForm 
                                    roles={roles} 
                                    onSuccess={handleSuccess}
                                />
                            )}

                            {formMode === 'edit' && editingUser && (
                                <EditUserForm
                                    user={editingUser}
                                    allRoles={roles}
                                    onSuccess={handleSuccess}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}