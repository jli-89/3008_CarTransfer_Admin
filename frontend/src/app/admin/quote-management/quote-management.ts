import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  QuoteManagementService,
  QuoteLocation,
  VehicleType,
  RoutePrice,
  LocationPayload,
  RoutePricePayload,
} from './quote-management.service';

interface RoutePriceFormState {
  pickup_id: number | null;
  delivery_id: number | null;
  vehicle_type_id: number | null;
  price: number | null;
  transit_days: number | null;
  is_backload: boolean;
}

@Component({
  selector: 'app-quote-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quote-management.html',
  styleUrls: ['./quote-management.css'],
})
export class QuoteManagementComponent implements OnInit {
  locations: QuoteLocation[] = [];
  vehicleTypes: VehicleType[] = [];
  routePrices: RoutePrice[] = [];

  loadingLocations = false;
  loadingRoutePrices = false;
  loadingVehicleTypes = false;

  message: string | null = null;
  error: string | null = null;

  locationForm: LocationPayload = this.createLocationForm();
  editingLocationId: number | null = null;

  routePriceForm: RoutePriceFormState = this.createRoutePriceForm();
  editingRoutePriceId: number | null = null;

  constructor(private readonly service: QuoteManagementService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loadVehicleTypes();
    this.loadLocations();
    this.loadRoutePrices();
  }

  private loadLocations(): void {
    this.loadingLocations = true;
    this.service.listLocations().subscribe({
      next: (data) => {
        this.locations = data;
        this.loadingLocations = false;
      },
      error: (err) => {
        this.error = err.message ?? 'Failed to load locations.';
        this.loadingLocations = false;
      },
    });
  }

  private loadVehicleTypes(): void {
    this.loadingVehicleTypes = true;
    this.service.listVehicleTypes().subscribe({
      next: (data) => {
        this.vehicleTypes = data;
        this.loadingVehicleTypes = false;
      },
      error: (err) => {
        this.error = err.message ?? 'Failed to load vehicle types.';
        this.loadingVehicleTypes = false;
      },
    });
  }

  refreshRoutePrices(): void {
    this.loadRoutePrices();
  }

  private loadRoutePrices(): void {
    this.loadingRoutePrices = true;
    this.service.listRoutePrices().subscribe({
      next: (data) => {
        this.routePrices = data;
        this.loadingRoutePrices = false;
      },
      error: (err) => {
        this.error = err.message ?? 'Failed to load route prices.';
        this.loadingRoutePrices = false;
      },
    });
  }

  resetMessages(): void {
    this.message = null;
    this.error = null;
  }

  startCreateLocation(): void {
    this.editingLocationId = null;
    this.locationForm = this.createLocationForm();
  }

  editLocation(location: QuoteLocation): void {
    this.editingLocationId = location.location_id;
    this.locationForm = {
      city_name: location.city_name,
      state_code: location.state_code,
      postcode: location.postcode,
    };
  }

  submitLocation(): void {
    this.resetMessages();
    const payload: LocationPayload = {
      city_name: this.locationForm.city_name.trim(),
      state_code: this.locationForm.state_code.trim(),
      postcode: this.locationForm.postcode.trim(),
    };
    if (!payload.city_name || !payload.state_code || !payload.postcode) {
      this.error = 'Please fill all location fields.';
      return;
    }

    if (this.editingLocationId) {
      this.service.updateLocation(this.editingLocationId, payload).subscribe({
        next: () => {
          this.message = 'Location updated.';
          this.startCreateLocation();
          this.loadLocations();
        },
        error: (err) => {
          this.error = err.message ?? 'Failed to update location.';
        },
      });
    } else {
      this.service.createLocation(payload).subscribe({
        next: () => {
          this.message = 'Location created.';
          this.startCreateLocation();
          this.loadLocations();
        },
        error: (err) => {
          this.error = err.message ?? 'Failed to create location.';
        },
      });
    }
  }

