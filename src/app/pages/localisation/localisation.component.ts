import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { LocalisationService } from '../../services/localisation.service';
import { ArretService } from '../../services/arret.service';
import { BusService } from '../../services/bus.service';
import { SearchService, SearchResult as ServiceSearchResult } from '../../services/search.service';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare module 'leaflet' {
  namespace Routing {
    function control(options?: any): any;
    interface PlanOptions {
      draggableWaypoints?: boolean;
      addWaypoints?: boolean;
      routeWhileDragging?: boolean;
    }
  }
}

interface LocalSearchResult {
  type: 'bus' | 'arret';
  id: string;
  name: string;
  details: string;
  data: any;
}

@Component({
  selector: 'app-localisation',
  templateUrl: './localisation.component.html',
  styleUrls: ['./localisation.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LocalisationComponent implements OnInit, OnDestroy, AfterViewInit {
  private map!: L.Map;
  private routingControl: any = null;
  private markers: { [key: string]: L.Marker } = {};
  private busRoutes: { [key: string]: L.Polyline } = {};
  private busTrajectories: { [key: string]: L.LatLng[] } = {};
  private arretMarkers: L.Marker[] = [];
  private searchMarkers: L.Marker[] = [];
  private wsSubscription: Subscription | null = null;
  private notificationSubscription: Subscription | null = null;
  private etaInterval: any;
  private routingControlAdded: boolean = false;
  
  public positions: any[] = [];
  public selectedBusId: string | null = null;
  public selectedBusInfo: any = null;
  public tempsArriveeData: any = null;
  public arrets: any[] = [];
  public notifications: string[] = [];
  public showRoute: boolean = false;
  public routeLoading: boolean = false;

  // Nouvelles propriétés pour la recherche
  public searchQuery: string = '';
  public searchResults: LocalSearchResult[] = [];
  public showSearchResults: boolean = false;
  public isSearching: boolean = false;
  public searchType: 'all' | 'bus' | 'arret' = 'all';

  private defaultIcon = L.icon({
    iconUrl: 'assets/bus.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  private selectedIcon = L.icon({
    iconUrl: 'assets/bus.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  private inactiveIcon = L.icon({
    iconUrl: 'assets/bus-inactive.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  private arretIcon = L.icon({
    iconUrl: 'assets/stop.png',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25],
    className: 'stop-marker'
  });

  private highlightedArretIcon = L.icon({
    iconUrl: 'assets/stop-highlighted.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35],
    className: 'stop-marker highlighted'
  });

  constructor(
    private localisationService: LocalisationService,
    private arretService: ArretService,
    private busService: BusService,
    private searchService: SearchService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupWebSocket();
    this.setupNotificationListener();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadAndDisplayArrets();
    this.loadRecentPositions();
  }

  ngOnDestroy(): void {
    if (this.etaInterval) {
      clearInterval(this.etaInterval);
    }
    this.wsSubscription?.unsubscribe();
    this.notificationSubscription?.unsubscribe();
    this.map?.remove();
    if (this.routingControl && this.routingControlAdded) {
      this.map.removeControl(this.routingControl);
    }
  }

  // NOUVELLES MÉTHODES DE RECHERCHE

  public onSearchInputChange(): void {
    if (this.searchQuery.trim().length < 2) {
      this.searchResults = [];
      this.showSearchResults = false;
      this.clearSearchHighlights();
      return;
    }

    this.performSearch();
  }

  private async performSearch(): Promise<void> {
    if (this.searchQuery.trim().length < 2) return;

    this.isSearching = true;
    this.searchResults = [];

    try {
      const response = await this.searchService.contextualSearch(
        this.searchQuery, 
        this.searchType
      );
      
      if (response.success) {
        this.searchResults = response.results.map((result: ServiceSearchResult) => ({
          type: result.type,
          id: result.id,
          name: result.name,
          details: result.details,
          data: result.data
        } as LocalSearchResult));
      }

      this.showSearchResults = this.searchResults.length > 0;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      this.searchResults = [];
      this.showSearchResults = false;
    } finally {
      this.isSearching = false;
    }
  }

  public selectSearchResult(result: LocalSearchResult): void {
    this.clearSearchHighlights();
    
    if (result.type === 'bus') {
      this.focusOnBus(result.data);
    } else if (result.type === 'arret') {
      this.focusOnArret(result.data);
    }

    this.searchQuery = result.name;
    this.showSearchResults = false;
  }

  public focusOnArret(arret: any): void {
    if (!this.map) return;

    // Centrer la carte sur l'arrêt
    this.map.setView([arret.latitude, arret.longitude], 16);

    // Créer ou mettre à jour le marqueur highlighted
    this.clearSearchHighlights();
    
    const highlightedMarker = L.marker([arret.latitude, arret.longitude], {
      icon: this.highlightedArretIcon,
      zIndexOffset: 2000
    }).addTo(this.map);

    const popupContent = `
      <div class="arret-popup">
        <h4>${arret.nom}</h4>
        <div class="lignes-info">
          ${arret.lignes?.map((l: any) => 
            `<span class="ligne-badge">Ligne ${l.ligne}</span>`
          ).join('') || 'Aucune ligne configurée'}
        </div>
      </div>
    `;

    highlightedMarker.bindPopup(popupContent).openPopup();
    this.searchMarkers.push(highlightedMarker);

    // Retirer le highlight après 10 secondes
    setTimeout(() => {
      this.clearSearchHighlights();
    }, 10000);
  }

  private clearSearchHighlights(): void {
    this.searchMarkers.forEach(marker => {
      if (this.map.hasLayer(marker)) {
        this.map.removeLayer(marker);
      }
    });
    this.searchMarkers = [];
  }

  public clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.clearSearchHighlights();
    this.clearBusSelection();
  }

  public setSearchType(type: 'all' | 'bus' | 'arret'): void {
    this.searchType = type;
    if (this.searchQuery.trim().length >= 2) {
      this.performSearch();
    }
  }

  // Méthode pour rechercher rapidement un bus par ligne
  public searchByLigne(ligne: string): void {
    this.searchQuery = ligne;
    this.searchType = 'bus';
    this.performSearch();
  }

  // MÉTHODES EXISTANTES (inchangées)
  
  private configureLeafletIcons() {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/stop.png',
      iconUrl: 'assets/stop.png',
      shadowUrl: 'assets/stop.png'
    });
  }

  private initMap(): void {
    this.configureLeafletIcons();
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error("L'élément map n'existe pas dans le DOM");
      return;
    }

    this.map = L.map('map').setView([14.6928, -17.4467], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.leaflet-marker-icon.bus-marker')) {
        this.clearBusSelection();
      }
    });

    this.initRoutingControl();
  }

  private initRoutingControl(): void {
    const waypoints: L.Routing.Waypoint[] = [];

    this.routingControl = L.Routing.control({
      waypoints: waypoints,
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#3498db', opacity: 0.7, weight: 5 }]
      },
      createMarker: () => null,
      router: L.Routing.osrmv1({
        serviceUrl: 'http://localhost:5001/route/v1',
        profile: 'driving',
        timeout: 30000
      }),
      plan: L.Routing.plan(waypoints, {
        draggableWaypoints: false,
        addWaypoints: false,
        routeWhileDragging: false
      })
    });

    this.routingControl.on('routesfound', (e: any) => {
      this.routeLoading = false;
      const routes = e.routes;
      if (routes && routes.length > 0) {
        const route = routes[0];
        this.map.fitBounds(route.coordinates);
        this.displayArretsOnMap(this.arrets);
      }
    });

    this.routingControl.on('routingerror', (e: any) => {
      this.routeLoading = false;
      console.error('Erreur de routage:', e.error);
    });
  }

  private hideRoutingInstructions(): void {
    setTimeout(() => {
      const container = document.querySelector('.leaflet-routing-container');
      if (container) {
        (container as HTMLElement).style.display = 'none';
      }
    }, 100);
  }

  public toggleRouteVisibility(): void {
    this.showRoute = !this.showRoute;
    
    if (this.showRoute) {
      if (!this.routingControlAdded) {
        this.routingControl.addTo(this.map);
        this.routingControlAdded = true;
      }
      this.updateRoute(this.arrets);
      
      setTimeout(() => this.displayArretsOnMap(this.arrets), 50);
    } else {
      if (this.routingControlAdded) {
        this.map.removeControl(this.routingControl);
        this.routingControlAdded = false;
      }
    }
    
    this.map.invalidateSize();
  }

  private updateRoute(arrets: any[]): void {
    if (!this.routingControl || arrets.length < 2) return;

    this.routeLoading = true;
    const waypoints = arrets
      .sort((a, b) => a.ordre - b.ordre)
      .map(arret => L.latLng(arret.latitude, arret.longitude));

    this.routingControl.setWaypoints(waypoints);
    this.hideRoutingInstructions();
  }

  private clearBusSelection(): void {
    if (this.selectedBusId && this.markers[this.selectedBusId]) {
      const isActive = this.positions.find(p => 
        p.bus?._id === this.selectedBusId
      )?.bus?.actif;
      
      this.markers[this.selectedBusId].setIcon(isActive ? this.defaultIcon : this.inactiveIcon);
    }
    
    if (this.etaInterval) {
      clearInterval(this.etaInterval);
      this.etaInterval = null;
    }
    
    this.selectedBusId = null;
    this.selectedBusInfo = null;
    this.tempsArriveeData = null;
    this.changeDetector.detectChanges();
  }

  private loadAndDisplayArrets(): void {
    this.arretService.getArretsWithLigneInfo().subscribe({
      next: (arrets) => {
        this.arrets = arrets;
        this.displayArretsOnMap(arrets);
      },
      error: (err) => console.error('Erreur lors du chargement des arrêts:', err)
    });
  }

  private displayArretsOnMap(arrets: any[]): void {
    if (!this.map) return;
    
    this.arretMarkers.forEach(marker => this.map.removeLayer(marker));
    this.arretMarkers = [];

    arrets.forEach(arret => {
      const marker = L.marker([arret.latitude, arret.longitude], {
        icon: this.arretIcon,
        zIndexOffset: 1000
      }).addTo(this.map);

      const ordre = arret.busAssociations?.[0]?.ordre || 0;
      const lignesInfo = arret.lignes?.map((l: any) => `Ligne ${l.ligne}`).join(', ') || 'Aucune ligne';
      
      marker.bindPopup(`
        <div class="arret-popup">
          <strong>${arret.nom}</strong><br>
          Ordre: ${ordre}<br>
          <div class="lignes-info">${lignesInfo}</div>
        </div>
      `);

      this.arretMarkers.push(marker);
    });
  }

  private setupWebSocket(): void {
    this.wsSubscription = this.localisationService.getPositionUpdates().subscribe({
      next: (message) => {
        if (message.type === 'POSITION_UPDATE' && message.data) {
          if (message.data.bus?.actif) {
            this.updateBusPosition(message.data);
          }
        } else if (message.type === 'BUS_ACTIVE' || message.type === 'BUS_INACTIVE') {
          const busId = message.data.busId;
          const isActive = message.type === 'BUS_ACTIVE';
          
          const busIndex = this.positions.findIndex(p => p.bus?._id === busId);
          if (busIndex !== -1) {
            this.positions[busIndex].bus.actif = isActive;
          }
          
          if (!isActive) {
            if (this.markers[busId]) {
              this.map.removeLayer(this.markers[busId]);
              delete this.markers[busId];
            }
            if (this.busRoutes[busId]) {
              this.map.removeLayer(this.busRoutes[busId]);
              delete this.busRoutes[busId];
            }
          }
        }
      },
      error: (err) => console.error('WebSocket error:', err)
    });
  }

  private loadRecentPositions(): void {
    this.localisationService.getRecentPositions(false).subscribe({
      next: (data) => {
        this.positions = data;
        this.updateMapWithPositions();
      },
      error: (err) => console.error('Error loading positions:', err)
    });
  }

  private updateMapWithPositions(): void {
    if (!this.map || !this.positions.length) return;

    this.positions.forEach(pos => {
      this.addOrUpdateMarker(pos, false);
    });
  }

  private addOrUpdateMarker(position: any, isRealTime: boolean): void {
    if (!this.map) return;

    const busId = position.bus?._id;
    if (!busId) return;

    const lat = parseFloat(position.latitude);
    const lng = parseFloat(position.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const isActive = position.bus?.actif;
    const isSelected = this.selectedBusId === busId;
    const busName = position.bus?.nom || `Bus ${busId}`;
    
    const popupContent = `
      <strong>${busName}</strong><br>
      Ligne: ${position.bus?.ligne || 'N/A'}<br>
      Statut: ${isActive ? 'Actif' : 'Inactif'}<br>
      Vitesse: ${position.vitesse || 'N/A'} km/h
    `;

    const newLatLng = L.latLng(lat, lng);

    if (!isActive) {
      if (this.markers[busId]) {
        this.map.removeLayer(this.markers[busId]);
        delete this.markers[busId];
      }
      if (this.busRoutes[busId]) {
        this.map.removeLayer(this.busRoutes[busId]);
        delete this.busRoutes[busId];
      }
      return;
    }

    if (!this.busTrajectories[busId]) {
      this.busTrajectories[busId] = [];
    }

    this.busTrajectories[busId].push(newLatLng);

    if (this.busTrajectories[busId].length > 50) {
      this.busTrajectories[busId].shift();
    }

    if (this.markers[busId]) {
      this.markers[busId]
        .setLatLng(newLatLng)
        .setIcon(isSelected ? this.selectedIcon : this.defaultIcon)
        .setPopupContent(popupContent);
    } else {
      this.markers[busId] = L.marker(newLatLng, { 
        icon: isSelected ? this.selectedIcon : this.defaultIcon
      })
      .addTo(this.map)
      .bindPopup(popupContent)
      .on('click', () => this.focusOnBus(position));
    }

    this.updateBusTrajectory(busId);

    if (isRealTime) {
      const existingIndex = this.positions.findIndex(p => p.bus?._id === busId);
      if (existingIndex >= 0) {
        this.positions[existingIndex] = position;
      } else {
        this.positions.push(position);
      }
    }
  }

  private updateBusTrajectory(busId: string): void {
    if (!this.map || !this.busTrajectories[busId] || this.busTrajectories[busId].length < 2) {
      return;
    }

    const isSelected = this.selectedBusId === busId;
    const color = isSelected ? '#e74c3c' : '#3498db';
    const weight = isSelected ? 6 : 4;

    if (this.busRoutes[busId]) {
      this.busRoutes[busId]
        .setLatLngs(this.busTrajectories[busId])
        .setStyle({ color, weight });
    } else {
      this.busRoutes[busId] = L.polyline(this.busTrajectories[busId], {
        color,
        weight,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(this.map);
    }

    if (isSelected) {
      this.busRoutes[busId].bringToFront();
    }
  }

  public focusOnBus(bus: any): void {
    const busId = bus.bus?._id;
    if (!busId) return;

    if (this.etaInterval) {
      clearInterval(this.etaInterval);
      this.etaInterval = null;
    }

    this.selectedBusId = busId;
    this.selectedBusInfo = bus;
    
    if (this.markers[busId]) {
      this.map.setView(this.markers[busId].getLatLng(), 15);
      const isActive = bus.bus?.actif;
      this.markers[busId].setIcon(isActive ? this.selectedIcon : this.inactiveIcon).openPopup();
    }

    Object.keys(this.markers).forEach(id => {
      if (id !== busId) {
        const isActive = this.positions.find(p => p.bus?._id === id)?.bus?.actif;
        this.markers[id].setIcon(isActive ? this.defaultIcon : this.inactiveIcon);
      }
    });

    Object.keys(this.busRoutes).forEach(id => {
      this.updateBusTrajectory(id);
    });
    
    this.getTempsArrivee(busId);
  }

  private getTempsArrivee(busId: string): void {
    if (this.etaInterval) {
      clearInterval(this.etaInterval);
    }

    this.fetchETA(busId);

    this.etaInterval = setInterval(() => {
      this.fetchETA(busId);
    }, 3000);
  }

  private fetchETA(busId: string): void {
    this.localisationService.getTempsArrivee(busId).subscribe({
      next: (data) => {
        if (data) {
          if (data.arret && data.arret !== 'N/A' && !data.message) {
            this.tempsArriveeData = {
              arret: data.arret,
              distance: data.distance || 0,
              tempsArrivee: data.tempsArrivee || 0,
              vitesse: data.vitesse || 30,
              busActif: data.busActif
            };
          }
          else if (data.message) {
            this.tempsArriveeData = {
              arret: data.arret || 'N/A',
              distance: data.distance || 0,
              tempsArrivee: data.tempsArrivee || 0,
              vitesse: data.vitesse || 30,
              busActif: data.busActif,
              message: data.message
            };
          }
          else {
            this.tempsArriveeData = {
              arret: 'N/A',
              distance: 0,
              tempsArrivee: 0,
              vitesse: 30,
              busActif: data.busActif || false,
              message: 'Données en cours de chargement...'
            };
          }
          
          this.changeDetector.detectChanges();
        } else {
          this.tempsArriveeData = {
            arret: 'N/A',
            distance: 0,
            tempsArrivee: 0,
            vitesse: 30,
            busActif: false,
            message: 'Aucune donnée disponible'
          };
          this.changeDetector.detectChanges();
        }
      },
      error: (err) => {
        this.tempsArriveeData = {
          arret: 'N/A',
          distance: 0,
          tempsArrivee: 0,
          vitesse: 30,
          busActif: false,
          message: `Erreur de connexion: ${err.status || 'Inconnue'}`
        };
        this.changeDetector.detectChanges();
      }
    });
  }

  private setupNotificationListener(): void {
    this.notificationSubscription = this.localisationService.getNotificationUpdates().subscribe({
      next: (notification) => {
        if (notification.type === 'ARRIVAL_NOTIFICATION') {
          const distance = Math.round(notification.data.distance);
          const message = `🚌 ${notification.data.bus} (Ligne ${notification.data.ligne}) arrive à ${notification.data.arret} (${distance}m)`;
          this.showNotification(message);
        } else if (notification.type === 'BUS_STATUS') {
          const message = `ℹ️ ${notification.data.message}`;
          this.showNotification(message);
        }
      },
      error: (err) => console.error('Notification error:', err)
    });
  }

  private showNotification(message: string): void {
    this.notifications = this.notifications.filter(notif => notif !== message);
    this.notifications.unshift(message);

    if (this.notifications.length > 5) {
      this.notifications.pop();
    }

    setTimeout(() => {
      const index = this.notifications.indexOf(message);
      if (index > -1) {
        this.notifications.splice(index, 1);
        this.changeDetector.detectChanges();
      }
    }, 2000);
  }

  public removeNotification(index: number): void {
    this.notifications.splice(index, 1);
    this.changeDetector.detectChanges();
  }

  private updateBusPosition(position: any): void {
    if (!position.bus?.actif) {
      const busId = position.bus?._id;
      if (this.markers[busId]) {
        this.map.removeLayer(this.markers[busId]);
        delete this.markers[busId];
      }
      if (this.busRoutes[busId]) {
        this.map.removeLayer(this.busRoutes[busId]);
        delete this.busRoutes[busId];
      }
      return;
    }
    
    this.addOrUpdateMarker(position, true);
    
    const busId = position.bus?._id;
    if (this.selectedBusId === busId) {
      this.selectedBusInfo = position;
      this.map.setView([position.latitude, position.longitude], 15);
      this.getTempsArrivee(busId);
    }
  }

  public getActiveBuses(): any[] {
    return this.positions.filter(pos => pos.bus?.actif);
  }

  public getCurrentTime(): string {
    return new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }
}