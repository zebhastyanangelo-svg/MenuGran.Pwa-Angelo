export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 to-cream-50 flex items-center justify-center">
      {children}
    </div>
  );
}