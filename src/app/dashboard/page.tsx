import React from 'react';
import { Users, Calendar, ClipboardCheck, Activity } from 'lucide-react';
import { getAppointmentsTodayCount } from '@/lib/appointments/manageAppointments';
import { VisitDetail, getDashboardVisitData } from '@/lib/visits/getDashboardVisitData';

interface DashboardUserContext {
    name: string;
    location: string;
}

async function getDashboardUserContextMock(): Promise<DashboardUserContext> {
    return { 
        name: "Dr. Alex Johnson", 
        location: "Outpatient Clinic A" 
    };
}

async function getPendingTasksMock(): Promise<{ unsignedNotes: number, criticalTasks: number }> {
    return { unsignedNotes: 8, criticalTasks: 2 };
}

const DashboardWidget: React.FC<{ icon: React.ReactNode; title: string; value: number | string; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
                {icon}
            </div>
            <div>
                <div className="text-xl font-semibold text-gray-900">{value}</div>
                <div className="text-sm text-gray-600">{title}</div>
            </div>
        </div>
    </div>
);

const VisitRow: React.FC<{ visit: VisitDetail }> = ({ visit }) => (
    <div className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-blue-50 rounded-lg transition-colors">
        <div className="flex-1">
            <div className="font-medium text-gray-900 text-sm">{visit.name}</div>
            <div className="text-gray-500 text-xs flex gap-2 mt-1">
                <span>{visit.idNumber}</span>
                <span>•</span>
                <span>{visit.visitType}</span>
            </div>
        </div>
        <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
                {new Date(visit.visitStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-gray-500 text-xs">{visit.gender}/{visit.age}</div>
        </div>
    </div>
);

const TaskCard: React.FC<{ tasks: { id: number, description: string, patient: string }[] }> = ({ tasks }) => (
    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-gray-900">Pending Tasks ({tasks.length})</h3>
        </div>
        <div className="space-y-3">
            {tasks.map((task) => (
                <div key={task.id} className="p-2 bg-orange-50 rounded border border-orange-100">
                    <div className="text-sm font-medium text-gray-900">{task.description}</div>
                    <div className="text-xs text-gray-600 mt-1">Patient: {task.patient}</div>
                </div>
            ))}
        </div>
    </div>
);

export default async function DashboardPage() {
    const [
        userContext, 
        appointmentsCount, 
        visitData,
        pendingTasks
    ] = await Promise.all([
        getDashboardUserContextMock(),
        getAppointmentsTodayCount(),
        getDashboardVisitData(),
        getPendingTasksMock()
    ]);
    
    const mockTasks = [
        { id: 1, description: 'Sign off discharge note', patient: 'Lois K. (P-402)' },
        { id: 2, description: 'Review new lab results', patient: 'James M. (P-301)' },
        { id: 3, description: 'Triage new admission', patient: 'New Patient' },
    ].slice(0, pendingTasks.unsignedNotes > 0 ? 3 : 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userContext.name}</h1>
                    <p className="text-gray-600 mt-1">📍 {userContext.location}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <DashboardWidget 
                        icon={<Users className="w-5 h-5 text-white" />}
                        title="Active Visits"
                        value={visitData.activeVisits}
                        color="bg-blue-500"
                    />
                    <DashboardWidget 
                        icon={<Activity className="w-5 h-5 text-white" />}
                        title="Today's Visits"
                        value={visitData.totalVisitsToday}
                        color="bg-green-500"
                    />
                    <DashboardWidget 
                        icon={<Calendar className="w-5 h-5 text-white" />}
                        title="Appointments"
                        value={appointmentsCount}
                        color="bg-purple-500"
                    />
                    <DashboardWidget 
                        icon={<ClipboardCheck className="w-5 h-5 text-white" />}
                        title="Pending Tasks"
                        value={pendingTasks.unsignedNotes}
                        color="bg-orange-500"
                    />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Visits */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Active Patients</h3>
                            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                                {visitData.detailedVisits.length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {visitData.detailedVisits.length > 0 ? (
                                visitData.detailedVisits.map((visit) => (
                                    <VisitRow key={visit.uuid} visit={visit} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p>No active patients</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tasks */}
                    <div>
                        <TaskCard tasks={mockTasks} />
                    </div>
                </div>
            </div>
        </div>
    );
}