'use client';

import { Calendar, CheckCircle, Clock, AlertTriangle, FileText, Video, Users } from 'lucide-react';

interface ConsultationActivity {
  id: string;
  type: 'meeting' | 'document' | 'milestone' | 'ceremony';
  title: string;
  community: string;
  date: string;
  status: 'completed' | 'upcoming' | 'overdue';
  requiredBy?: string;
  participants?: number;
  complianceItem: boolean;
}

const mockActivities: ConsultationActivity[] = [
  {
    id: '1',
    type: 'meeting',
    title: 'Quarterly Community Update',
    community: 'Matawa First Nations',
    date: '2025-01-15',
    status: 'completed',
    participants: 45,
    complianceItem: true,
  },
  {
    id: '2',
    type: 'document',
    title: 'Environmental Impact Assessment Review',
    community: 'Webequie First Nation',
    date: '2025-02-01',
    status: 'upcoming',
    requiredBy: 'Provincial Regulations',
    complianceItem: true,
  },
  {
    id: '3',
    type: 'ceremony',
    title: 'Spring Ceremony - No Activities',
    community: 'All Communities',
    date: '2025-03-21',
    status: 'upcoming',
    complianceItem: false,
  },
  {
    id: '4',
    type: 'milestone',
    title: 'Benefit Agreement Annual Review',
    community: 'Neskantaga First Nation',
    date: '2025-01-30',
    status: 'overdue',
    requiredBy: 'IBA Terms',
    complianceItem: true,
  },
];

export default function ConsultationTracker() {
  const getStatusColor = (status: ConsultationActivity['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
    }
  };
  
  const getTypeIcon = (type: ConsultationActivity['type']) => {
    switch (type) {
      case 'meeting': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'milestone': return <CheckCircle className="w-4 h-4" />;
      case 'ceremony': return <Users className="w-4 h-4" />;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Timeline View */}
      <div className="space-y-3">
        {mockActivities.map((activity, index) => (
          <div
            key={activity.id}
            className={`border rounded-lg p-4 ${
              activity.status === 'overdue' ? 'border-red-200 bg-red-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  activity.status === 'completed' ? 'bg-green-100' :
                  activity.status === 'upcoming' ? 'bg-blue-100' :
                  'bg-red-100'
                }`}>
                  {getTypeIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{activity.community}</p>
                  {activity.requiredBy && (
                    <p className="text-xs text-gray-500 mt-1">Required by: {activity.requiredBy}</p>
                  )}
                  {activity.participants && (
                    <p className="text-xs text-gray-500 mt-1">{activity.participants} participants</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
                <p className="text-sm text-gray-600 mt-1">{activity.date}</p>
                {activity.complianceItem && (
                  <p className="text-xs text-amber-600 font-semibold mt-1">Compliance Required</p>
                )}
              </div>
            </div>
            
            {/* Connect to next item */}
            {index < mockActivities.length - 1 && (
              <div className="ml-5 mt-4 border-l-2 border-gray-200 h-4"></div>
            )}
          </div>
        ))}
      </div>
      
      {/* Compliance Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">23</div>
          <div className="text-xs text-gray-600">Completed</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">7</div>
          <div className="text-xs text-gray-600">Upcoming</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">1</div>
          <div className="text-xs text-gray-600">Overdue</div>
        </div>
      </div>
      
      {/* Alert */}
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">Action Required</p>
          <p className="text-xs text-red-700 mt-1">
            The Benefit Agreement review with Neskantaga First Nation is overdue. This could impact 
            your social license and trigger compliance issues.
          </p>
        </div>
      </div>
    </div>
  );
}