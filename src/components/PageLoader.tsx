export function PageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-8 py-6 shadow-md">
        <i className="fa-solid fa-circle-notch text-3xl animate-spin text-indigo-600" aria-hidden="true" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
