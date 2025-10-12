import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.error = null;
    if (!this.username || !this.password) {
      this.error = 'Please enter both username and password.';
      return;
    }

    this.authService
      .login({ login: this.username, password: this.password })
      .subscribe({
        next: ({ user }) => {
          const userGroup = user?.user_group;

          if (userGroup === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else if (userGroup === 'staff') {
            this.router.navigate(['/staff/dashboard']);
          } else {
            this.error = 'Unknown user group.';
          }
        },
        error: (error) => {
          const message = error?.error?.message || 'Login failed. Please try again.';
          this.error = message;
        }
      });
  }
}
