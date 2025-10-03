"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRelationship, getRelationshipTypes } from "@/lib/relationships/createRelationship";
import { createPatient } from "@/lib/patients/createPatient";

type RelationshipType = {
  uuid: string;
  display: string;
};

// ✅ Utility function for converting age estimate → birthdate
// Explanation: OpenMRS expects an ISO birthdate. This function subtracts the estimated years & months from today's date.
function calculateEstimatedBirthdate(years: number, months: number): string {
  const today = new Date();
  today.setFullYear(today.getFullYear() - years);
  today.setMonth(today.getMonth() - months);
  return today.toISOString().split("T")[0]; // returns YYYY-MM-DD
}

export function RegisterPatientForm() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Added new fields for clarity (gender and unidentified flag retained)
  const [form, setForm] = useState({
    givenName: "",
    familyName: "",
    gender: "",
    birthdate: "",
    estimatedYears: "",
    estimatedMonths: "",
    unidentified: false,
  });

  const [relatives, setRelatives] = useState([{ name: "", relationshipType: "" }]);

  // Fetch relationship types on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getRelationshipTypes();
        setRelationshipTypes(data?.results || []);
      } catch {
        setError("Failed to load relationship types");
      }
    })();
  }, []);

  function handleNext() {
    if (step < 3) setStep(step + 1);
  }

  function handlePrev() {
    if (step > 1) setStep(step - 1);
  }

  function handleRelativeChange(index: number, field: string, value: string) {
    const updated = [...relatives];
    updated[index] = { ...updated[index], [field]: value };
    setRelatives(updated);
  }

  function addRelative() {
    setRelatives([...relatives, { name: "", relationshipType: "" }]);
  }

  function removeRelative(index: number) {
    const updated = [...relatives];
    updated.splice(index, 1);
    setRelatives(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ✅ If patient is unidentified, we auto-assign a placeholder name
      let givenName = form.givenName.trim();
      let familyName = form.familyName.trim();

      if (form.unidentified) {
        const timestamp = Date.now();
        givenName = "UNKNOWN";
        familyName = `PATIENT-${timestamp}`; // ensures uniqueness
      }

      // ✅ Birthdate logic
      // If user provides an exact birthdate → use that
      // If user provides estimated age → calculate estimated birthdate
      let birthdate = form.birthdate;
      let birthdateEstimated = false;

      if (!birthdate && (form.estimatedYears || form.estimatedMonths)) {
        const years = parseInt(form.estimatedYears || "0", 10);
        const months = parseInt(form.estimatedMonths || "0", 10);
        birthdate = calculateEstimatedBirthdate(years, months);
        birthdateEstimated = true;
      }

      // ✅ Build FormData for backend submission
      const formData = new FormData();
      formData.append("givenName", givenName);
      formData.append("familyName", familyName);
      formData.append("gender", form.gender || "U"); // U for Unknown
      formData.append("birthdate", birthdate || "");
      formData.append("birthdateEstimated", String(birthdateEstimated));

      // ✅ Call your server action (auto-assigns location + identifier)
      const patient = await createPatient(formData);

      // ✅ Create relationships for relatives (if any)
      for (const rel of relatives) {
        if (rel.name && rel.relationshipType) {
          const relativePayload = new FormData();
          relativePayload.append("uuid-of-patient", patient.person.uuid);
          relativePayload.append("uuid-of-relative", rel.name);
          relativePayload.append("uuid-of-relationship-type", rel.relationshipType);
          await createRelationship(relativePayload);
        }
      }

      router.push(`/dashboard/patients/${patient.uuid}`);
    } catch (error: unknown) {
    let errorMessage: string;
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = "An unrecoverable error of unknown type occurred.";
    }
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = "An unrecoverable error of unknown type occurred.";
    }
      setError(errorMessage || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-md space-y-8 text-black"
    >
      {/* Step 1 - Names & Gender */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Patient Information</h2>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.unidentified}
              onChange={(e) => setForm({ ...form, unidentified: e.target.checked })}
            />
            <label className="text-sm text-gray-600">Unidentified patient</label>
          </div>
          {!form.unidentified && (
            <>
              <input
                type="text"
                placeholder="Given Name"
                value={form.givenName}
                onChange={(e) => setForm({ ...form, givenName: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Family Name"
                value={form.familyName}
                onChange={(e) => setForm({ ...form, familyName: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </>
          )}
        </div>
      )}

      {/* Step 2 - Birthdate */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Birth Details</h2>
          <label className="text-sm text-gray-600">Exact Birthdate</label>
          <input
            type="date"
            value={form.birthdate}
            onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <p className="text-sm text-gray-500 text-center">or enter estimated age</p>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Years"
              value={form.estimatedYears}
              onChange={(e) => setForm({ ...form, estimatedYears: e.target.value })}
              className="w-1/2 p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Months"
              value={form.estimatedMonths}
              onChange={(e) => setForm({ ...form, estimatedMonths: e.target.value })}
              className="w-1/2 p-2 border rounded"
            />
          </div>
        </div>
      )}

      {/* Step 3 - Relatives */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Relatives</h2>
          {relatives.map((rel, index) => (
            <div key={index} className="flex items-center gap-3 border p-3 rounded-md">
              <input
                type="text"
                placeholder="Relative Name"
                value={rel.name}
                onChange={(e) => handleRelativeChange(index, "name", e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <select
                value={rel.relationshipType}
                onChange={(e) => handleRelativeChange(index, "relationshipType", e.target.value)}
                className="flex-1 p-2 border rounded"
              >
                <option value="">Select Relationship</option>
                {relationshipTypes.map((type) => (
                  <option key={type.uuid} value={type.uuid}>
                    {type.display}
                  </option>
                ))}
              </select>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeRelative(index)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addRelative} className="px-4 py-2 bg-gray-100 border rounded">
            + Add Relative
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        {step > 1 && (
          <button type="button" onClick={handlePrev} className="px-4 py-2 bg-gray-200 rounded">
            Back
          </button>
        )}
        {step < 3 ? (
          <button type="button" onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded">
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register Patient"}
          </button>
        )}
      </div>

      {error && <p className="text-red-500 text-center">{error}</p>}
    </form>
  );
}
