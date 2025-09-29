import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  motDePasse = '';
  errorMessage = '';

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {
    // Vérifier si déjà connecté
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['']);
    }
  }

  login(): void {
    this.errorMessage = '';
    console.log('Tentative de connexion...'); // Debug

    this.authService.login(this.email, this.motDePasse).subscribe({
      next: (response) => {
        console.log('Réponse reçue:', response); // Debug
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          this.authService.setLoggedIn(true);
        
          this.router.navigate(['/admin/dashboard'])
            .then(() => console.log('Navigation réussie'))
            .catch(err => console.error('Erreur de navigation:', err));
        }
        
      },
      error: (error) => {
        console.error('Erreur de connexion:', error);
        this.errorMessage = error.error?.message || 'Identifiants incorrects';
        this.authService.setLoggedIn(false);
      }
    });
  }
}
