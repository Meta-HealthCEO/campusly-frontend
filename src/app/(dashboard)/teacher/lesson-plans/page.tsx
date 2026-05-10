import { permanentRedirect } from 'next/navigation';

export default function LessonPlansRedirect() {
  permanentRedirect('/teacher/lessons');
}
