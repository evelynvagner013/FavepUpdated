import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';
import { AssinaturaComponent } from '../assinatura/assinatura/assinatura.component';
import { MenuCimaComponent } from '../navbar/menu-cima/menu-cima.component';

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
export class HomeComponent {
  // NENHUMA LÓGICA DE TEMA AQUI.
  // Apenas a lógica original da sua página, como o array de parceiros, se houver.
  
  // Exemplo de propriedade que deve continuar aqui:
  parceiros = [ /* ... seus dados de parceiros ... */ ];
}