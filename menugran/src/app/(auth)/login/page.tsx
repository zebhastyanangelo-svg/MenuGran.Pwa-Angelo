'use client';

import { useState } from 'react';
import Header from '@/components/shared/Header';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implementar lógica de login
    
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <Header title="Ingresa a tu cuenta" />
      
      <section className="max-w-md mx-auto px-4 py-12">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
          
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          
          <Button 
            type="submit" 
            isLoading={isLoading}
            className="w-full"
          >
            Ingresar
          </Button>
        </form>
      </section>
    </main>
  );
}
