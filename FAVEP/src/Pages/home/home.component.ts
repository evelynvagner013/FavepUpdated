import { Component, OnInit, HostListener } from '@angular/core';
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

  // NOVO: Estrutura para gerenciar os carrosséis de imagens
  carouselData = {
    estatisticas: {
      images: [
        'assets/img/telaesta.jpg', 
        'assets/img/telaesta2.jpeg'
      ],
      currentIndex: 0
    },
    gerenciamento: {
      images: [
        'assets/img/telager.jpg', 
        'assets/img/telager2.jpeg', 
        'assets/img/telager3.jpeg'
      ],
      currentIndex: 0
    },
    relatorios: {
      images: [
        'assets/img/telarela.jpeg', 
        'assets/img/telarela2.jpeg'
      ],
      currentIndex: 0
    },
    colaboradores: {
      images: [
        'assets/img/telacola.jpeg', 
        'assets/img/telacola2.jpeg'
      ],
      currentIndex: 0
    }
  };

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Lógica para atualizar dados do usuário ao carregar a Home
    if (this.authService.isLoggedIn()) {
      this.authService.refreshUserData().subscribe();
    }
  }

  // NOVO: Função para obter a URL da imagem atual de um carrossel
  getCurrentImageSrc(section: keyof typeof this.carouselData): string {
    const data = this.carouselData[section];
    return data.images[data.currentIndex];
  }

  // NOVO: Função para mudar o slide do carrossel
  changeSlide(section: keyof typeof this.carouselData, direction: number) {
    const data = this.carouselData[section];
    const totalImages = data.images.length;

    let newIndex = data.currentIndex + direction;

    // Lógica de loop (volta para o início/fim)
    if (newIndex >= totalImages) {
      newIndex = 0; 
    } else if (newIndex < 0) {
      newIndex = totalImages - 1; 
    }

    data.currentIndex = newIndex;
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