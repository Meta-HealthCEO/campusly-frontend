'use client';

interface RiskFactorListProps {
  factors: string[];
}

export function RiskFactorList({ factors }: RiskFactorListProps) {
  if (factors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No risk factors identified.</p>
    );
  }

  return (
    <ul className="list-disc list-inside space-y-1">
      {factors.map((factor: string) => (
        <li key={factor} className="text-sm text-foreground">
          {factor}
        </li>
      ))}
    </ul>
  );
}
