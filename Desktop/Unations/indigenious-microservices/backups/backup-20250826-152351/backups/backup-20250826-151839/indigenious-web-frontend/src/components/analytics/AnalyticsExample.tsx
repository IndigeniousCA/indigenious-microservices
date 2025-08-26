/**
 * Example implementation of Indigenous analytics tracking
 * Shows best practices for privacy-preserving analytics
 */

import React, { useState } from 'react';
import { 
  useRFQTracking, 
  useRegistrationTracking, 
  useElderConsultationTracking,
  useSearchTracking,
  useEngagementTracking,
  useFeatureTracking
} from '@/hooks/useIndigenousAnalytics';

/**
 * Example: RFQ View Component with Analytics
 */
export function RFQViewExample({ rfqId, rfqData }: { rfqId: string; rfqData: any }) {
  const { trackDownload, trackInterest, trackBidSubmission } = useRFQTracking(rfqId);
  
  // Track page engagement
  useEngagementTracking(`rfq_${rfqId}`);

  const handleDownload = async (documentType: string) => {
    // Track download event
    trackDownload(documentType);
    
    // Perform actual download
    // ... download logic
  };

  const handleSubmitInterest = async () => {
    // Track interest submission
    trackInterest('indigenous_owned', 'verified');
    
    // Submit interest logic
    // ...
  };

  const handleSubmitBid = async (bidData: unknown) => {
    // Track bid submission
    trackBidSubmission('indigenous_owned', 'verified');
    
    // Submit bid logic
    // ...
  };

  return (
    <div className="rfq-view" data-track-visibility={`rfq_${rfqId}`}>
      <h1>{rfqData.title}</h1>
      
      <button onClick={() => handleDownload('specification')}>
        Download Specifications
      </button>
      
      <button onClick={handleSubmitInterest}>
        Express Interest
      </button>
      
      <button onClick={() => handleSubmitBid({})}>
        Submit Bid
      </button>
    </div>
  );
}

/**
 * Example: Business Registration Flow with Analytics
 */
export function RegistrationFlowExample() {
  const [currentStep, setCurrentStep] = useState(1);
  const { startStep, completeStep } = useRegistrationTracking();
  const { trackFeatureUse } = useFeatureTracking();

  const steps = [
    'basic_information',
    'business_details',
    'indigenous_verification',
    'documentation',
    'review_submit'
  ];

  const handleNextStep = () => {
    // Complete current step
    completeStep('indigenous_owned');
    
    // Move to next step
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      startStep(steps[nextStep - 1]);
    }
  };

  const handleFeatureUse = (feature: string) => {
    trackFeatureUse(feature, { step: steps[currentStep - 1] });
  };

  React.useEffect(() => {
    // Start tracking first step
    startStep(steps[0]);
  }, []);

  return (
    <div className="registration-flow">
      <h2>Step {currentStep} of {steps.length}: {steps[currentStep - 1]}</h2>
      
      {currentStep === 3 && (
        <button onClick={() => handleFeatureUse('auto_verification')}>
          Use Auto-Verification
        </button>
      )}
      
      <button onClick={handleNextStep}>
        Next Step
      </button>
    </div>
  );
}

/**
 * Example: Elder Consultation Tracking
 */
export function ElderConsultationExample() {
  const { trackConsultation } = useElderConsultationTracking();
  
  const handleConsultationStart = () => {
    trackConsultation('project_review', 'initial', 'western_region');
  };

  const handleConsultationProgress = () => {
    trackConsultation('project_review', 'ongoing', 'western_region');
  };

  const handleConsultationComplete = () => {
    trackConsultation('project_review', 'completed', 'western_region');
  };

  return (
    <div className="elder-consultation">
      <h2>Elder Consultation Portal</h2>
      
      <button onClick={handleConsultationStart}>
        Start Consultation
      </button>
      
      <button onClick={handleConsultationProgress}>
        Update Progress
      </button>
      
      <button onClick={handleConsultationComplete}>
        Mark Complete
      </button>
    </div>
  );
}

/**
 * Example: Privacy-Preserving Search
 */
export function SearchExample() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [filters, setFilters] = useState({});
  const { trackSearchQuery } = useSearchTracking();

  const handleSearch = async (searchQuery: string) => {
    // Perform search
    const searchResults = await performSearch(searchQuery, filters);
    setResults(searchResults);
    
    // Track search (privacy-preserving)
    trackSearchQuery(searchQuery, searchResults.length, filters);
  };

  // Mock search function
  async function performSearch(q: string, f: any) {
    // Search implementation
    return [];
  }

  return (
    <div className="search-component">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyUp={(e) => e.key === 'Enter' && handleSearch(query)}
        placeholder="Search RFQs..."
      />
      
      <div className="filters">
        <label>
          <input
            type="checkbox"
            onChange={(e) => setFilters({ ...filters, indigenous_only: e.target.checked })}
          />
          Indigenous Businesses Only
        </label>
      </div>
      
      <div className="results">
        {results.map((result, i) => (
          <div key={i}>{result.title}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example: Analytics Dashboard Component
 */
export function AnalyticsDashboardExample() {
  return (
    <div className="analytics-dashboard">
      <h2>Analytics Overview</h2>
      <p className="text-sm text-gray-600 mb-4">
        All analytics data is stored locally and never leaves our infrastructure.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold">RFQ Engagement</h3>
          <p className="text-2xl font-bold">1,234</p>
          <p className="text-sm text-gray-600">Views this month</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold">Business Registrations</h3>
          <p className="text-2xl font-bold">89</p>
          <p className="text-sm text-gray-600">New Indigenous businesses</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold">Elder Consultations</h3>
          <p className="text-2xl font-bold">23</p>
          <p className="text-sm text-gray-600">Active consultations</p>
        </div>
      </div>
      
      <div className="mt-6">
        <a
          href="/analytics"
          className="text-blue-600 hover:text-blue-800"
        >
          View Detailed Analytics →
        </a>
        <p className="text-xs text-gray-500 mt-2">
          Analytics are anonymized and aggregated to protect privacy
        </p>
      </div>
    </div>
  );
}