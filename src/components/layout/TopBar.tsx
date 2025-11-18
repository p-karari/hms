"use client";

import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import { SessionContext } from "@/lib/context/session-context";
import { 
  MapPin, User, ChevronDown, LogOut, Menu as MenuIcon, 
  Search, UserPlus, Loader2, X, ChevronRight, Package, 
  UserCog, Settings, FileText, Key 
} from "lucide-react";
import { redirect } from "next/navigation";
import { logoutUser } from "@/lib/auth/logout";
import { OpenMrsLocation, getLocations } from "@/lib/location/location";
import { updateSessionLocation } from "@/lib/location/update-session-location"; 
import { searchPatients, ListPatient } from "@/lib/patients/searchPatients";
import Link from "next/link";
import { ChangePasswordModal } from "../profile/ChangePasswordModal";

export function Topbar() {
  const sessionContext = useContext(SessionContext);

  if (sessionContext === undefined) {
    throw new Error("Topbar must be rendered within the SessionProvider.");
  }

  const { setSessionLocationContext, ...sessionData } = sessionContext;
  const session = sessionData.isAuthenticated ? sessionData : null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<OpenMrsLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ListPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Handle click outside to close various dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) {
        setIsHamburgerMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPatients(query, 10);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  if (!session || !session.isAuthenticated) {
    return null;
  }

  const currentLocation =
    availableLocations.find((loc) => loc.uuid === session.sessionLocation?.uuid) ||
    { display: session.sessionLocation?.display || "unknown location" };

  // Get display name directly from session context
  const getUserDisplayInfo = () => {
    const user = session.user;
    // Use person.display (e.g., "Super User") instead of user.display (e.g., "admin")
    const fullName = user.person?.display || user.display;
    const username = user.username || user.systemId || "";
    
    // Extract first and last name
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    
    return {
      fullName,
      firstName,
      lastName,
      username
    };
  };

  const { fullName, username } = getUserDisplayInfo();

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

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handlePatientSelect = (patientUuid: string) => {
    clearSearch();
    window.location.href = `/dashboard/patients/${patientUuid}`;
  };

  const getPatientName = (patient: ListPatient): string => {
    const display = patient.display;
    if (display.includes(' - ')) {
      return display.split(' - ')[1].trim();
    }
    return display;
  };

  const getOpenMRSId = (patient: ListPatient): string => {
    if (!patient.identifiers || patient.identifiers.length === 0) {
      return 'N/A';
    }
    
    const openmrsId = patient.identifiers.find(id => 
      id.identifierType?.display?.toLowerCase().includes('openmrs id')
    );
    
    if (openmrsId) {
      return openmrsId.identifier;
    }
    
    const preferredId = patient.identifiers.find(id => id.preferred);
    if (preferredId) {
      return preferredId.identifier;
    }
    
    return patient.identifiers[0]?.identifier || 'N/A';
  };

  // Removed links for hamburger menu
  const hamburgerMenuLinks = [
    { href: "/stockManagement", label: "Pharmacy Management", icon: Package },
    { href: "/dashboard/staff", label: "User & Staff Mgmt", icon: UserCog },
    { href: "/dashboard/reports", label: "Reports & Analytics", icon: FileText },
    { href: "/dashboard/admin/locations", label: "Locations & Wards", icon: MapPin },
    { href: "/dashboard/settings", label: "Global Settings", icon: Settings },
  ];

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shadow-sm">
        {/* Left Section - Menu Button */}
        <div className="flex items-center">
          <button className="text-gray-600 hover:text-blue-600 md:hidden p-2 rounded-xl transition-all duration-200 hover:bg-gray-100">
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Right Section - All elements grouped together */}
        <div className="flex items-center space-x-3 text-black">
          {/* Search Bar */}
          <div className="relative w-48 md:w-64" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
              />
              
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-40 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Patients ({searchResults.length})
                    </div>
                    {searchResults.map((patient) => (
                      <button
                        key={patient.uuid}
                        onClick={() => handlePatientSelect(patient.uuid)}
                        className="flex items-center w-full text-left px-3 py-3 text-sm hover:bg-blue-50 rounded-lg transition-all duration-150 group border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 text-sm font-semibold mr-3">
                          {getPatientName(patient).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {getPatientName(patient)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            ID: {getOpenMRSId(patient)} • {patient.age || 'N/A'}y • {patient.gender}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-2 group-hover:text-blue-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results Message */}
              {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-40 p-4 text-center">
                  <div className="text-gray-400 mb-2">
                    <Search className="w-6 h-6 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-600">
                    No patients found for "<span className="font-medium">{searchQuery}</span>"
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try a different name or ID number
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Register Patient Button */}
          <Link
            href="/dashboard/patients/register"
            className="hidden md:flex items-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register Patient
          </Link>

          {/* Mobile Register Button */}
          <Link
            href="/dashboard/patients/register"
            className="md:hidden flex items-center justify-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 p-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <UserPlus className="w-4 h-4" />
          </Link>

          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="flex items-center text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 p-2 rounded-xl transition-all duration-200 group"
            >
              <MapPin className="w-4 h-4 text-blue-600 transition-colors duration-200" />
              <span className="font-medium max-w-[100px] truncate ml-2 hidden md:inline">
                {loadingLocations ? "Loading..." : currentLocation.display}
              </span>
              <ChevronDown
                className={`w-4 h-4 ml-1 transition-all duration-200 text-gray-400 group-hover:text-gray-600 ${
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
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 p-2 rounded-xl transition-all duration-200 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="mx-2 font-medium hidden lg:inline truncate max-w-[120px]">
                {fullName}
              </span>
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
                  <div className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 mb-1">
                    <div className="font-medium truncate">{fullName}</div>
                    <div className="text-xs text-gray-500 truncate">{username}</div>
                  </div>
                  
                  {/* CHANGE PASSWORD BUTTON - REPLACED PROFILE LINK */}
                  <button
                    onClick={() => {
                      setShowChangePasswordModal(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-150 group"
                  >
                    <Key className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                    Change Password
                  </button>
                  
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

          {/* Hamburger Menu for removed links */}
          <div className="relative" ref={hamburgerRef}>
            <button
              onClick={() => setIsHamburgerMenuOpen(!isHamburgerMenuOpen)}
              className="flex items-center text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 p-2 rounded-xl transition-all duration-200 group"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            {isHamburgerMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </div>
                  {hamburgerMenuLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-150 group"
                        onClick={() => setIsHamburgerMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
          sessionContext={sessionContext}
        />
      )}
    </>
  );
}