import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getActiveStaffCount(): Observable<number> {
    return this.http.get<number>('/api/staff/count?status=active');
  }

  getTotalEnquiries(): Observable<number> {
    return this.http.get<number>('/api/enquiries/count');
  }

  getPendingBookings(): Observable<number> {
    return this.http.get<number>('/api/bookings/count?status=pending');
  }

  getTotalBookings(): Observable<number> {
    return this.http.get<number>('/api/bookings/count');
  }

  getTotalClients(): Observable<number> {
    return this.http.get<number>('/api/clients/count');
  }
}
