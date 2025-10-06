import { Component, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../models/api.models';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

export interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Component({
  selector: 'app-menu-central',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-central.component.html',
  styleUrl: './menu-central.component.css'
})
export class MenuCentralComponent {
  menuAberto = false;
  submenuAberto = false; 

  private userSubscription: Subscription | undefined;
  
  // Propriedades para o sistema de notificação
  notifications: Notification[] = [];
  private notificationTimeout: any;

  constructor(
        private authService: AuthService,
        private router: Router,
        private usuarioService: UsuarioService,
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef
      ) {
        Chart.register(...registerables);
      }
    
    alternarMenu() {
      this.menuAberto = !this.menuAberto;
    }
    toggleSubmenu(): void {
      this.submenuAberto = !this.submenuAberto;
    }
  
    @HostListener('document:click', ['$event'])
    fecharMenuFora(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (this.menuAberto && !target.closest('.main-menu') && !target.closest('.menu-toggle')) {
        this.menuAberto = false;
      }
      if (this.submenuAberto && !target.closest('.menu-item-dropdown')) {
        this.submenuAberto = false;
    }
    }

    usuarioNome: string = '';
    usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
    private usuarioLogado: Usuario | null = null;

    ngOnInit(): void {
      this.userSubscription = this.authService.currentUser.subscribe(user => {
        if (user) {
          this.usuarioLogado = user;
          this.usuarioNome = user.nome;
          this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
        }
      });
    }

    showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string) {
      this.ngZone.run(() => {
        const newNotification: Notification = { type, message };
        this.notifications.push(newNotification);
        this.cdr.detectChanges();

        this.notificationTimeout = setTimeout(() => {
          this.clearNotification(newNotification);
        }, 5000); // 5 segundos
      });
    }

    clearNotification(notification: Notification) {
      this.ngZone.run(() => {
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
          this.notifications.splice(index, 1);
          this.cdr.detectChanges();
        }
      });
    }
}