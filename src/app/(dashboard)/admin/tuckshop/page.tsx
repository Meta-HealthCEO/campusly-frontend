'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ShoppingCart, History } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTuckShopMenu, useTuckShopMenuMutations } from '@/hooks/useTuckShop';
import type { TuckshopItem } from '@/types';
import { getMenuItemColumns } from '@/components/tuckshop/MenuItemColumns';
import { MenuItemFormDialog } from '@/components/tuckshop/MenuItemFormDialog';
import { StockEditorDialog } from '@/components/tuckshop/StockEditorDialog';
import { PlaceOrderDialog } from '@/components/tuckshop/PlaceOrderDialog';
import { OrderHistoryDialog } from '@/components/tuckshop/OrderHistoryDialog';
import { DailySalesReport } from '@/components/tuckshop/DailySalesReport';

export default function TuckshopPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const { menuItems, fetchMenu } = useTuckShopMenu();
  const { deleteMenuItem, extractErrorMessage } = useTuckShopMenuMutations();
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<TuckshopItem | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockItem, setStockItem] = useState<TuckshopItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<TuckshopItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const fetchMenuItems = useCallback(async () => {
    await fetchMenu();
    setLoading(false);
  }, [fetchMenu]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const handleEdit = (item: TuckshopItem) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const handleDelete = (item: TuckshopItem) => {
    setDeleteItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteMenuItem(deleteItem.id);
      toast.success('Menu item deleted');
      setDeleteDialogOpen(false);
      fetchMenuItems();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete item'));
    } finally {
      setDeleting(false);
    }
  };

  const handleStock = (item: TuckshopItem) => {
    setStockItem(item);
    setStockDialogOpen(true);
  };

  const handleCreate = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const columns = useMemo(
    () => getMenuItemColumns({ onEdit: handleEdit, onDelete: handleDelete, onStock: handleStock }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tuckshop Management" description="Manage menu items, place orders, and track daily sales">
        <Button variant="outline" onClick={() => setHistoryDialogOpen(true)}>
          <History className="h-4 w-4 mr-1" /> Order History
        </Button>
        <Button variant="outline" onClick={() => setOrderDialogOpen(true)}>
          <ShoppingCart className="h-4 w-4 mr-1" /> Place Order
        </Button>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </PageHeader>

      <Tabs defaultValue="menu">
        <TabsList>
          <TabsTrigger value="menu">Menu Items</TabsTrigger>
          <TabsTrigger value="sales">Daily Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-4">
          <DataTable
            columns={columns}
            data={menuItems}
            searchKey="name"
            searchPlaceholder="Search items..."
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <DailySalesReport schoolId={schoolId} />
        </TabsContent>
      </Tabs>

      {/* Create/Edit dialog */}
      <MenuItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        schoolId={schoolId}
        onSaved={fetchMenuItems}
      />

      {/* Stock editor dialog */}
      <StockEditorDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        item={stockItem}
        onSaved={fetchMenuItems}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Place order dialog */}
      <PlaceOrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        schoolId={schoolId}
        onOrderPlaced={fetchMenuItems}
      />

      {/* Order history dialog */}
      <OrderHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />
    </div>
  );
}
