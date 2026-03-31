'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  ShoppingBag, Plus, Minus, Trash2, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { AllergenWarningDialog } from './AllergenWarningDialog';
import type { TuckshopItem, Student } from '@/types';

type PaymentMethod = 'wallet' | 'wristband' | 'cash';

interface CartEntry {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface PlaceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onOrderPlaced: () => void;
}

function getStudentName(s: Student): string {
  const u = s.user ?? (s.userId as unknown as { firstName?: string; lastName?: string });
  if (typeof u === 'object' && u !== null && u.firstName) {
    return `${u.firstName} ${u.lastName ?? ''}`.trim();
  }
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  return s.admissionNumber ?? 'Unknown';
}

export function PlaceOrderDialog({
  open, onOpenChange, schoolId, onOrderPlaced,
}: PlaceOrderDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [menuItems, setMenuItems] = useState<TuckshopItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [wristbandId, setWristbandId] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Allergen override state
  const [allergenDialogOpen, setAllergenDialogOpen] = useState(false);
  const [allergenError, setAllergenError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, menuRes] = await Promise.all([
        apiClient.get('/students'),
        apiClient.get('/tuck-shop/menu'),
      ]);
      const sRaw = studentsRes.data.data ?? studentsRes.data;
      const sList: Student[] = Array.isArray(sRaw)
        ? sRaw : sRaw.students ?? sRaw.data ?? [];
      setStudents(sList);

      const mRaw = menuRes.data.data ?? menuRes.data;
      const mList = Array.isArray(mRaw) ? mRaw : mRaw.items ?? mRaw.data ?? [];
      setMenuItems(
        mList.map((item: Record<string, unknown>) => ({
          ...item,
          id: (item._id as string) ?? (item.id as string),
        })),
      );
    } catch {
      console.error('Failed to load order data');
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
      setCart([]);
      setSelectedStudentId('');
      setPaymentMethod('wallet');
      setWristbandId('');
      setMenuSearch('');
    }
  }, [open, fetchData]);

  const addToCart = (item: TuckshopItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, unitPrice: item.price, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const removeItem = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  const submitOrder = async (allergenOverride = false) => {
    if (!selectedStudentId) { toast.error('Please select a student'); return; }
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (paymentMethod === 'wristband' && !wristbandId.trim()) {
      toast.error('Please enter a wristband ID');
      return;
    }

    const body = {
      schoolId,
      studentId: selectedStudentId,
      items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      paymentMethod,
      ...(paymentMethod === 'wristband' ? { wristbandId: wristbandId.trim() } : {}),
      ...(allergenOverride ? { allergenOverride: true } : {}),
    };

    setSubmitting(true);
    try {
      await apiClient.post('/tuck-shop/orders', body);
      toast.success('Order placed successfully');
      setAllergenDialogOpen(false);
      onOrderPlaced();
      onOpenChange(false);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string }; status?: number } })?.response;
      const msg = errData?.data?.message ?? 'Failed to place order';

      if (errData?.status === 400 && msg.toLowerCase().includes('allerg') && !allergenOverride) {
        setAllergenError(msg);
        setAllergenDialogOpen(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMenu = menuItems.filter(
    (item) =>
      item.isAvailable &&
      item.name.toLowerCase().includes(menuSearch.toLowerCase()),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>Select a student, add items, and choose a payment method.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student selector */}
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={(val: unknown) => setSelectedStudentId(val as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id ?? s._id} value={s.id ?? s._id ?? ''}>
                      {getStudentName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Menu items */}
            <div className="space-y-2">
              <Label>Menu Items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {filteredMenu.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="rounded-lg border p-2 text-left hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-primary font-semibold">{formatCurrency(item.price)}</span>
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    </div>
                    {item.allergens.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.allergens.map((a) => (
                          <Badge key={a} variant="outline" className="text-xs px-1">{a}</Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cart */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="font-medium text-sm">Cart ({cart.length} items)</span>
                </div>
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No items in cart</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((c) => (
                      <div key={c.menuItemId} className="flex items-center justify-between text-sm">
                        <span className="flex-1 truncate">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <Button size="icon-xs" variant="outline" onClick={() => updateQty(c.menuItemId, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center">{c.quantity}</span>
                          <Button size="icon-xs" variant="outline" onClick={() => updateQty(c.menuItemId, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="w-20 text-right font-medium">{formatCurrency(c.unitPrice * c.quantity)}</span>
                          <Button size="icon-xs" variant="ghost" onClick={() => removeItem(c.menuItemId)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(val: unknown) => setPaymentMethod(val as PaymentMethod)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="wristband">Wristband</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod === 'wristband' && (
                <div className="space-y-2">
                  <Label>Wristband ID</Label>
                  <Input
                    value={wristbandId}
                    onChange={(e) => setWristbandId(e.target.value)}
                    placeholder="Scan or enter ID"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={() => submitOrder(false)}
              disabled={submitting || cart.length === 0 || !selectedStudentId}
            >
              {submitting ? 'Processing...' : `Place Order (${formatCurrency(cartTotal)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AllergenWarningDialog
        open={allergenDialogOpen}
        onOpenChange={setAllergenDialogOpen}
        errorMessage={allergenError}
        onOverride={() => submitOrder(true)}
        submitting={submitting}
      />
    </>
  );
}
