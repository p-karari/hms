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
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center">
        <button className="text-gray-600 hover:text-blue-600 md:hidden p-2 rounded-xl transition-all duration-200 hover:bg-gray-100">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        {/* Location Selector */}
        <div className="relative">
          <button
            onClick={() => setIsLocationOpen(!isLocationOpen)}
            className="flex items-center text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 p-2 rounded-xl transition-all duration-200 group"
          >
            <MapPin className="w-4 h-4 mr-2 text-blue-600 transition-colors duration-200" />
            <span className="font-medium">
              {loadingLocations ? "Loading locations..." : currentLocation.display}
            </span>
            <ChevronDown
              className={`w-4 h-4 ml-2 transition-all duration-200 text-gray-400 group-hover:text-gray-600 ${
                isLocationOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isLocationOpen && !loadingLocations && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select Location
                </div>
                {availableLocations.map((location) => (
                  <button
                    key={location.uuid}
                    onClick={() => handleLocationChange(location.uuid)}
                    className="flex items-center w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-150 group"
                  >
                    <MapPin className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                    {location.display}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 p-2 rounded-xl transition-all duration-200 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="mx-3 font-medium">{session.user.display}</span>
            <ChevronDown
              className={`w-4 h-4 transition-all duration-200 text-gray-400 group-hover:text-gray-600 ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Account
                </div>
                <a
                  href="/profile"
                  className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-150 group"
                >
                  <User className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                  View Profile
                </a>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 group"
                >
                  <LogOut className="w-4 h-4 mr-3 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
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