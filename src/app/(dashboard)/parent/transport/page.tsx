'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Bus, MapPin, Phone, User, Clock, Route, Car, CircleDot,
} from 'lucide-react';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentTransport } from '@/hooks/useParentTransport';

export default function TransportPage() {
  const { children } = useCurrentParent();
  const { routes, loading } = useParentTransport();

  const childIds = children.map((c) => c.id);

  const childRoutes = children.map((child) => {
    const route = routes.find((r) => r.studentIds?.includes(child.id));
    return { child, route };
  });

  const uniqueRoutes = routes.filter((route) =>
    childIds.some((id) => route.studentIds?.includes(id))
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Transport" description="View your children's school transport routes and schedules." />

      <div className="grid gap-4 md:grid-cols-2">
        {childRoutes.map(({ child, route }) => {
          const firstName = child.user?.firstName ?? child.firstName ?? '';
          const lastName = child.user?.lastName ?? child.lastName ?? '';
          return (
            <Card key={child.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {firstName.charAt(0)}{lastName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{firstName} {lastName}</p>
                    <p className="text-sm text-muted-foreground">{child.grade?.name ?? ''} - {child.class?.name ?? ''}</p>
                  </div>
                  {route ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                      <Bus className="h-3 w-3 mr-1" />{route.name}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">No Route</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {uniqueRoutes.length > 0 ? (
        <div className="space-y-4">
          {uniqueRoutes.map((route) => {
            const assignedChildren = children.filter((c) => route.studentIds?.includes(c.id));

            return (
              <Card key={route.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><Route className="h-5 w-5 text-primary" />{route.name}</CardTitle>
                      <CardDescription>{route.description}</CardDescription>
                    </div>
                    <Badge variant="secondary" className={route.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                      {route.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Driver Information</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="font-medium">{route.driverName}</span></div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Phone</span>
                          <a href={`tel:${route.driverPhone.replace(/\s/g, '')}`} className="font-medium text-primary flex items-center gap-1"><Phone className="h-3 w-3" />{route.driverPhone}</a>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="text-sm font-medium flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground" />Vehicle Information</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Registration</span><span className="font-mono font-semibold bg-muted px-2 py-0.5 rounded">{route.vehicleReg}</span></div>
                        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Students on route</span><span className="font-medium">{route.studentIds?.length ?? 0}</span></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Route Stops</p>
                    <div className="relative">
                      {(route.stops ?? []).sort((a, b) => a.order - b.order).map((stop, index) => {
                        const isLast = index === (route.stops?.length ?? 1) - 1;
                        return (
                          <div key={stop.id ?? index} className="flex gap-3 pb-4 last:pb-0">
                            <div className="flex flex-col items-center">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isLast ? 'bg-primary text-primary-foreground' : 'bg-muted border-2 border-primary'}`}>
                                {isLast ? <MapPin className="h-3 w-3" /> : <CircleDot className="h-3 w-3 text-primary" />}
                              </div>
                              {!isLast && <div className="w-0.5 flex-1 bg-border my-1" />}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{stop.name}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3 w-3" />{stop.time}</div>
                              </div>
                              <p className="text-xs text-muted-foreground">{stop.address}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {assignedChildren.length > 0 && (
                    <div>
                      <Separator className="mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Your children on this route: {assignedChildren.map((c) => `${c.user?.firstName ?? ''} ${c.user?.lastName ?? ''}`).join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Bus} title="No transport routes" description="Your children are not assigned to any transport routes." />
      )}
    </div>
  );
}
