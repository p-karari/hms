// app/dashboard/admin/users/_components/RoleListDisplay.tsx
'use client';

import React from 'react';
import { Tag } from 'lucide-react';

interface RoleListDisplayProps {
    roles: string[];
}

export function RoleListDisplay({ roles }: RoleListDisplayProps) {
    if (!roles || roles.length === 0) {
        return <p className="text-gray-500">No roles assigned.</p>;
    }

    const rolesPerColumn = 5;
    const columns: string[][] = [];

    // Split roles into groups of 5
    for (let i = 0; i < roles.length; i += rolesPerColumn) {
        columns.push(roles.slice(i, i + rolesPerColumn));
    }

    return (
        <div className="flex space-x-8">
            {columns.map((column, colIndex) => (
                <ul key={colIndex} className="list-disc list-inside space-y-1">
                    {column.map((role, roleIndex) => (
                        <li key={`${colIndex}-${roleIndex}`} className="text-sm flex items-start">
                            <Tag className="w-3 h-3 text-green-600 mt-1 mr-1 flex-shrink-0" />
                            {role}
                        </li>
                    ))}
                </ul>
            ))}
        </div>
    );
}