import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  ItemStatus,
  OrderItemRecord,
  OrderListMeta,
  OrderManagementService,
  OrderQuery,
  OrderRecord,
  OrderStatus,
  ORDER_STATUS_OPTIONS,
  UpdateItemPayload,
  UpdateOrderPayload,
  ITEM_STATUS_OPTIONS,
} from './order-management.service';

interface FiltersState {
  search: string;
  orderStatus: string;
  itemStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderEditForm {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  price_total: string;
  order_status: OrderStatus | '';
  note: string;
}

interface ItemEditForm {
  pickup_location: string;
  delivery_location: string;
  transfer_status: ItemStatus | '';
  transfer_note: string;
  snap_plate_number: string;
  snap_vin: string;
  snap_maker: string;
  snap_model: string;
  snap_colour: string;
  snap_vehicle_value: string;
}

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.html',
  styleUrls: ['./order-management.css']
})
export class OrderManagementComponent implements OnInit {
  orders: OrderRecord[] = [];
  meta: OrderListMeta | null = null;

  filters: FiltersState = {
    search: '',
    orderStatus: '',
    itemStatus: '',
    dateFrom: '',
    dateTo: ''
  };

  currentPage = 1;
  pageSize = 20;

  readonly orderStatusOptions = ORDER_STATUS_OPTIONS;
  itemStatusOptions: string[] = [...ITEM_STATUS_OPTIONS];

  expandedOrders = new Set<number>();

  isLoading = false;
  errorMessage: string | null = null;

  editingOrderId: number | null = null;
  orderEditForm: OrderEditForm | null = null;
  orderEditError: string | null = null;
  isSavingOrder = false;

  editingItemId: number | null = null;
  itemEditOrderId: number | null = null;
  itemEditForm: ItemEditForm | null = null;
  itemEditError: string | null = null;
  isSavingItem = false;

  constructor(private orderService: OrderManagementService) {}

  ngOnInit(): void {
    this.fetchItemStatusOptions();
    this.loadOrders();
  }

  fetchItemStatusOptions(): void {
    this.orderService.getTransferStatusOptions().subscribe({
      next: (options) => {
        if (options.length) {
          this.itemStatusOptions = options;
        }
      },
      error: () => {
        // fallback to default constant already set
      }
    });
  }

