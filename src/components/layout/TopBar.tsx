"use client";

import React, { useState, useContext, useEffect } from "react";
import { SessionContext } from "@/lib/context/session-context";
import { MapPin, User, ChevronDown, LogOut, Menu } from "lucide-react";
import { redirect } from "next/navigation";
import { logoutUser } from "@/lib/auth/logout";
import { OpenMrsLocation, getLocations } from "@/lib/location/location";
import { updateSessionLocation } from "@/lib/location/update-session-location"; 


export function Topbar() {
  const sessionContext = useContext(SessionContext);

  if (sessionContext === undefined) {
    throw new Error("Topbar must be rendered within the SessionProvider.");
  }

  const { setSessionLocationContext, ...sessionData } = sessionContext;
  const session = sessionData.isAuthenticated ? sessionData : null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<OpenMrsLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locs = await getLocations();
        setAvailableLocations(locs);
      } catch (err) {
        console.error("Error fetching locations:", err);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  if (!session || !session.isAuthenticated) {
    return null;
  }

  const currentLocation =
    availableLocations.find((loc) => loc.uuid === session.sessionLocation?.uuid) ||
    { display: session.sessionLocation?.display || "unknown location" };

  const handleLocationChange = async (locationUuid: string) => {
    const formData = new FormData();
    formData.append("locationUuid", locationUuid);

    try {
      // Use the action dedicated to updating the client state without redirecting
      const newLocation = await updateSessionLocation(formData); 
      
      if (newLocation) {
        setSessionLocationContext(newLocation);
      }
    } catch (error) {
      console.error("Failed to update session location:", error);
    } finally {
      setIsLocationOpen(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    redirect("/login");
  };

  return (
    <header className="border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center">
        <button className="text-gray-600 hover:text-indigo-600 md:hidden p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center space-x-6">
        <div className="relative">
          <button
            onClick={() => setIsLocationOpen(!isLocationOpen)}
            className="flex items-center text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition"
          >
            <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
            <span>
              {loadingLocations ? "Loading..." : currentLocation.display}
            </span>
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${
                isLocationOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isLocationOpen && !loadingLocations && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
              <div className="py-1">
                {availableLocations.map((location) => (
                  <button
                    key={location.uuid}
                    onClick={() => handleLocationChange(location.uuid)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    {location.display}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center text-sm text-gray-700 hover:text-indigo-600 transition"
          >
            <User className="w-5 h-5 mr-2 text-gray-500" />
            <span>{session.user.display}</span>
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
              <div className="py-1">
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  View Profile
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}