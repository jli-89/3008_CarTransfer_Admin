import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type OrderStatus =
  | 'AwaitingManualQuote'
  | 'Quoted'
  | 'Paid'
  | 'Completed'
  | 'Cancelled';

export type ItemStatus =
  | 'AwaitingPickup'
  | 'PickedUp'
  | 'InTransit'
  | 'AtDestinationDepot'
  | 'OutForDelivery'
  | 'DeliveredToCustomer'
  | 'DeliveredRefused'
  | 'Incident'
  | 'Other';

export interface OrderItemRecord {
  item_id: number;
  order_id: number;
  snap_plate_number: string | null;
  snap_vin: string | null;
  snap_maker: string | null;
  snap_model: string | null;
  snap_colour: string | null;
  snap_vehicle_value: number | null;
  pickup_location: string;
  delivery_location: string;
  transfer_status: ItemStatus;
  transfer_note: string | null;
}

export interface OrderRecord {
  order_id: number;
  public_order_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  price_total: number | null;
  order_status: OrderStatus;
  note: string | null;
  created_at: string | null;
  items: OrderItemRecord[];
}

export interface OrderListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

interface ApiListOrdersResponse {
  ok: boolean;
  data?: OrderRecord[];
  meta?: OrderListMeta;
  error?: string;
}

interface ApiOrderResponse {
  ok: boolean;
  data?: OrderRecord;
  changes?: number;
  error?: string;
}

interface ApiItemResponse {
  ok: boolean;
  data?: OrderItemRecord;
  changes?: number;
  error?: string;
}

interface ApiOptionsResponse {
  ok: boolean;
  data?: string[];
  error?: string;
}

export interface OrderQuery {
  search?: string;
  orderStatus?: string | string[];
  itemStatus?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateOrderPayload {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  price_total?: string | null;
  order_status?: OrderStatus;
  note?: string | null;
}

export interface UpdateItemPayload {
  pickup_location?: string;
  delivery_location?: string;
  transfer_status?: ItemStatus;
  transfer_note?: string | null;
  snap_plate_number?: string | null;
  snap_vin?: string | null;
  snap_maker?: string | null;
  snap_model?: string | null;
  snap_colour?: string | null;
  snap_vehicle_value?: string | null;
}

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'AwaitingManualQuote',
  'Quoted',
  'Paid',
  'Completed',
  'Cancelled'
];

export const ITEM_STATUS_OPTIONS: ItemStatus[] = [
  'AwaitingPickup',
  'PickedUp',
  'InTransit',
  'AtDestinationDepot',
  'OutForDelivery',
  'DeliveredToCustomer',
  'DeliveredRefused',
  'Incident',
  'Other'
];

@Injectable({ providedIn: 'root' })
export class OrderManagementService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listOrders(query: OrderQuery): Observable<{ data: OrderRecord[]; meta: OrderListMeta }>
  {
    let params = new HttpParams();

    if (query.search) {
      params = params.set('search', query.search.trim());
    }

    if (query.orderStatus) {
      const statuses = Array.isArray(query.orderStatus)
        ? query.orderStatus
        : [query.orderStatus];
      const filtered = statuses.map((s) => s.trim()).filter((s) => !!s);
      if (filtered.length) {
        params = params.set('status', filtered.join(','));
      }
    }

    if (query.itemStatus) {
      const statuses = Array.isArray(query.itemStatus)
        ? query.itemStatus
        : [query.itemStatus];
      const filtered = statuses.map((s) => s.trim()).filter((s) => !!s);
      if (filtered.length) {
        params = params.set('itemStatus', filtered.join(','));
      }
    }

    if (query.dateFrom) {
      params = params.set('date_from', query.dateFrom);
    }

    if (query.dateTo) {
      params = params.set('date_to', query.dateTo);
    }

    if (typeof query.page === 'number' && query.page > 0) {
      params = params.set('page', String(query.page));
    }

    if (typeof query.pageSize === 'number' && query.pageSize > 0) {
      params = params.set('pageSize', String(query.pageSize));
    }

    return this.http
      .get<ApiListOrdersResponse>(`${this.baseUrl}/orders`, { params })
      .pipe(
        map((res) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Unable to load orders');
          }
          const data = res.data ?? [];
          const meta: OrderListMeta = res.meta ?? {
            total: data.length,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? (data.length || 1),
            totalPages: 1,
            hasMore: false,
          };
          return { data, meta };
        })
      );
  }

  getTransferStatusOptions(): Observable<string[]> {
    return this.http
      .get<ApiOptionsResponse>(`${this.baseUrl}/meta/transfer-status-options`)
      .pipe(
        map((res) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Unable to load item status options');
          }
          return res.data ?? [];
        })
      );
  }

  updateOrder(orderId: number, payload: UpdateOrderPayload): Observable<OrderRecord> {
    const body: Record<string, unknown> = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        body[key] = value;
      }
    });

    return this.http
      .put<ApiOrderResponse>(`${this.baseUrl}/orders/${orderId}`, body)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Failed to update order');
          }
          return res.data;
        })
      );
  }

  updateItem(itemId: number, payload: UpdateItemPayload): Observable<OrderItemRecord> {
    const body: Record<string, unknown> = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        body[key] = value;
      }
    });

    return this.http
      .put<ApiItemResponse>(`${this.baseUrl}/items/${itemId}`, body)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Failed to update order item');
          }
          return res.data;
        })
      );
  }
}
