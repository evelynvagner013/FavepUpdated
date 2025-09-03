import { Component, Inject, NgZone, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';

// Suas declarações para compatibilidade
declare var webkitSpeechRecognition: any;
declare var SpeechRecognition: any;

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-assistant.component.html',
  styleUrls: ['./voice-assistant.component.css']
})
export class VoiceAssistantComponent implements OnInit {
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' = 'idle';
  statusMessage: string = '';
  recognition: any;
  isSupported: boolean = false;
  private ptBrVoice: SpeechSynthesisVoice | null = null;
  private isBrowser: boolean; // Variável para saber se estamos no navegador

  // Injetamos o PLATFORM_ID para identificar o ambiente (servidor ou navegador)
  constructor(
    private agentService: AgentService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    // Definimos a variável isBrowser como true apenas se o código estiver rodando no navegador
    this.isBrowser = isPlatformBrowser(platformId);

    // Movido do ngOnInit para o constructor, mas dentro da verificação
    if (this.isBrowser) {
      this.loadVoices();
    }
  }

  ngOnInit(): void {
    // Toda a lógica que depende do 'window' agora é protegida por esta verificação
    if (this.isBrowser) {
      if (!window.isSecureContext) {
        console.error("ERRO: O reconhecimento de voz requer HTTPS ou localhost.");
        this.statusMessage = "Voz não disponível (somente HTTPS ou localhost).";
        this.status = 'error';
        return;
      }

      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        this.isSupported = true;
        this.recognition = new SpeechRecognitionAPI();
        this.initializeSpeechRecognition();
      } else {
        this.isSupported = false;
        this.statusMessage = "Voz não suportada neste navegador.";
        this.status = 'error';
        console.error("ERRO: SpeechRecognition API não é suportada.");
      }
    }
  }

  private loadVoices(): void {
    // Adicionamos uma verificação aqui também por segurança
    if (!this.isBrowser) return;

    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.ptBrVoice = voices.find(voice => voice.lang === 'pt-BR' && voice.name.includes('Google')) || null;
        if (!this.ptBrVoice) {
          this.ptBrVoice = voices.find(voice => voice.lang === 'pt-BR' && !voice.localService) || null;
        }
        if (!this.ptBrVoice) {
          this.ptBrVoice = voices.find(voice => voice.lang === 'pt-BR') || null;
        }
        if (this.ptBrVoice) {
          console.log("Voz selecionada:", this.ptBrVoice.name);
        } else {
          console.warn("Nenhuma voz de alta qualidade para pt-BR foi encontrada. Usando a padrão.");
        }
      }
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = getVoices;
    }
    getVoices();
  }

  private speak(text: string): void {
    // Adicionamos uma verificação aqui também
    if (!this.isBrowser) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';

    if (this.ptBrVoice) {
      utterance.voice = this.ptBrVoice;
    }
    utterance.pitch = 1;
    utterance.rate = 1;

    utterance.onstart = () => this.ngZone.run(() => this.setStatus('speaking', 'Falando...'));
    utterance.onend = () => this.ngZone.run(() => this.setStatus('idle', ''));

    window.speechSynthesis.speak(utterance);
  }

  private stopSpeaking(): void {
    if (this.isBrowser) {
        window.speechSynthesis.cancel();
    }
    this.setStatus('idle', '');
  }
  
  // O resto do seu código permanece igual...
  private initializeSpeechRecognition(): void {
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'pt-BR';
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[event.resultIndex][0].transcript;
      console.log("Transcrição capturada:", transcript);
      this.ngZone.run(() => {
        this.setStatus('processing', 'Processando...');
        this.sendQuestionToAgent(transcript);
      });
    };
    this.recognition.onend = () => {
      this.ngZone.run(() => {
        if (this.status === 'listening') {
          this.setStatus('idle', '');
        }
      });
    };
    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        let errorMessage = 'Não entendi. Tente de novo.';
        console.error("Erro no reconhecimento de voz:", event.error);
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'Não ouvi nada. Tente de novo.';
            break;
          case 'audio-capture':
            errorMessage = 'Nenhum microfone foi detectado.';
            break;
          case 'not-allowed':
            errorMessage = 'Permissão do microfone negada.';
            break;
          case 'network':
            errorMessage = 'Erro de rede. Verifique conexão e HTTPS.';
            break;
        }
        this.setStatus('idle', errorMessage);
        setTimeout(() => this.statusMessage = '', 4000);
      });
    };
  }
  toggleListen(): void {
    if (!this.isSupported || this.status === 'error') return;
    if (this.status === 'speaking') {
      this.stopSpeaking();
    }
    else if (this.status === 'idle') {
      this.startListening();
    }
    else {
      this.stopListening();
    }
  }
  private startListening(): void {
    this.setStatus('listening', 'Ouvindo...');
    try {
      this.recognition.start();
    } catch (e: any) {
      if (e.message.includes("start")) {
        console.warn("Reconhecimento já estava em execução, reiniciando...");
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 300);
      } else {
        console.error("Falha ao iniciar o reconhecimento:", e);
        this.setStatus('idle', 'Erro ao iniciar. Tente novamente.');
      }
    }
  }
  private stopListening(): void {
    if (this.status !== 'idle') {
      this.recognition.stop();
      this.setStatus('idle', '');
    }
  }
  private sendQuestionToAgent(question: string): void {
    this.agentService.askQuestion(question).subscribe({
      next: (response) => {
        this.speak(response.response);
      },
      error: (err) => {
        console.error("Erro na chamada da API do Agente:", err);
        this.setStatus('idle', 'Erro na comunicação com a assistente.');
        setTimeout(() => this.statusMessage = '', 4000);
      }
    });
  }
  private setStatus(newStatus: 'idle' | 'listening' | 'processing' | 'speaking' | 'error', message: string): void {
    this.status = newStatus;
    this.statusMessage = message;
  }
  getButtonTitle(): string {
    switch (this.status) {
      case 'speaking':
        return 'Interromper a fala';
      case 'listening':
        return 'Parar de ouvir';
      default:
        return 'Ativar assistente de voz';
    }
  }
}