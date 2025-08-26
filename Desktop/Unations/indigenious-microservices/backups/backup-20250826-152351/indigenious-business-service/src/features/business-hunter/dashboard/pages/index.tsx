import React from 'react';
import { Dashboard } from '../components/Dashboard';
import { HunterControl } from '../components/HunterControl';
import { useDashboardData } from '../hooks/useDashboardData';

export default function BusinessHunterDashboard() {
  const { hunters, refreshData } = useDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard />
      <div className="p-6">
        <HunterControl hunters={hunters} onUpdate={refreshData} />
      </div>
    </div>
  );
}