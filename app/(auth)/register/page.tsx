import { RegisterForm } from './_components/RegisterForm';

export const metadata = { title: 'Create Account' };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <RegisterForm />
    </div>
  );
}
