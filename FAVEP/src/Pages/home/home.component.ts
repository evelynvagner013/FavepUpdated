import { Component, OnInit, HostListener } from '@angular/core'; // HostListener adicionado
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';
import { AssinaturaComponent } from '../assinatura/assinatura/assinatura.component';
import { MenuCimaComponent } from '../navbar/menu-cima/menu-cima.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MenuCimaComponent,
    FooterComponent,
    AssinaturaComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  parceiros = [ /* ... seus dados de parceiros ... */ ];
  
  // Variável para controlar a visibilidade do botão de rolagem
  showScrollButton: boolean = false; 

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Lógica para atualizar dados do usuário ao carregar a Home
    if (this.authService.isLoggedIn()) {
      this.authService.refreshUserData().subscribe();
    }
  }

  // Escuta o evento de rolagem na janela para controlar a visibilidade do botão
  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Define a visibilidade se a rolagem vertical for maior que 300px
    this.showScrollButton = window.pageYOffset > 300;
  }

  // Função para rolar a página para o topo
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Rola suavemente
    });
  }
}