import { redirect } from 'next/navigation';

export default function DeprecatedTeacherAIAssistantRedirect() {
  redirect('/teacher/curriculum/ai-studio');
}
