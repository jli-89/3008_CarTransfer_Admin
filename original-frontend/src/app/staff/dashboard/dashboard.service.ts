import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getActiveStaffCount(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/staff/count?status=active`);
  }

  getTotalEnquiries(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/enquiries/count`);
  }

  getPendingBookings(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/bookings/count?status=pending`);
  }

  getTotalBookings(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/bookings/count`);
  }

  getTotalClients(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/clients/count`);
  }
}
