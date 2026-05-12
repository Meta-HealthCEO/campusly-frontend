import { permanentRedirect } from 'next/navigation';

export default function QuickMakeRedirect() {
  permanentRedirect('/teacher/lessons');
}
