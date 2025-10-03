import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  token: string | null = null;
  message: string | null = null;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    // ✅ Extract token from URL
    this.token = this.route.snapshot.queryParamMap.get('token');
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
    if (!this.token) {
      this.error = 'Invalid reset link. Token missing.';
      return;
    }

    // 🚀 Call backend to reset password
    this.http.post(`${environment.apiUrl}/auth/reset-password`, { token: this.token, newPassword: this.newPassword })
      .subscribe({
        next: () => {
          this.message = 'Your password has been successfully reset.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: () => {
          this.error = 'Failed to reset password. Please try again.';
        }
      });
  }
}
