import { redirect } from 'next/navigation';

export default function DeprecatedRedirect() {
  redirect('/teacher/curriculum/ai-studio?tool=paper');
}
