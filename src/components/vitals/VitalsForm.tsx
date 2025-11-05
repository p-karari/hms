"use client";

import { useEffect, useState } from "react";
import { getConceptUuid } from "@/lib/config/concept";
import { getProviderUuid } from "@/lib/config/provider";
import { getEncounterRoleUuid } from "@/lib/encounters/encounterRole";
import { getEncounterTypeUuid } from "@/lib/encounters/encounterType";

interface VitalsFormProps {
  patientUuid: string;
}

interface VitalsData {
  weight: string;
  height: string;
  temperature: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  respRate: string;
}

export default function VitalsForm({ patientUuid }: VitalsFormProps) {
  const [loading, setLoading] = useState(true);
  const [concepts, setConcepts] = useState<Record<string, string>>({});
  const [form, setForm] = useState<VitalsData>({
    weight: "",
    height: "",
    temperature: "",
    systolic: "",
    diastolic: "",
    pulse: "",
    respRate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load configuration once
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [
          providerUuid,
          encounterTypeUuid,
          encounterRoleUuid,
          weight,
          height,
          temp,
          sys,
          dia,
          pulse,
          resp,
        ] = await Promise.all([
          getProviderUuid("admin"),
          getEncounterTypeUuid("Vitals"),
          getEncounterRoleUuid("Clinician"),
          getConceptUuid("Weight (kg)"),
          getConceptUuid("Height (cm)"),
          getConceptUuid("Temparature (c)"),
          getConceptUuid("Systolic blood pressure"),
          getConceptUuid("Diastolic blood pressure"),
          getConceptUuid("Pulse"),
          getConceptUuid("Respiratory rate"),
        ]);

        setConcepts({
          providerUuid,
          encounterTypeUuid,
          encounterRoleUuid,
          weight,
          height,
          temp,
          sys,
          dia,
          pulse,
          resp,
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load form configuration.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // 🩺 Build encounter payload
      const obs = [
        { concept: concepts.weight, value: form.weight },
        { concept: concepts.height, value: form.height },
        { concept: concepts.temp, value: form.temperature },
        { concept: concepts.sys, value: form.systolic },
        { concept: concepts.dia, value: form.diastolic },
        { concept: concepts.pulse, value: form.pulse },
        { concept: concepts.resp, value: form.respRate },
      ].filter((o) => o.value !== ""); // Only send filled fields

      const payload = {
        encounterDatetime: new Date().toISOString(),
        encounterType: concepts.encounterTypeUuid,
        patient: patientUuid,
        provider: concepts.providerUuid,
        encounterProviders: [
          {
            provider: concepts.providerUuid,
            encounterRole: concepts.encounterRoleUuid,
          },
        ],
        obs,
      };

      const res = await fetch("/openmrs/ws/rest/v1/encounter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            btoa(
              `${process.env.NEXT_PUBLIC_OMRS_USER}:${process.env.NEXT_PUBLIC_OMRS_PASS}`
            ),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Encounter creation failed");
      }

      setSuccess("Vitals recorded successfully!");
      setForm({
        weight: "",
        height: "",
        temperature: "",
        systolic: "",
        diastolic: "",
        pulse: "",
        respRate: "",
      });
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit vitals. Check connection or credentials.");
    }
  };

  if (loading)
    return (
      <div className="text-sm text-gray-500 border border-gray-200 p-4 rounded-md">
        Loading configuration...
      </div>
    );

  if (error && !success)
    return (
      <div className="border border-red-200 bg-red-50 text-red-600 text-sm p-4 rounded-md">
        {error}
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border border-gray-200 rounded-md p-4 bg-white"
    >
      {success && (
        <div className="border border-green-200 bg-green-50 text-green-700 text-sm p-3 rounded-md">
          {success}
        </div>
      )}

      {[
        ["weight", "Weight (kg)"],
        ["height", "Height (cm)"],
        ["temperature", "Temperature (°C)"],
        ["systolic", "Systolic BP"],
        ["diastolic", "Diastolic BP"],
        ["pulse", "Pulse"],
        ["respRate", "Respiratory Rate"],
      ].map(([key, label]) => (
        <div key={key} className="flex items-center justify-between">
          <label
            htmlFor={key}
            className="text-sm font-medium text-gray-700 w-1/3"
          >
            {label}
          </label>
          <input
            id={key}
            name={key}
            value={(form as any)[key]}
            onChange={handleChange}
            type="number"
            inputMode="decimal"
            className="border border-gray-300 rounded-md px-2 py-1 w-1/2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      ))}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Vitals"}
        </button>
      </div>
    </form>
  );
}
