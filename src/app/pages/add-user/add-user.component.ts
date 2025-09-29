import { Component } from '@angular/core';
import { AddUserService } from '../../services/add-user.service';
import { FormsModule } from '@angular/forms';
import { CommonModule, TitleCasePipe } from '@angular/common';

interface UserFormData {
  nom: string;
  prenom: string;
  email: string;
  credential: string;
  role: 'voyageur' | 'chauffeur' | 'admin';
}

interface UserSubmitData {
  nom: string;
  prenom: string;
  email: string;
  role: 'voyageur' | 'chauffeur' | 'admin';
  pinCode?: string;
  motDePasse?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.css'],
})
export class AddUserComponent {
  user: UserFormData = { 
    nom: '', 
    prenom: '',
    email: '', 
    credential: '', 
    role: 'voyageur'
  };
  
  roles = ['voyageur', 'chauffeur', 'admin'] as const;
  successMessage = '';
  errorMessage = '';
  isLoading = false;
  showPinField = true;

  constructor(private addUserService: AddUserService) {}

  onRoleChange(): void {
    this.showPinField = this.user.role === 'voyageur';
    this.user.credential = '';
    this.clearMessages();
  }

  addUser(): void {
    this.clearMessages();
    
    if (!this.isFormValid()) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement';
      this.scrollToMessage();
      return;
    }

    const userData: UserSubmitData = {
      nom: this.user.nom.trim(),
      prenom: this.user.prenom.trim(),
      email: this.user.email.trim().toLowerCase(),
      role: this.user.role
    };

    if (this.user.role === 'voyageur') {
      userData.pinCode = this.user.credential;
    } else {
      userData.motDePasse = this.user.credential;
    }

    this.isLoading = true;

    this.addUserService.addUser(userData).subscribe({
      next: (response) => {
        this.successMessage = `${userData.role === 'voyageur' ? 'Voyageur' : userData.role === 'chauffeur' ? 'Chauffeur' : 'Administrateur'} "${userData.prenom} ${userData.nom}" créé avec succès !`;
        this.resetForm();
        this.scrollToMessage();
      },
      error: (error) => {
        console.error('Erreur création utilisateur:', error);
        
        // Gestion des erreurs spécifiques
        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Données invalides. Veuillez vérifier vos informations.';
        } else if (error.status === 403) {
          this.errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
        } else if (error.status === 409) {
          this.errorMessage = 'Cet email est déjà utilisé par un autre utilisateur.';
        } else {
          this.errorMessage = error.error?.message || 'Erreur lors de la création de l\'utilisateur. Veuillez réessayer.';
        }
        this.scrollToMessage();
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private isFormValid(): boolean {
    // Validation des champs de base
    const baseValid = !!this.user.nom?.trim() && 
                     !!this.user.prenom?.trim() &&
                     !!this.user.email?.trim() && 
                     !!this.user.role &&
                     !!this.user.credential;

    if (!baseValid) return false;

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.user.email.trim())) {
      return false;
    }

    // Validation du credential selon le rôle
    if (this.user.role === 'voyageur') {
      return /^\d{4}$/.test(this.user.credential);
    } else {
      return this.user.credential.length >= 6;
    }
  }

  public resetForm(): void {
    this.user = { 
      nom: '', 
      prenom: '',
      email: '', 
      credential: '', 
      role: 'voyageur' 
    };
    this.showPinField = true;
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private scrollToMessage(): void {
    // Scroll vers le message après un petit délai pour laisser le temps au DOM de se mettre à jour
    setTimeout(() => {
      const messageElement = document.querySelector('.message');
      if (messageElement) {
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }, 100);
  }

  // Méthodes utilitaires pour le template
  getCredentialLabel(): string {
    return this.showPinField ? 'Code PIN (4 chiffres)' : 'Mot de passe (6+ caractères)';
  }

  getCredentialPlaceholder(): string {
    return this.showPinField ? '••••' : '••••••••';
  }

  getRoleDisplayName(role: string): string {
    const roleNames = {
      'voyageur': 'Voyageur',
      'chauffeur': 'Chauffeur',
      'admin': 'Administrateur'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  }
}