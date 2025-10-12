import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent {
  newPassword: string = '';
  confirmPassword: string = '';
  private userId: number | null = null;
  private authToken: string | null = null;
  message: string | null = null;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.authService.getUser<{ user_id?: number }>();
    this.userId = user?.user_id ?? null;
    this.authToken = this.authService.getToken();

    if (!this.userId || !this.authToken) {
      this.error = 'You must be logged in to reset your password.';
    }
  }

  resetPassword() {
    this.error = null;
    this.message = null;

    if (!this.newPassword || !this.confirmPassword) {
      this.error = 'Please fill in all fields.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (!this.userId || !this.authToken) {
      this.error = 'You must be logged in to reset your password.';
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authToken}` });

    this.http
      .put<{ ok: boolean; affectedRows?: number; error?: string }>(
        `${environment.apiUrl}/users/${this.userId}/password`,
        { password: this.newPassword },
        { headers }
      )
      .subscribe({
        next: (response) => {
          if (response?.ok) {
            this.message = 'Password updated successfully. Redirecting to login...';
            setTimeout(() => this.router.navigate(['/login']), 2000);
          } else {
            this.error = response?.error || 'Failed to reset password. Please try again.';
          }
        },
        error: (err) => {
          const message =
            err?.error?.error ||
            err?.error?.message ||
            err?.message ||
            'Failed to reset password. Please try again.';
          this.error = message;
        }
      });
  }
}
