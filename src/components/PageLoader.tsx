import { Loader2 } from 'lucide-react';

export function PageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-8 py-6 shadow-md">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
