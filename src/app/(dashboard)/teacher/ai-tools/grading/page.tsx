import { redirect } from 'next/navigation';

export default function DeprecatedAIGradingRedirect() {
  redirect('/teacher/curriculum/mark-papers');
}
