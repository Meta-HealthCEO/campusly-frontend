import { redirect } from 'next/navigation';

export default function DeprecatedRedirect() {
  redirect('/teacher/papers');
}
