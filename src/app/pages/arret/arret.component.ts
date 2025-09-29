import { Component, OnInit } from '@angular/core';
import { ArretService, Arret, BusAssociation } from '../../services/arret.service';
import { BusService, Bus } from '../../services/bus.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-arret',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './arret.component.html',
  styleUrls: ['./arret.component.css'],
})
export class ArretComponent implements OnInit {
  arrets: Arret[] = [];
  buses: Bus[] = [];
  selectedArret: Arret | null = null;
  newArret: Partial<Arret> = { 
    nom: '', 
    latitude: 0, 
    longitude: 0, 
    busAssociations: []
  };
  message = '';
  isSuccess = false;
  isLoading = false;
  showEnrichedView = false; // Nouvelle option pour afficher la vue enrichie

  constructor(
    private arretService: ArretService,
    private busService: BusService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    // Charger les arrêts et les bus en parallèle
    Promise.all([
      this.showEnrichedView ? 
        this.arretService.getArretsWithLigneInfo().toPromise() : 
        this.arretService.getArrets().toPromise(),
      this.busService.getBuses().toPromise()
    ]).then(([arrets, buses]) => {
      this.arrets = arrets || [];
      this.buses = buses || [];
      this.isLoading = false;
    }).catch(error => {
      console.error('Erreur lors du chargement des données:', error);
      this.showMessage('Erreur lors du chargement des données', false);
      this.isLoading = false;
    });
  }

  toggleView(): void {
    this.showEnrichedView = !this.showEnrichedView;
    this.loadData();
  }

  getArrets(): void {
    this.arretService.getArrets().subscribe({
      next: (data) => {
        this.arrets = data;
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des arrêts:', error);
        this.showMessage('Erreur lors de la récupération des arrêts', false);
      }
    });
  }

  addArret(): void {
    if (!this.validateArret(this.newArret)) return;

    this.isLoading = true;
    this.arretService.createArret(this.newArret).subscribe({
      next: (data) => {
        this.arrets.push(data);
        this.showMessage('Arrêt ajouté avec succès !', true);
        this.resetForm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout:', error);
        this.showMessage(error.error?.message || 'Erreur lors de l\'ajout de l\'arrêt', false);
        this.isLoading = false;
      }
    });
  }

  editArret(arret: Arret): void {
    this.selectedArret = JSON.parse(JSON.stringify(arret)); // Deep copy
    
    // S'assurer que busAssociations existe
    if (this.selectedArret && !this.selectedArret.busAssociations) {
      this.selectedArret.busAssociations = [];
    }
  }

  updateArret(): void {
    if (!this.selectedArret || !this.validateArret(this.selectedArret)) return;

    this.isLoading = true;
    this.arretService.updateArret(this.selectedArret._id!, this.selectedArret).subscribe({
      next: (data) => {
        const index = this.arrets.findIndex(a => a._id === data._id);
        if (index !== -1) {
          this.arrets[index] = data;
        }
        this.showMessage('Arrêt mis à jour avec succès', true);
        this.selectedArret = null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour:', error);
        this.showMessage(error.error?.message || 'Erreur lors de la mise à jour de l\'arrêt', false);
        this.isLoading = false;
      }
    });
  }

  deleteArret(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet arrêt ?')) return;

    this.isLoading = true;
    this.arretService.deleteArret(id).subscribe({
      next: () => {
        this.arrets = this.arrets.filter(a => a._id !== id);
        this.showMessage('Arrêt supprimé avec succès', true);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.showMessage('Erreur lors de la suppression de l\'arrêt', false);
        this.isLoading = false;
      }
    });
  }

  addBusAssociation(isNewArret: boolean = false): void {
    const newAssociation: BusAssociation = { 
      busId: '', 
      ordre: 1, 
      direction: 'aller' 
    };
    
    if (isNewArret) {
      if (!this.newArret.busAssociations) {
        this.newArret.busAssociations = [];
      }
      this.newArret.busAssociations.push(newAssociation);
    } else if (this.selectedArret) {
      if (!this.selectedArret.busAssociations) {
        this.selectedArret.busAssociations = [];
      }
      this.selectedArret.busAssociations.push(newAssociation);
    }
  }

