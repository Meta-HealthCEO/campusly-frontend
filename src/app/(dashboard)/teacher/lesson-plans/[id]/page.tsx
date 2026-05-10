import { permanentRedirect } from 'next/navigation';

export default async function LessonPlanDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/teacher/lessons/${id}`);
}
