import { Component, HostListener } from '@angular/core';
import { Usuario } from '../../models/api.models';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-menu-central',
  standalone: true,
  imports: [],
  templateUrl: './menu-central.component.html',
  styleUrl: './menu-central.component.css'
})
export class MenuCentralComponent {
  menuAberto = false;
  mostrarDropdown = false;
  submenuAberto = false; 

  private userSubscription: Subscription | undefined;
  
  constructor(
       private authService: AuthService,
        private router: Router,
        private usuarioService: UsuarioService
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
      if (this.mostrarDropdown && !target.closest('.user-info')) {
        this.mostrarDropdown = false;
      }
      if (this.submenuAberto && !target.closest('.menu-item-dropdown')) {
        this.submenuAberto = false;
    }
    }


    usuarioNome: string = '';
      usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      private usuarioLogado: Usuario | null = null;


    navigateToProfile(event: MouseEvent) {
    event.stopPropagation(); // Impede que o clique se propague para o user-info
    this.mostrarDropdown = false;
    this.router.navigate(['/usuario']);
  }

  logout(event: MouseEvent) {
    event.stopPropagation(); // Impede que o clique se propague para o user-info
    this.mostrarDropdown = false;
    this.authService.logout();
  }

    
    
      ngOnInit(): void {
        this.userSubscription = this.authService.currentUser.subscribe(user => {
          if (user) {
            this.usuarioLogado = user;
            this.usuarioNome = user.nome;
            this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
          }
        });
      }

}
