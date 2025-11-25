import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface DescriptionsStatusProps {
  isLoading: boolean;
  error: string | null;
  descriptionsCount: number;
}

const DescriptionsStatus: React.FC<DescriptionsStatusProps> = ({
  isLoading,
  error,
  descriptionsCount,
}) => {
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium text-blue-800">Loading parameter descriptions...</span>
        </div>
      </div>
    );
  }

  if (descriptionsCount > 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">
            Parameter descriptions loaded ({descriptionsCount} parameters)
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="font-medium text-yellow-800">
            {error}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default DescriptionsStatus;
