'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, Shield } from 'lucide-react';

interface InsurancePolicy {
  id?: number;
  insurance_company: string;
  policy_number: string;
  patient_id: number;
  is_active: boolean;
}

interface InsuranceTabProps {
  patientId: number;
}

export default function InsuranceTab({ patientId }: InsuranceTabProps) {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPolicy, setNewPolicy] = useState<InsurancePolicy>({
    insurance_company: '',
    policy_number: '',
    patient_id: patientId,
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.insurance_company.trim() || !newPolicy.policy_number.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement save insurance policy action
      // await saveInsurancePolicy(newPolicy);
      
      // For now, simulate success
      setPolicies([...policies, { ...newPolicy, id: Date.now() }]);
      setNewPolicy({
        insurance_company: '',
        policy_number: '',
        patient_id: patientId,
        is_active: true
      });
      setShowForm(false);
      alert('Policy added successfully');
    } catch (error) {
      console.error('Failed to save policy:', error);
      alert('Failed to save policy');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    setLoading(true);
    try {
      // TODO: Implement delete insurance policy action
      // await deleteInsurancePolicy(policyId);
      
      // For now, simulate success
      setPolicies(policies.filter(p => p.id !== policyId));
      alert('Policy deleted successfully');
    } catch (error) {
      console.error('Failed to delete policy:', error);
      alert('Failed to delete policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Insurance/Sponsor Management</h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage insurance policies and sponsors for this patient
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Policy
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-6 mb-6 bg-gray-50">
          <h3 className="font-semibold text-gray-800 mb-4">Add New Insurance Policy</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Insurance Company</label>
                <input
                  type="text"
                  value={newPolicy.insurance_company}
                  onChange={(e) => setNewPolicy({...newPolicy, insurance_company: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., NHIF, AAR Insurance"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Policy Number</label>
                <input
                  type="text"
                  value={newPolicy.policy_number}
                  onChange={(e) => setNewPolicy({...newPolicy, policy_number: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., NHIF-123456"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewPolicy({
                    insurance_company: '',
                    policy_number: '',
                    patient_id: patientId,
                    is_active: true
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Policy
              </button>
            </div>
          </form>
        </div>
      )}

      {policies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No insurance policies found</p>
          <p className="text-sm mt-2">
            {showForm ? 'Fill in the form above to add a policy' : 'Click "Add Policy" to get started'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Insurance Company</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Policy Number</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{policy.insurance_company}</td>
                  <td className="py-3 px-4 font-medium">{policy.policy_number}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      policy.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => policy.id && handleDelete(policy.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete Policy"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}