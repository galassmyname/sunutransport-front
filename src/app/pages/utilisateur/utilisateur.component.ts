import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

interface User {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  role: 'admin' | 'chauffeur' | 'voyageur';
  createdAt?: string;
}

@Component({
  selector: 'app-utilisateur',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './utilisateur.component.html',
  styleUrls: ['./utilisateur.component.css']
})
export class UtilisateurComponent implements OnInit {
  users: User[] = [];
  message = '';
  isSuccess = false;
  isLoading = false;
  currentUserId: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUsers();
  }

  loadCurrentUser(): void {
    // Récupérer l'ID de l'utilisateur connecté pour éviter l'auto-suppression
    this.currentUserId = this.authService.getCurrentUserId();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.clearMessage();

    this.authService.getUsers().subscribe({
      next: (data: User[]) => {
        this.users = this.sortUsers(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur chargement utilisateurs:', error);
        this.showMessage('Erreur lors du chargement des utilisateurs', false);
        this.isLoading = false;
      }
    });
  }

  refreshUsers(): void {
    this.loadUsers();
    this.showMessage('Liste actualisée', true);
  }

  private sortUsers(users: User[]): User[] {
    return users.sort((a, b) => {
      // 1. Trier par rôle (admin, chauffeur, voyageur)
      const roleOrder = { 'admin': 1, 'chauffeur': 2, 'voyageur': 3 };
      const roleComparison = roleOrder[a.role] - roleOrder[b.role];
      if (roleComparison !== 0) return roleComparison;

      // 2. Si même rôle, trier par nom de famille
      const nomComparison = a.nom.localeCompare(b.nom);
      if (nomComparison !== 0) return nomComparison;

      // 3. Si même nom, trier par prénom
      return a.prenom.localeCompare(b.prenom);
    });
  }

  deleteUser(id: string, userName: string): void {
    if (this.isCurrentUser(id)) {
      this.showMessage('Vous ne pouvez pas supprimer votre propre compte', false);
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?\n\nCette action est irréversible.`;
    
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      
      this.authService.deleteUser(id).subscribe({
        next: (response) => {
          this.users = this.users.filter(user => user._id !== id);
          this.showMessage(`Utilisateur "${userName}" supprimé avec succès`, true);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur suppression utilisateur:', error);
          
          let errorMessage = 'Erreur lors de la suppression de l\'utilisateur';
          if (error.status === 403) {
            errorMessage = 'Vous n\'avez pas les permissions nécessaires';
          } else if (error.status === 404) {
            errorMessage = 'Utilisateur non trouvé';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.showMessage(errorMessage, false);
          this.isLoading = false;
        }
      });
    }
  }

  // Méthodes utilitaires pour le template
  getTotalUsers(): number {
    return this.users.length;
  }

  getUsersByRole(role: string): User[] {
    return this.users.filter(user => user.role === role);
  }

  getInitials(prenom: string, nom: string): string {
    const prenomInitial = prenom ? prenom.charAt(0).toUpperCase() : '';
    const nomInitial = nom ? nom.charAt(0).toUpperCase() : '';
    return prenomInitial + nomInitial;
  }

  getRoleDisplayName(role: string): string {
    const roleNames = {
      'admin': 'Administrateur',
      'chauffeur': 'Chauffeur',
      'voyageur': 'Voyageur'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  }

  isCurrentUser(userId: string): boolean {
    return this.currentUserId === userId;
  }

  trackByUserId(index: number, user: User): string {
    return user._id;
  }

  private showMessage(message: string, isSuccess: boolean): void {
    this.message = message;
    this.isSuccess = isSuccess;
    
    // Auto-masquer le message après 5 secondes
    setTimeout(() => {
      this.clearMessage();
    }, 5000);

    // Scroll vers le haut pour voir le message
    this.scrollToTop();
  }

  private clearMessage(): void {
    this.message = '';
    this.isSuccess = false;
  }

  private scrollToTop(): void {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  // Méthodes pour les statistiques et filtres (extensibles)
  getUsersCreatedToday(): number {
    const today = new Date().toDateString();
    return this.users.filter(user => 
      user.createdAt && new Date(user.createdAt).toDateString() === today
    ).length;
  }

  getActiveUsersCount(): number {
    // Logique pour compter les utilisateurs actifs (si cette info est disponible)
    return this.users.length; // Placeholder
  }
}