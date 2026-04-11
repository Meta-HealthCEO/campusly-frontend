// Teachers use the same incident detail view as admins — the component
// already gates sensitive sections via `hasPermission` checks, so simply
// re-exporting keeps behaviour identical for both roles without duplication.
export { default } from '@/app/(dashboard)/admin/incidents/[id]/page';
