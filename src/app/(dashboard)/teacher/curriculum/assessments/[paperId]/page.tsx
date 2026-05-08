import { redirect } from 'next/navigation';

export default async function DeprecatedRedirect({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  redirect(`/teacher/papers/${paperId}`);
}
