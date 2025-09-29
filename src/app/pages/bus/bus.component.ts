import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BusService, Bus } from '../../services/bus.service';
import { AuthService } from '../../services/auth.service';

interface Chauffeur {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
}

@Component({
  selector: 'app-bus',
  templateUrl: './bus.component.html',
  styleUrls: ['./bus.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class BusComponent implements OnInit {
  buses: Bus[] = [];
  chauffeurs: Chauffeur[] = [];
  selectedBus: Bus | null = null;
  message = '';
  isSuccess = false;
  isLoading = false;
  isLoadingChauffeurs = false;

  // Nouveau champ ligne requis
  newBus = {
    nom: '',
    ligne: '',
    matricule: '',
    chauffeurId: ''
  };

  // Options de tri
  sortBy = 'ligne';
  sortOrder = 'asc';

  constructor(
    private busService: BusService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.getBuses();
    this.loadChauffeurs();
  }

  loadChauffeurs(): void {
    this.isLoadingChauffeurs = true;
    this.authService.getUsers().subscribe({
      next: (users) => {
        // Filtrer pour obtenir seulement les chauffeurs
        this.chauffeurs = users.filter(user => user.role === 'chauffeur');
        this.isLoadingChauffeurs = false;
      },
      error: (error) => {
        console.error('Erreur chargement chauffeurs:', error);
        this.showMessage('Erreur lors du chargement des chauffeurs', false);
        this.isLoadingChauffeurs = false;
      }
    });
  }

  getBuses(): void {
    this.isLoading = true;
    this.busService.getBuses(this.sortBy, this.sortOrder).subscribe({
      next: (data) => {
        this.buses = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur récupération bus:', error);
        this.showMessage('Erreur lors de la récupération des bus', false);
        this.isLoading = false;
      }
    });
  }

  addBus(): void {
    if (!this.validateBusData(this.newBus)) return;

    this.isLoading = true;
    const busToSend = {
      nom: this.newBus.nom,
      ligne: this.newBus.ligne,
      matricule: this.newBus.matricule,
      chauffeurId: this.newBus.chauffeurId || undefined
    };

    this.busService.createBus(busToSend).subscribe({
      next: (data) => {
        this.buses.push(data);
        this.buses.sort((a, b) => {
          const ligneA = parseInt(a.ligne) || 9999;
          const ligneB = parseInt(b.ligne) || 9999;
          return ligneA - ligneB;
        });
        this.showMessage('Bus ajouté avec succès !', true);
        this.resetForm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error("Erreur ajout bus:", error);
        this.showMessage(error.error?.message || 'Erreur lors de l\'ajout du bus', false);
        this.isLoading = false;
      }
    });
  }

  editBus(bus: Bus): void {
    this.selectedBus = {
      ...bus,
      chauffeurId: typeof bus.chauffeurId === 'object' ? bus.chauffeurId?._id : bus.chauffeurId
    };
  }

  updateBus(): void {
    if (!this.selectedBus || !this.validateBusData(this.selectedBus)) return;

    this.isLoading = true;
    const busToUpdate = {
      nom: this.selectedBus.nom,
      ligne: this.selectedBus.ligne,
      matricule: this.selectedBus.matricule,
      chauffeurId: this.selectedBus.chauffeurId || undefined
    };

    this.busService.updateBus(this.selectedBus._id, busToUpdate).subscribe({
      next: (data) => {
        const index = this.buses.findIndex(bus => bus._id === data._id);
        if (index !== -1) {
          this.buses[index] = data;
        }
        this.showMessage('Bus mis à jour avec succès !', true);
        this.selectedBus = null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur mise à jour bus:', error);
        this.showMessage(error.error?.message || 'Erreur lors de la mise à jour du bus', false);
        this.isLoading = false;
      }
    });
  }

  deleteBus(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bus ? Cela supprimera aussi toutes ses localisations.')) return;

    this.isLoading = true;
    this.busService.deleteBus(id).subscribe({
      next: (response) => {
        this.buses = this.buses.filter(bus => bus._id !== id);
        this.showMessage(response.message || 'Bus supprimé avec succès !', true);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur suppression bus:', error);
        this.showMessage('Erreur lors de la suppression du bus', false);
        this.isLoading = false;
      }
    });
  }

  // Nouvelles méthodes pour les fonctionnalités supplémentaires
  searchByLigne(query: string): void {
    if (!query.trim()) {
      this.getBuses();
      return;
    }

    this.isLoading = true;
    this.busService.searchBusByLigne(query).subscribe({
      next: (data) => {
        this.buses = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur recherche:', error);
        this.showMessage('Erreur lors de la recherche', false);
        this.isLoading = false;
      }
    });
  }

  loadActiveBuses(): void {
    this.isLoading = true;
    this.busService.getLignesActives().subscribe({
      next: (data) => {
        this.buses = data;
        this.isLoading = false;
        this.showMessage(`${data.length} bus actif(s) trouvé(s)`, true);
      },
      error: (error) => {
        console.error('Erreur lignes actives:', error);
        this.showMessage('Erreur lors de la récupération des bus actifs', false);
        this.isLoading = false;
      }
    });
  }

  onSortChange(): void {
    this.getBuses();
  }

  getChauffeurName(chauffeur: any): string {
    if (typeof chauffeur === 'object' && chauffeur !== null) {
      return `${chauffeur.nom} ${chauffeur.prenom}`;
    }
    return chauffeur || 'Non assigné';
  }

  // Nouvelle méthode pour obtenir le nom du chauffeur sélectionné
  getSelectedChauffeurName(chauffeurId: string): string {
    if (!chauffeurId) return 'Aucun chauffeur sélectionné';
    const chauffeur = this.chauffeurs.find(c => c._id === chauffeurId);
    return chauffeur ? `${chauffeur.nom} ${chauffeur.prenom}` : 'Chauffeur non trouvé';
  }

  getLastUpdate(bus: Bus): string {
    if (!bus.derniereMiseAJour) return 'Jamais';
    
    const lastUpdate = new Date(bus.derniereMiseAJour);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} jour(s)`;
  }

  private validateBusData(bus: any): boolean {
    if (!bus.nom || !bus.ligne || !bus.matricule) {
      this.showMessage('Les champs nom, ligne et matricule sont obligatoires', false);
      return false;
    }
    
    if (!bus.chauffeurId) {
      this.showMessage('Veuillez sélectionner un chauffeur', false);
      return false;
    }
    
    return true;
  }

  public resetForm(): void {
    this.newBus = {
      nom: '',
      ligne: '',
      matricule: '',
      chauffeurId: ''
    };
  }

  private showMessage(message: string, isSuccess: boolean): void {
    this.message = message;
    this.isSuccess = isSuccess;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  // Méthodes utilitaires pour le template
  trackByBusId(index: number, bus: Bus): string {
    return bus._id;
  }

  trackByChauffeurId(index: number, chauffeur: Chauffeur): string {
    return chauffeur._id;
  }
}