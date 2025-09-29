import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocalisationComponent } from '../localisation/localisation.component';
import { AuthService } from '../../services/auth.service'; // Importez le AuthService

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink, LocalisationComponent]
})
export class DashboardComponent implements OnInit {
  stats = {
    buses: 0,
    chauffeurs: 0,
    voyageur: 0,
    arrets: 0,
  };

  quickActions = [
    { 
      label: 'Ajouter un Utilisateur', 
      icon: '➕', 
      route: '/admin/add-user',
      class: 'btn-primary'
    },
    { 
      label: 'Gérer les Bus', 
      icon: '🚌', 
      route: '/admin/bus',
      class: 'btn-success'
    },
    { 
      label: 'Gérer les Arrêts', 
      icon: '📍', 
      route: '/admin/arret',
      class: 'btn-warning'
    },
    { 
      label: 'Gérer les Utilisateurs', 
      icon: '👥', 
      route: '/admin/utilisateurs',
      class: 'btn-danger'
    }
  ];

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private authService: AuthService // Injectez le AuthService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des statistiques :', err);
      }
    });
  }

  logout(): void {
    this.authService.logout(); // Appelez la méthode logout du AuthService
    this.router.navigate(['/login']); // Redirigez vers la page de connexion
  }
}