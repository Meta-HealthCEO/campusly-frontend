import { redirect } from 'next/navigation';

// The full student view for teachers lives in the workbench Student 360.
// This route only hosts /credentials/* subpages, so the bare detail URL
// forwards to the real profile instead of 404ing.
export default async function TeacherStudentDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/teacher/workbench/student-360/${id}`);
}
