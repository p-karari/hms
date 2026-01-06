// app/dashboard/admin/users/_components/UserTable.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, User, Trash2, Edit2, Loader2, Mail, Fingerprint, LogIn } from 'lucide-react';
import React from 'react';
import { ManagedUser } from '@/lib/users/fetchUsers';
import { retireUser } from '@/lib/users/updateUsers';
import { RoleListDisplay } from './RoleListDisplay';

const USERS_PER_PAGE = 10;

interface UserTableProps {
    users: ManagedUser[];
    onEdit: (user: ManagedUser) => void;
    onSuccess: (message: string) => void;
}

export default function UserTable({ users, onEdit, onSuccess }: UserTableProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isRetiring, setIsRetiring] = useState<string | null>(null);

    const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * USERS_PER_PAGE;
        const end = start + USERS_PER_PAGE;
        return users.slice(start, end);
    }, [users, currentPage]);

    const handleRetire = async (user: ManagedUser) => {
        if (!window.confirm(`Are you sure you want to retire the user: ${user.fullName} (${user.username})?`)) {
            return;
        }

        setIsRetiring(user.uuid);
        try {
            await retireUser(user.uuid);
            onSuccess(`User ${user.fullName} successfully retired.`);
        } catch (error: any) {
            alert(`Retirement failed: ${error.message}`);
        } finally {
            setIsRetiring(null);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="w-12 px-6 py-3"></th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Username
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Gender
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedUsers.map((user) => (
                            <React.Fragment key={user.uuid}>
                                <tr className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="w-12 px-6 py-4">
                                        <button 
                                            onClick={() => setExpandedRow(expandedRow === user.uuid ? null : user.uuid)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            {expandedRow === user.uuid ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                                <User className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.fullName}
                                                </div>
                                                {user.username && (
                                                    <div className="text-xs text-gray-500 flex items-center mt-1">
                                                        <Mail className="h-3 w-3 mr-1" />
                                                        {user.username}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-700">{user.username}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-700">{user.gender}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            user.isRetired 
                                                ? 'bg-red-100 text-red-800' 
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {user.isRetired ? 'Retired' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onEdit(user)}
                                                disabled={isRetiring === user.uuid || user.isRetired}
                                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                            >
                                                <Edit2 className="h-5 w-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleRetire(user)}
                                                disabled={isRetiring === user.uuid || user.isRetired}
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                            >
                                                {isRetiring === user.uuid ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                
                                {/* Expanded Details - Exactly like prescription details */}
                                {expandedRow === user.uuid && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                            <div className="border-t pt-4 mt-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* System Details */}
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">System Details</h3>
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <div className="flex items-start">
                                                                    <Fingerprint className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                                                    <div className="flex-1">
                                                                        <div className="text-xs font-medium text-gray-500">User UUID</div>
                                                                        <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded mt-1 truncate">
                                                                            {user.uuid}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-start">
                                                                    <Fingerprint className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                                                    <div className="flex-1">
                                                                        <div className="text-xs font-medium text-gray-500">System ID</div>
                                                                        <div className="text-sm text-gray-900 mt-1">{user.systemId}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Last Login & Roles */}
                                                    <div>
                                                        <div className="mb-4">
                                                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Last Activity</h3>
                                                            <div className="flex items-center">
                                                                <LogIn className="h-4 w-4 text-gray-400 mr-2" />
                                                                <div>
                                                                    <div className="text-xs font-medium text-gray-500">Last Login</div>
                                                                    <div className="text-sm text-gray-900">
                                                                        {user.lastLogin || 'Never logged in'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned Roles</h3>
                                                            <RoleListDisplay roles={user.roles} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination */}
            {users.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing <span className="font-medium">{(currentPage - 1) * USERS_PER_PAGE + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * USERS_PER_PAGE, users.length)}</span> of{' '}
                            <span className="font-medium">{users.length}</span> users
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ←
                                </button>
                                <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">
                                    {currentPage}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}