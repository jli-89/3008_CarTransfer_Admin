// // src/app/admin/dashboard/dashboard.service.ts
// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../../environments/environment';
// import { AuthService } from '../../auth/auth.service'; // ← 用 AuthService 统一取 token

// export interface CurrentUser {
//   user_id: number;
//   user_name: string;
//   real_name?: string | null;
//   email?: string | null;
//   office_location?: string | null;
// }

// export interface UpdateCurrentUserPayload {
//   real_name?: string | null;
//   email?: string | null;
//   office_location?: string | null;
//   password?: string; // 留空或不传 = 不改密码
// }

// @Injectable({ providedIn: 'root' })
// export class DashboardService {
//   constructor(
//     private http: HttpClient,
//     private auth: AuthService               // ← 依赖注入 AuthService
//   ) {}

//   // 统一在这里取 JWT，并带到请求头里
//   private authHeaders(): { headers: HttpHeaders } {
//     const token = this.auth.getToken();     // ← 实际就是从 localStorage 里拿 'auth_token'
//     return {
//       headers: new HttpHeaders(
//         token ? { Authorization: `Bearer ${token}` } : {}
//       )
//     };
//   }

//   // ======= 原有统计接口（保持你原来的写法） =======
//   getActiveStaffCount(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/staff/count?status=active`);
//   }

//   getTotalEnquiries(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/enquiries/count`);
//   }

//   getPendingBookings(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/bookings/count?status=pending`);
//   }

//   getTotalBookings(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/bookings/count`);
//   }

//   getTotalClients(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/clients/count`);
//   }

//   // ======= 新增：我的资料（只改自己） =======
//   // 这里使用 environment.apiUrl，与你上面接口保持一致（即直连 http://localhost:4010/ljholding_backend_management/api）
//   // 如果你想走前端代理（/api → 重写到后端），把 URL 改成 '/api/users/current' 也可以。
//   getCurrentUser() {
//     return this.http.get<CurrentUser>(`${environment.apiUrl}/users/current`, this.authHeaders());
//   }

//   // 为了不改 component 端的调用签名，保留 _userId 参数但实际忽略（服务端根据 token 判定“当前用户”）
//   updateCurrentUser(_userId: number, payload: UpdateCurrentUserPayload) {
//     return this.http.put<CurrentUser>(`${environment.apiUrl}/users/current`, payload, this.authHeaders());
//   }
// }







// src/app/admin/dashboard/dashboard.service.ts
// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../../environments/environment';
// import { AuthService } from '../../auth/auth.service';

// export interface CurrentUser {
//   user_id: number;
//   user_name: string;
//   real_name?: string | null;
//   email?: string | null;
//   office_location?: string | null;
//   user_group?: string;
//   status?: 'active' | 'inactive';
// }

// export interface UpdateCurrentUserPayload {
//   real_name?: string | null;
//   email?: string | null;
//   office_location?: string | null;
//   password?: string; // 留空或不帶 = 不改密碼
// }

// @Injectable({ providedIn: 'root' })
// export class DashboardService {
//   constructor(private http: HttpClient, private auth: AuthService) {}

//   // ====== 小工具：帶 Authorization ======
//   private authHeaders() {
//     const token = this.auth.getToken(); // localStorage 的 'auth_token'
//     const headers: Record<string, string> = {};
//     if (token) headers['Authorization'] = `Bearer ${token}`;
//     return { headers: new HttpHeaders(headers) };
//   }

//   // ====== 儀表盤現有統計（維持你原有寫法） ======
//   getActiveStaffCount(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/staff/count?status=active`, this.authHeaders());
//   }

//   getTotalEnquiries(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/enquiries/count`, this.authHeaders());
//   }

//   getPendingBookings(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/bookings/count?status=pending`, this.authHeaders());
//   }

//   getTotalBookings(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/bookings/count`, this.authHeaders());
//   }

//   getTotalClients(): Observable<number> {
//     return this.http.get<number>(`${environment.apiUrl}/clients/count`, this.authHeaders());
//   }

//   // ====== 目前使用者（重點） ======
//   getCurrentUser(): Observable<{ ok: true; data: CurrentUser } | any> {
//     return this.http.get(`${environment.apiUrl}/users/current`, this.authHeaders());
//   }

//   updateCurrentUser(_userId: number, payload: UpdateCurrentUserPayload): Observable<{ ok: true; data: CurrentUser } | any> {
//     // 忽略 _userId，後端以 token 內的 uid 為準
//     return this.http.put(`${environment.apiUrl}/users/current`, payload, this.authHeaders());
//   }
// }



// src/app/admin/dashboard/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';

export interface CurrentUser {
  user_id: number;
  user_name: string;
  real_name?: string | null;
  email?: string | null;
  office_location?: string | null;
  user_group?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateCurrentUserPayload {
  real_name?: string | null;
  email?: string | null;
  office_location?: string | null;
  password?: string; // 留空或不帶 = 不改密碼
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders() {
    const token = this.auth.getToken(); // localStorage: 'auth_token'
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { headers: new HttpHeaders(headers) };
  }

  // ===== Dashboard 原有統計 API（保持不變） =====
  getActiveStaffCount(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/staff/count?status=active`, this.authHeaders());
  }
  getTotalEnquiries(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/enquiries/count`, this.authHeaders());
  }
  getPendingBookings(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/bookings/count?status=pending`, this.authHeaders());
  }
  getTotalBookings(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/bookings/count`, this.authHeaders());
  }
  getTotalClients(): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/clients/count`, this.authHeaders());
  }

  // ===== 目前使用者（重點）：直接回傳 user，而非 {ok,data} 包裹 =====
  getCurrentUser(): Observable<CurrentUser> {
    return this.http
      .get<{ ok: boolean; data: CurrentUser }>(`${environment.apiUrl}/users/current`, this.authHeaders())
      .pipe(map(res => res.data));
  }

  updateCurrentUser(_userId: number, payload: UpdateCurrentUserPayload): Observable<CurrentUser> {
    // 忽略 _userId，後端以 token 內的 uid 為準
    return this.http
      .put<{ ok: boolean; data: CurrentUser }>(`${environment.apiUrl}/users/current`, payload, this.authHeaders())
      .pipe(map(res => res.data));
  }
}
