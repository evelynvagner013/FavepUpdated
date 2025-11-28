import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core'; 
import { RouterOutlet } from '@angular/router';
import { VLibrasService } from '../services/vlibras.service';
import { VoiceAssistantComponent } from '../Pages/voice-assistant/voice-assistant.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, VoiceAssistantComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit { 
   showAccessibilityOptions: boolean = false;
   fontSizePercentage: number = 100; 

   constructor(
    private vlibras: VLibrasService,
    @Inject(PLATFORM_ID) private platformId: Object // Injeção para verificar a plataforma
  ) {}

  ngOnInit() {
    this.vlibras.initVLibras();
    
    // Verificação de segurança: Só acessa o localStorage se estiver no Navegador
    if (isPlatformBrowser(this.platformId)) {
        const savedSize = localStorage.getItem('fontSize');
        if (savedSize) {
            this.fontSizePercentage = parseInt(savedSize);
            this.aplicarFonte();
        }
    }
  }

  aumentarFonte() {
    if (this.fontSizePercentage < 150) { 
      this.fontSizePercentage += 10;
      this.aplicarFonte();
    }
  }

  diminuirFonte() {
    if (this.fontSizePercentage > 70) { 
      this.fontSizePercentage -= 10;
      this.aplicarFonte();
    }
  }

  private aplicarFonte() {
    // Verifica novamente antes de aplicar para evitar erros se chamado fora do contexto
    if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.fontSize = `${this.fontSizePercentage}%`;
        localStorage.setItem('fontSize', this.fontSizePercentage.toString());
    }
  }

  toggleAccessibilityOptions() {
    this.showAccessibilityOptions = !this.showAccessibilityOptions;
  }
}