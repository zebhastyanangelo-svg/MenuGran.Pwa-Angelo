import { AuthForm } from '../components/auth/AuthForm';

export function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <AuthForm defaultTab="login" />
      </div>
    </div>
  );
}
