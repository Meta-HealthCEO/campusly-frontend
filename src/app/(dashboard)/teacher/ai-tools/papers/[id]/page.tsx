import { redirect } from 'next/navigation';

export default async function DeprecatedRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/teacher/papers/${id}`);
}
