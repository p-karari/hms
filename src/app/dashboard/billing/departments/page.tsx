
import DepartmentForm from '@/components/billing/createDepartmentForm';
import { getAllDepartments, createDepartment } from '@/lib/billing/manageBillableServices';
import { CashierDepartment } from '@/lib/billing/services/billingServices';
import { revalidatePath } from 'next/cache'; 

export const dynamic = 'force-dynamic'; // Ensure fresh data always

// --- Helper Component to display departments ---
function DepartmentsTable({ departments }: { departments: CashierDepartment[] }) {
  if (departments && departments.length === 0) {
    return <p className="text-gray-500">No departments defined yet. Use the form below to add one.</p>;
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold">Existing Departments</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
        
          {departments && departments.length > 0 &&
          departments.map((dept) => (
            <tr key={dept.department_id}>
              <td className="px-4 py-2 whitespace-nowrap">{dept.department_id}</td>
              <td className="px-4 py-2 whitespace-nowrap font-medium">{dept.name}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{dept.description || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Main Page Component ---
export default async function BillingAdminDepartmentsPage() {
  const departments = await getAllDepartments();

  // Define the Server Action for form submission
  async function handleCreateDepartmentAction(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const creatorId = 1; // **NOTE:** Replace with actual logged-in user ID mechanism

    if (!name) {
      // Basic server-side validation
      console.error("Department name is required.");
      return; 
    }

    try {
      await createDepartment(name, description, creatorId);
      // Refresh the page data after successful creation
      revalidatePath('/billing/admin/departments'); 
    } catch (error) {
      console.error('Failed to create department:', error);
      // Error handling logic
    }
  }

  return (
    <div className="p-8">
      <h1>🏥 Billing Departments Administration</h1>
      
      <DepartmentsTable departments={departments} />
      
      <hr className="my-6"/>

      <h2>➕ Create New Department</h2>
      <DepartmentForm createAction={handleCreateDepartmentAction} />
    </div>
  );
}