import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="card max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-full mb-4">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            لا تملك صلاحية الوصول إلى هذه الصفحة. تواصل مع مدير النظام إذا كنت تحتاج صلاحية إضافية.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>
    </div>
  );
}
