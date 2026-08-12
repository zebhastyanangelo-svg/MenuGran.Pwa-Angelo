import { AuthForm } from '../components/auth/AuthForm';

export function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <AuthForm defaultTab="register" />
      </div>
    </div>
  );
}
