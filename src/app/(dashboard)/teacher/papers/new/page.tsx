import { redirect } from 'next/navigation';

export default function NewPaperPage() {
  redirect('/teacher/curriculum/ai-studio?tool=paper');
}