  removeBusAssociation(index: number, isNewArret: boolean = false): void {
    if (isNewArret) {
      this.newArret.busAssociations?.splice(index, 1);
    } else if (this.selectedArret) {
      this.selectedArret.busAssociations?.splice(index, 1);
    }
  }

  getBusName(bus: any): string {
    // Si c'est déjà un objet Bus (peuplé)
    if (typeof bus === 'object' && bus !== null) {
      return `Ligne ${bus.ligne} - ${bus.nom} (${bus.matricule})`;
    }
    
    // Si c'est juste un ID string
    const busObj = this.buses.find(b => b._id === bus);
    return busObj ? `Ligne ${busObj.ligne} - ${busObj.nom} (${busObj.matricule})` : 'Bus inconnu';
  }

  // Nouvelle méthode pour obtenir les informations de ligne enrichies
  getLignesInfo(arret: Arret): string[] {
    if (!this.showEnrichedView || !arret.lignes) {
      return [];
    }
    
    return arret.lignes.map(ligne => 
      `Ligne ${ligne.ligne} (${ligne.direction}) - Ordre ${ligne.ordre}`
    );
  }

  // Nouvelle méthode pour charger les arrêts d'une ligne spécifique
  loadArretsByLigne(ligne: string, direction: 'aller' | 'retour' = 'aller'): void {
    this.isLoading = true;
    this.arretService.getArretsByLigne(ligne, direction).subscribe({
      next: (response) => {
        this.arrets = response.arrets;
        this.showMessage(`${response.arrets.length} arrêts trouvés pour la ligne ${ligne} (${direction})`, true);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des arrêts par ligne:', error);
        this.showMessage(error.error?.message || 'Erreur lors du chargement des arrêts', false);
        this.isLoading = false;
      }
    });
  }

  // Nouvelle méthode pour charger les arrêts d'un bus spécifique
  loadArretsByBus(busId: string, direction: 'aller' | 'retour' = 'aller'): void {
    this.isLoading = true;
    this.arretService.getArretsByBus(busId, direction).subscribe({
      next: (arrets) => {
        this.arrets = arrets;
        const bus = this.buses.find(b => b._id === busId);
        const busName = bus ? `${bus.nom} (Ligne ${bus.ligne})` : 'ce bus';
        this.showMessage(`${arrets.length} arrêts trouvés pour ${busName} (${direction})`, true);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des arrêts par bus:', error);
        this.showMessage(error.error?.message || 'Erreur lors du chargement des arrêts', false);
        this.isLoading = false;
      }
    });
  }

  private validateArret(arret: Partial<Arret>): boolean {
    if (!arret.nom || !arret.latitude || !arret.longitude) {
      this.showMessage('Veuillez remplir tous les champs obligatoires (nom, latitude, longitude)', false);
      return false;
    }

    // Validation des associations de bus
    if (arret.busAssociations && arret.busAssociations.length > 0) {
      for (let i = 0; i < arret.busAssociations.length; i++) {
        const assoc = arret.busAssociations[i];
        if (!assoc.busId || !assoc.ordre || assoc.ordre < 1) {
          this.showMessage(`Association de bus ${i + 1} : Veuillez sélectionner un bus et définir un ordre valide`, false);
          return false;
        }
      }

      // Vérifier qu'il n'y a pas d'ordre en double pour le même bus et direction
      const orderMap = new Map<string, number[]>();
      for (const assoc of arret.busAssociations) {
        const key = `${assoc.busId}-${assoc.direction}`;
        if (!orderMap.has(key)) {
          orderMap.set(key, []);
        }
        const orders = orderMap.get(key)!;
        if (orders.includes(assoc.ordre)) {
          this.showMessage('Ordre en double détecté pour le même bus et direction', false);
          return false;
        }
        orders.push(assoc.ordre);
      }
    }

    return true;
  }

  private resetForm(): void {
    this.newArret = { 
      nom: '', 
      latitude: 0, 
      longitude: 0, 
      busAssociations: []
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
  trackByArretId(index: number, arret: Arret): string {
    return arret._id || index.toString();
  }

  trackByBusId(index: number, bus: Bus): string {
    return bus._id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Méthode pour obtenir les lignes disponibles
  getAvailableLignes(): string[] {
    return [...new Set(this.buses.map(bus => bus.ligne))].sort();
  }
}