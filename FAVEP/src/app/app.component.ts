import { Component } from '@angular/core'; 
import { RouterOutlet } from '@angular/router';
import { VLibrasService } from '../services/vlibras.service';
import { VoiceAssistantComponent } from '../Pages/voice-assistant/voice-assistant.component';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, VoiceAssistantComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent { 
   showAccessibilityOptions: boolean = false;
   isHighContrast: boolean = false;
   isDarkMode: boolean = false;

    constructor(
    private vlibras: VLibrasService
  ) {}

  ngOnInit() {
    this.vlibras.initVLibras();
  }
  private readonly maxFontSize = 1.4; // 140%
  private readonly minFontSize = 0.8; // 80%
  private readonly step = 0.1; // 10%

  aumentarFonte() {
    let currentFontSize = parseFloat(document.documentElement.style.fontSize || '1');
    if (currentFontSize < this.maxFontSize) {
      document.documentElement.style.fontSize = `${currentFontSize + this.step}rem`;
    }
  }

  diminuirFonte() {
    let currentFontSize = parseFloat(document.documentElement.style.fontSize || '1');
    if (currentFontSize > this.minFontSize) {
      document.documentElement.style.fontSize = `${currentFontSize - this.step}rem`;
    }
  }




  toggleAccessibilityOptions() {
    this.showAccessibilityOptions = !this.showAccessibilityOptions;
  }
}