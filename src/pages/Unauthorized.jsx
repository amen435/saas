// frontend/src/pages/Unauthorized.jsx

import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-red-100 rounded-full">
            <ShieldAlert className="w-16 h-16 text-red-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
      </div>
    </div>
  );
}