  deleteLocation(location: QuoteLocation): void {
    this.resetMessages();
    if (!confirm(`Delete location ${location.city_name}, ${location.state_code}?`)) {
      return;
    }
    this.service.deleteLocation(location.location_id).subscribe({
      next: () => {
        this.message = 'Location deleted.';
        if (this.editingLocationId === location.location_id) {
          this.startCreateLocation();
        }
        this.loadLocations();
        // Refresh routes because they may rely on locations list.
        this.loadRoutePrices();
      },
      error: (err) => {
        this.error = err.message ?? 'Failed to delete location.';
      },
    });
  }

  startCreateRoutePrice(): void {
    this.editingRoutePriceId = null;
    this.routePriceForm = this.createRoutePriceForm();
  }

  editRoutePrice(route: RoutePrice): void {
    this.editingRoutePriceId = route.price_id;
    this.routePriceForm = {
      pickup_id: route.pickup_id,
      delivery_id: route.delivery_id,
      vehicle_type_id: route.vehicle_type_id,
      price: route.price,
      transit_days: route.transit_days,
      is_backload: route.is_backload === 1,
    };
  }

  submitRoutePrice(): void {
    this.resetMessages();
    const form = this.routePriceForm;
    if (!form.pickup_id || !form.delivery_id || !form.vehicle_type_id || form.price === null) {
      this.error = 'Please fill pickup, delivery, vehicle type, and price.';
      return;
    }

    const payload: RoutePricePayload = {
      pickup_id: form.pickup_id,
      delivery_id: form.delivery_id,
      vehicle_type_id: form.vehicle_type_id,
      price: Number(form.price),
      transit_days: form.transit_days ?? null,
      is_backload: form.is_backload,
    };

    if (this.editingRoutePriceId) {
      this.service.updateRoutePrice(this.editingRoutePriceId, payload).subscribe({
        next: () => {
          this.message = 'Route price updated.';
          this.startCreateRoutePrice();
          this.loadRoutePrices();
        },
        error: (err) => {
          this.error = err.message ?? 'Failed to update route price.';
        },
      });
    } else {
      this.service.createRoutePrice(payload).subscribe({
        next: () => {
          this.message = 'Route price created.';
          this.startCreateRoutePrice();
          this.loadRoutePrices();
        },
        error: (err) => {
          this.error = err.message ?? 'Failed to create route price.';
        },
      });
    }
  }

  deleteRoutePrice(route: RoutePrice): void {
    this.resetMessages();
    if (!confirm(`Delete route price #${route.price_id}?`)) {
      return;
    }
    this.service.deleteRoutePrice(route.price_id).subscribe({
      next: () => {
        this.message = 'Route price deleted.';
        if (this.editingRoutePriceId === route.price_id) {
          this.startCreateRoutePrice();
        }
        this.loadRoutePrices();
      },
      error: (err) => {
        this.error = err.message ?? 'Failed to delete route price.';
      },
    });
  }

  toggleBackload(route: RoutePrice): void {
    this.resetMessages();
    const nextValue = route.is_backload === 1 ? false : true;
    this.service.updateBackload(route.price_id, nextValue).subscribe({
      next: () => {
        this.message = 'Backload flag updated.';
        this.loadRoutePrices();
      },
      error: (err) => {
        this.error = err.message ?? 'Failed to update backload flag.';
      },
    });
  }

  getLocationLabel(id: number | null): string {
    if (!id) {
      return '';
    }
    const match = this.locations.find((loc) => loc.location_id === id);
    return match ? `${match.city_name}, ${match.state_code}` : String(id);
  }

  private createLocationForm(): LocationPayload {
    return {
      city_name: '',
      state_code: '',
      postcode: '',
    };
  }

  private createRoutePriceForm(): RoutePriceFormState {
    return {
      pickup_id: null,
      delivery_id: null,
      vehicle_type_id: null,
      price: null,
      transit_days: null,
      is_backload: false,
    };
  }
}