  loadOrders(): void {
    const query: OrderQuery = {
      search: this.filters.search.trim() || undefined,
      orderStatus: this.filters.orderStatus || undefined,
      itemStatus: this.filters.itemStatus || undefined,
      dateFrom: this.filters.dateFrom || undefined,
      dateTo: this.filters.dateTo || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.isLoading = true;
    this.errorMessage = null;

    this.orderService
      .listOrders(query)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ data, meta }) => {
          this.orders = data;
          this.meta = meta;
          this.currentPage = meta.page;
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error, 'Unable to load orders.');
          this.orders = [];
        }
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.expandedOrders.clear();
    this.loadOrders();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      orderStatus: '',
      itemStatus: '',
      dateFrom: '',
      dateTo: ''
    };
    this.currentPage = 1;
    this.expandedOrders.clear();
    this.loadOrders();
  }

  goToPage(page: number): void {
    if (!this.meta) {
      return;
    }
    const target = Math.min(Math.max(page, 1), this.meta.totalPages || 1);
    if (target === this.currentPage) {
      return;
    }
    this.currentPage = target;
    this.expandedOrders.clear();
    this.loadOrders();
  }

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  toggleOrderItems(orderId: number): void {
    if (this.expandedOrders.has(orderId)) {
      this.expandedOrders.delete(orderId);
    } else {
      this.expandedOrders.add(orderId);
    }
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrders.has(orderId);
  }

  openOrderEdit(order: OrderRecord): void {
    this.editingOrderId = order.order_id;
    this.orderEditError = null;
    this.orderEditForm = {
      customer_name: order.customer_name || '',
      customer_email: order.customer_email || '',
      customer_phone: order.customer_phone || '',
      price_total: this.toDecimalString(order.price_total),
      order_status: order.order_status,
      note: order.note || ''
    };
  }

  cancelOrderEdit(): void {
    this.editingOrderId = null;
    this.orderEditForm = null;
    this.orderEditError = null;
  }

  saveOrderEdit(order: OrderRecord): void {
    if (!this.orderEditForm) {
      return;
    }

    const form = this.orderEditForm;
    const customerName = form.customer_name.trim();
    const customerEmail = form.customer_email.trim();
    const customerPhone = form.customer_phone.trim();
    const status = form.order_status;

    if (!customerName || !customerEmail || !customerPhone || !status) {
      this.orderEditError = 'Name, email, phone, and status are required.';
      return;
    }

    const payload: UpdateOrderPayload = {
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      order_status: status,
    };

    const price = form.price_total.trim();
    payload.price_total = price ? price : null;

    const note = form.note.trim();
    payload.note = note ? note : null;

    this.isSavingOrder = true;
    this.orderEditError = null;

    this.orderService
      .updateOrder(order.order_id, payload)
      .pipe(finalize(() => (this.isSavingOrder = false)))
      .subscribe({
        next: (updated) => {
          this.orders = this.orders.map((existing) =>
            existing.order_id === updated.order_id ? updated : existing
          );
          this.editingOrderId = null;
          this.orderEditForm = null;
        },
        error: (error) => {
          this.orderEditError = this.toErrorMessage(error, 'Failed to update order.');
        }
      });
  }

  openItemEdit(order: OrderRecord, item: OrderItemRecord): void {
    this.editingItemId = item.item_id;
    this.itemEditOrderId = order.order_id;
    this.itemEditError = null;

    this.itemEditForm = {
      pickup_location: item.pickup_location || '',
      delivery_location: item.delivery_location || '',
      transfer_status: item.transfer_status || '',
      transfer_note: item.transfer_note || '',
      snap_plate_number: item.snap_plate_number || '',
      snap_vin: item.snap_vin || '',
      snap_maker: item.snap_maker || '',
      snap_model: item.snap_model || '',
      snap_colour: item.snap_colour || '',
      snap_vehicle_value: this.toDecimalString(item.snap_vehicle_value),
    };
  }

  cancelItemEdit(): void {
    this.editingItemId = null;
    this.itemEditOrderId = null;
    this.itemEditForm = null;
    this.itemEditError = null;
  }

  saveItemEdit(order: OrderRecord, item: OrderItemRecord): void {
    if (!this.itemEditForm) {
      return;
    }

    const form = this.itemEditForm;
    const pickup = form.pickup_location.trim();
    const delivery = form.delivery_location.trim();
    const status = form.transfer_status;

    if (!pickup || !delivery || !status) {
      this.itemEditError = 'Pickup, delivery, and status are required.';
      return;
    }

    const value = form.snap_vehicle_value.trim();
    if (value && Number.isNaN(Number(value))) {
      this.itemEditError = 'Vehicle value must be numeric.';
      return;
    }

    const payload: UpdateItemPayload = {
      pickup_location: pickup,
      delivery_location: delivery,
      transfer_status: status,
      transfer_note: form.transfer_note.trim() ? form.transfer_note.trim() : null,
      snap_plate_number: form.snap_plate_number.trim() ? form.snap_plate_number.trim() : null,
      snap_vin: form.snap_vin.trim() ? form.snap_vin.trim() : null,
      snap_maker: form.snap_maker.trim() ? form.snap_maker.trim() : null,
      snap_model: form.snap_model.trim() ? form.snap_model.trim() : null,
      snap_colour: form.snap_colour.trim() ? form.snap_colour.trim() : null,
      snap_vehicle_value: value ? value : null,
    };

    this.isSavingItem = true;
    this.itemEditError = null;

    this.orderService
      .updateItem(item.item_id, payload)
      .pipe(finalize(() => (this.isSavingItem = false)))
      .subscribe({
        next: (updatedItem) => {
          this.orders = this.orders.map((existing) => {
            if (existing.order_id !== updatedItem.order_id) {
              return existing;
            }
            const updatedItems = existing.items.map((existingItem) =>
              existingItem.item_id === updatedItem.item_id ? updatedItem : existingItem
            );
            return { ...existing, items: updatedItems };
          });
          this.cancelItemEdit();
        },
        error: (error) => {
          this.itemEditError = this.toErrorMessage(error, 'Failed to update item.');
        }
      });
  }

  trackByOrderId(_: number, order: OrderRecord): number {
    return order.order_id;
  }

  trackByItemId(_: number, item: OrderItemRecord): number {
    return item.item_id;
  }

  private toDecimalString(value: number | null | undefined): string {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toFixed(2);
    }
    return '';
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      const maybeHttp = error as { error?: { error?: string; message?: string }; message?: string };
      return (
        maybeHttp.error?.error ||
        maybeHttp.error?.message ||
        maybeHttp.message ||
        fallback
      );
    }
    return fallback;
  }
}
