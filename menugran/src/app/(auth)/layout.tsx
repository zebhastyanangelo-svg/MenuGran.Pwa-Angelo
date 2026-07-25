export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-white flex items-center justify-center">
      {children}
    </div>
  );
}
