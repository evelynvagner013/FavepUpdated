import { Component, OnInit } from '@angular/core'; // 1. Importar OnInit
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';
import { AssinaturaComponent } from '../assinatura/assinatura/assinatura.component';
import { MenuCimaComponent } from '../navbar/menu-cima/menu-cima.component';
import { AuthService } from '../../services/auth.service'; // 2. Importar AuthService

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
export class HomeComponent implements OnInit { // 3. Implementar OnInit

  parceiros = [ /* ... seus dados de parceiros ... */ ];

  // 4. Adicionar o constructor para injetar o serviço
  constructor(private authService: AuthService) {}

  // 5. Adicionar a lógica de gatilho no ngOnInit
  ngOnInit(): void {
    // Sempre que a Home carregar, se o usuário estiver logado,
    // vamos verificar se os dados dele (incluindo o plano) mudaram.
    if (this.authService.isLoggedIn()) {
      this.authService.refreshUserData().subscribe();
    }
  }
}
