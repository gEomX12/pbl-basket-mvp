import { redirect } from 'next/navigation';

/** Регистрация живёт на той же странице, что и вход. */
export default function RegisterPage() {
  redirect('/login');
}
