import { redirect } from 'next/navigation';

/** Форма заявки теперь на главной странице — старые ссылки ведут туда. */
export default function RequestPage() {
  redirect('/#request');
}
