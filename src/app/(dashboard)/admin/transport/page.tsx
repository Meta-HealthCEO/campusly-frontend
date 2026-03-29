'use client';

import { Bus, MapPin, Phone, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockTransportRoutes } from '@/lib/mock-data';

export default function TransportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transport</h1>
        <p className="text-muted-foreground">Manage school transport routes and drivers</p>
      </div>

      {mockTransportRoutes.length === 0 ? (
        <EmptyState icon={Bus} title="No routes" description="No transport routes have been configured yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {mockTransportRoutes.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-primary" />
                    {route.name}
                  </div>
                  <Badge
                    className={
                      route.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }
                  >
                    {route.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{route.description}</p>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">Driver Information</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {route.driverName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {route.driverPhone}
                  </div>
                  <p className="text-sm text-muted-foreground">Vehicle: {route.vehicleReg}</p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Stops</p>
                  <div className="space-y-2">
                    {route.stops
                      .sort((a, b) => a.order - b.order)
                      .map((stop, index) => (
                        <div key={stop.id} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {index + 1}
                            </div>
                            {index < route.stops.length - 1 && (
                              <div className="h-4 w-px bg-border" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{stop.name}</p>
                              <span className="text-xs text-muted-foreground">{stop.time}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {stop.address}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {route.studentIds.length} student{route.studentIds.length !== 1 ? 's' : ''} on this route
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
