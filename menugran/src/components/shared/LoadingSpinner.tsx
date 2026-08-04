export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animated-pulse">
        <div className="w-12 h-12 border-4 border-cream-300 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
