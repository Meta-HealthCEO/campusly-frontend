export const categoryLabels: Record<string, string> = {
  clothing: 'Clothing',
  stationery: 'Stationery',
  lunch_box: 'Lunch Box',
  electronics: 'Electronics',
  sports: 'Sports',
  bags: 'Bags',
  other: 'Other',
};

export const categoryStyles: Record<string, string> = {
  clothing: 'bg-blue-100 text-blue-800',
  stationery: 'bg-purple-100 text-purple-800',
  lunch_box: 'bg-orange-100 text-orange-800',
  electronics: 'bg-slate-100 text-slate-800',
  sports: 'bg-green-100 text-green-800',
  bags: 'bg-rose-100 text-rose-800',
  other: 'bg-gray-100 text-gray-800',
};

export const foundStatusStyles: Record<string, string> = {
  unclaimed: 'bg-amber-100 text-amber-800',
  claimed: 'bg-emerald-100 text-emerald-800',
  matched: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-500',
};

export const lostStatusStyles: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  matched: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-500',
};
