import { checkProfileCompletion, getCompletionPercentage } from '/lib/profileCompletion';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface ProfileCompletionCardProps {
  detailerData: any;
}

export default function ProfileCompletionCard({ detailerData }: ProfileCompletionCardProps) {
  const completionStatus = checkProfileCompletion(detailerData);
  const completionPercentage = getCompletionPercentage(detailerData);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Profile Completion</h2>
        <span className="text-2xl font-bold text-[#389167]">{completionPercentage}%</span>
      </div>

      <div className="space-y-3">
        {Object.entries(completionStatus).map(([field, isComplete]) => (
          <div key={field} className="flex items-center justify-between">
            <span className="text-sm capitalize">
              {field.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            {isComplete ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
          </div>
        ))}
      </div>

      {completionPercentage < 100 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-md text-sm text-yellow-700">
          Complete your profile to appear in search results
        </div>
      )}
    </div>
  );
} 