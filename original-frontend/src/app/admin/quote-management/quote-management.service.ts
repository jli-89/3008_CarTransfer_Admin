import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface QuoteLocation {
  location_id: number;
  city_name: string;
  state_code: string;
  postcode: string;
}

export interface VehicleType {
  vehicle_type_id: number;
  type_code: string;
  description: string | null;
}

export interface RoutePrice {
  price_id: number;
  pickup_id: number;
  pickup_city: string;
  delivery_id: number;
  delivery_city: string;
  vehicle_type_id: number;
  type_code: string;
  price: number;
  transit_days: number | null;
  is_backload: number;
  created_at: string;
}

export interface LocationPayload {
  city_name: string;
  state_code: string;
  postcode: string;
}

export interface RoutePricePayload {
  pickup_id: number;
  delivery_id: number;
  vehicle_type_id: number;
  price: number;
  transit_days?: number | null;
  is_backload?: boolean;
}

export interface RoutePriceFilters {
  pickup_id?: number;
  delivery_id?: number;
  vehicle_type_id?: number;
  is_backload?: boolean;
}

interface ApiListResponse<T> {
  ok: boolean;
  data?: T[];
  error?: string;
}

interface ApiCreateLocationResponse {
  ok: boolean;
  location_id?: number;
  error?: string;
}

interface ApiCreateRouteResponse {
  ok: boolean;
  price_id?: number;
  error?: string;
}

interface ApiAffectResponse {
  ok: boolean;
  affectedRows?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class QuoteManagementService {
  private readonly baseUrl = `${environment.apiUrl}/quotes`;

  constructor(private http: HttpClient) {}

  listLocations(): Observable<QuoteLocation[]> {
    return this.http
      .get<ApiListResponse<QuoteLocation>>(`${this.baseUrl}/locations`)
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to load locations.');
        }
        return res.data ?? [];
      }));
  }

  createLocation(payload: LocationPayload): Observable<number> {
    return this.http
      .post<ApiCreateLocationResponse>(`${this.baseUrl}/locations`, payload)
      .pipe(map((res) => {
        if (!res.ok || typeof res.location_id !== 'number') {
          throw new Error(res.error ?? 'Failed to create location.');
        }
        return res.location_id;
      }));
  }

  updateLocation(locationId: number, payload: LocationPayload): Observable<void> {
    return this.http
      .put<ApiAffectResponse>(`${this.baseUrl}/locations/${locationId}`, payload)
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to update location.');
        }
      }));
  }

  deleteLocation(locationId: number): Observable<void> {
    return this.http
      .delete<ApiAffectResponse>(`${this.baseUrl}/locations/${locationId}`)
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to delete location.');
        }
      }));
  }

  listVehicleTypes(): Observable<VehicleType[]> {
    return this.http
      .get<ApiListResponse<VehicleType>>(`${this.baseUrl}/vehicle-types`)
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to load vehicle types.');
        }
        return res.data ?? [];
      }));
  }

  listRoutePrices(filters: RoutePriceFilters = {}): Observable<RoutePrice[]> {
    let params = new HttpParams();
    if (filters.pickup_id) {
      params = params.set('pickup_id', String(filters.pickup_id));
    }
    if (filters.delivery_id) {
      params = params.set('delivery_id', String(filters.delivery_id));
    }
    if (filters.vehicle_type_id) {
      params = params.set('vehicle_type_id', String(filters.vehicle_type_id));
    }
    if (filters.is_backload !== undefined) {
      params = params.set('is_backload', filters.is_backload ? '1' : '0');
    }

    return this.http
      .get<ApiListResponse<RoutePrice>>(`${this.baseUrl}/route-prices`, { params })
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to load route prices.');
        }
        return res.data ?? [];
      }));
  }

  createRoutePrice(payload: RoutePricePayload): Observable<number> {
    const body = {
      ...payload,
      is_backload: payload.is_backload ? 1 : 0,
    };
    return this.http
      .post<ApiCreateRouteResponse>(`${this.baseUrl}/route-prices`, body)
      .pipe(map((res) => {
        if (!res.ok || typeof res.price_id !== 'number') {
          throw new Error(res.error ?? 'Failed to create route price.');
        }
        return res.price_id;
      }));
  }

  updateRoutePrice(priceId: number, payload: Partial<RoutePricePayload>): Observable<void> {
    const body: any = {};
    if (payload.price !== undefined) {
      body.price = payload.price;
    }
    if (payload.transit_days !== undefined) {
      body.transit_days = payload.transit_days;
    }
    if (Object.keys(body).length === 0) {
      return of(void 0);
    }

    return this.http
      .put<ApiAffectResponse>(`${this.baseUrl}/route-prices/${priceId}`, body)
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to update route price.');
        }
      }));
  }

  updateBackload(priceId: number, isBackload: boolean): Observable<void> {
    return this.http
      .patch<ApiAffectResponse>(`${this.baseUrl}/route-prices/${priceId}/backload`, {
        is_backload: isBackload ? 1 : 0,
      })
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to update backload flag.');
        }
      }));
  }

  deleteRoutePrice(priceId: number): Observable<void> {
    return this.http
      .delete<ApiAffectResponse>(`${this.baseUrl}/route-prices/${priceId}`)
      .pipe(map((res) => {
        if (!res.ok) {
          throw new Error(res.error ?? 'Failed to delete route price.');
        }
      }));
  }
}
