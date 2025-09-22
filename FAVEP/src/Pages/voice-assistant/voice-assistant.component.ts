import { Component, Inject, NgZone, OnInit, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, Renderer2, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { AgentService, GeminiMessage } from '../../services/agent.service';
import { FormsModule } from '@angular/forms';

// Interface para estruturar as mensagens de exibição
export interface Message {
  sender: 'user' | 'agent';
  text: string;
}

// Declarações para compatibilidade
declare var webkitSpeechRecognition: any;
declare var SpeechRecognition: any;

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voice-assistant.component.html',
  styleUrls: ['./voice-assistant.component.css']
})
export class VoiceAssistantComponent implements OnInit, AfterViewInit {
  // --- Referências de Elementos ---
  @ViewChild('chatWidget') private chatWidget!: ElementRef<HTMLDivElement>;
  @ViewChild('chatBody') private chatBody!: ElementRef;

  // --- Controle de Estado ---
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'waiting' = 'idle';
  isChatOpen = false;
  isSupported: boolean = false;
  readAloudEnabled = false;
  conversationModeActive = false;
  private isBrowser: boolean;

  // --- Mensagens e Conversa ---
  messages: Message[] = [];
  currentMessage: string = '';
  private geminiHistory: GeminiMessage[] = [];

  // --- Propriedades para a Lógica de Arrastar ---
  private isDragging = false;
  private dragMoved = false;
  private offsetX = 0;
  private offsetY = 0;

  // --- Reconhecimento e Síntese de Voz ---
  recognition: any;
  private ptBrVoice: SpeechSynthesisVoice | null = null;

  constructor(
    private agentService: AgentService,
    private ngZone: NgZone,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.loadVoices();
    }
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      if (!window.isSecureContext) { this.status = 'error'; return; }
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        this.isSupported = true;
        this.recognition = new SpeechRecognitionAPI();
        this.initializeSpeechRecognition();
      } else {
        this.isSupported = false; this.status = 'error';
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.setPositionFromStorage();
    }
  }

  // --- Lógica de Arrastar ---
  onDragStart(event: MouseEvent | TouchEvent) {
    if (window.innerWidth <= 480) return;
    if ((event.target as HTMLElement).closest('.header-btn')) return;

    this.isDragging = true;
    this.dragMoved = false;
    this.renderer.addClass(this.chatWidget.nativeElement, 'dragging');

    const widgetRect = this.chatWidget.nativeElement.getBoundingClientRect();
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    this.offsetX = clientX - widgetRect.left;
    this.offsetY = clientY - widgetRect.top;
  }
  
  @HostListener('document:mousemove', ['$event'])
  onDragMove(event: MouseEvent) {
    if (!this.isDragging) return;
    this.dragMoved = true;
    event.preventDefault();
    this.setPosition(event.clientX - this.offsetX, event.clientY - this.offsetY);
  }
  
  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    this.dragMoved = true;
    event.preventDefault();
    this.setPosition(event.touches[0].clientX - this.offsetX, event.touches[0].clientY - this.offsetY);
  }
  
  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onDragEnd() {
    if (this.isDragging) {
      this.isDragging = false;
      this.renderer.removeClass(this.chatWidget.nativeElement, 'dragging');
      if (this.isBrowser && this.dragMoved) {
        const finalRect = this.chatWidget.nativeElement.getBoundingClientRect();
        localStorage.setItem('chatWidgetPosition', JSON.stringify({ top: finalRect.top, left: finalRect.left }));
      }
    }
  }
  
  private setPosition(x: number, y: number) {
    if (!this.chatWidget) return;
    const el = this.chatWidget.nativeElement;
    const rect = el.getBoundingClientRect();
    const constrainedX = Math.max(0, Math.min(x, window.innerWidth - rect.width));
    const constrainedY = Math.max(0, Math.min(y, window.innerHeight - rect.height));
    this.renderer.setStyle(el, 'left', `${constrainedX}px`);
    this.renderer.setStyle(el, 'top', `${constrainedY}px`);
  }
  
  private setPositionFromStorage() {
    if (this.isBrowser && this.chatWidget) {
      const pos = localStorage.getItem('chatWidgetPosition');
      if (pos) {
        const { top, left } = JSON.parse(pos);
        this.setPosition(left, top);
      } else {
        const fabRight = 20;
        const fabBottom = 115;
        const widget = this.chatWidget.nativeElement;
        const initialX = window.innerWidth - widget.offsetWidth - fabRight;
        const initialY = window.innerHeight - widget.offsetHeight - fabBottom - 75;
        this.setPosition(initialX, initialY);
      }
    }
  }
  
  // --- Métodos de Controle da Interface ---
  handleHeaderClick(event: MouseEvent, action: 'close' | 'readAloud') {
    if (this.dragMoved) {
      event.stopPropagation();
      setTimeout(() => this.dragMoved = false, 0);
      return;
    }
    if (action === 'close') this.toggleChat();
    if (action === 'readAloud') this.toggleReadAloud();
  }
  
  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    if (!this.isChatOpen) {
      this.stopConversationMode();
    }
    if (this.isChatOpen && this.messages.length === 0) {
      const initialMessage = 'Olá! Sou a Sementinha. Como posso te ajudar hoje?';
      this.messages.push({ sender: 'agent', text: initialMessage });
      this.geminiHistory.push({ role: 'model', parts: [{ text: initialMessage }] });
      this.autoScrollToBottom(true);
    }
  }
  
  toggleReadAloud(): void {
    this.readAloudEnabled = !this.readAloudEnabled;
    if (!this.readAloudEnabled && this.status === 'speaking') { this.stopSpeaking(); }
  }
  
  // CORREÇÃO: Lógica de rolagem agora é condicional
  private autoScrollToBottom(force: boolean = false): void {
    setTimeout(() => {
      try {
        const element = this.chatBody.nativeElement;
        // Adiciona uma tolerância para não precisar estar exatamente no fundo
        const isScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 40;

        // Só rola se for forçado (ex: usuário enviou msg) ou se já estiver no final
        if (force || isScrolledToBottom) {
          element.scrollTop = element.scrollHeight;
        }
      } catch (err) {}
    }, 50);
  }
  
  // --- Métodos de Comunicação ---
  sendTextMessage(): void {
    if (!this.currentMessage.trim()) return;
    this.messages.push({ sender: 'user', text: this.currentMessage });
    this.autoScrollToBottom(true); // Força a rolagem ao enviar
    this.sendQuestionToAgent(this.currentMessage);
    this.currentMessage = '';
  }

  private sendQuestionToAgent(question: string): void {
    this.setStatus('processing');
    this.autoScrollToBottom(true); // Força a rolagem para mostrar o indicador de "processando"

    this.geminiHistory.push({ role: 'user', parts: [{ text: question }] });

    this.agentService.askQuestion(question, this.geminiHistory).subscribe({
      next: (response) => {
        const fullResponse = response.response;
        this.geminiHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
        
        const sentences = fullResponse.match(/[^.!?]+[.!?]*/g) || [fullResponse];
        this.displaySentencesSequentially(sentences);
        if (this.readAloudEnabled || this.conversationModeActive) {
          this.speak(fullResponse);
        }
      },
      error: (err) => {
        const errorMessage = 'Desculpe, não consegui ligar-me. Tente novamente mais tarde.';
        this.messages.push({ sender: 'agent', text: errorMessage });
        this.autoScrollToBottom();
        this.setStatus('idle');
        this.geminiHistory.pop();
        if (this.conversationModeActive) {
          setTimeout(() => this.startListening(), 1000);
        }
      }
    });
  }
  
  private displaySentencesSequentially(sentences: string[], index = 0) {
    if (index >= sentences.length) {
      if (!this.readAloudEnabled && !this.conversationModeActive) {
        this.setStatus('idle');
      }
      return;
    }

    this.messages.push({ sender: 'agent', text: sentences[index].trim() });
    
    this.autoScrollToBottom(); // Rolagem condicional para as respostas da IA

    // CORREÇÃO: Aumenta o tempo de espera entre as frases
    setTimeout(() => {
      this.displaySentencesSequentially(sentences, index + 1);
    }, 1200);
  }

  // --- Lógica de Voz ---
  private speak(text: string): void {
    if (!this.isBrowser) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    if (this.ptBrVoice) utterance.voice = this.ptBrVoice;
    utterance.onstart = () => this.ngZone.run(() => this.setStatus('speaking'));
    utterance.onend = () => this.ngZone.run(() => {
      if (this.conversationModeActive) {
        this.setStatus('waiting');
        setTimeout(() => {
            if (this.conversationModeActive) this.startListening();
        }, 500);
      } else {
        this.setStatus('idle');
      }
    });
    window.speechSynthesis.speak(utterance);
  }
  
  private stopSpeaking(): void {
    if (this.isBrowser) window.speechSynthesis.cancel();
    if (!this.conversationModeActive) this.setStatus('idle');
  }
  
  toggleConversationMode(): void {
    if (!this.isSupported || this.status === 'error') return;
    
    if (this.conversationModeActive) {
      this.stopConversationMode();
    } else {
      this.conversationModeActive = true;
      this.readAloudEnabled = true;
      this.startListening();
    }
  }

  private stopConversationMode(): void {
    this.conversationModeActive = false;
    if (this.status === 'listening' || this.status === 'waiting') {
      this.recognition.abort();
      this.setStatus('idle');
    }
    if (this.status === 'speaking') {
      this.stopSpeaking();
    }
  }
  
  private startListening(): void {
    if (!this.conversationModeActive) return;
    this.setStatus('listening');
    try { this.recognition.start(); } catch (e) { 
        if (this.conversationModeActive) this.setStatus('waiting');
    }
  }
  
  private initializeSpeechRecognition(): void {
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'pt-BR';
    
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.ngZone.run(() => {
        this.messages.push({ sender: 'user', text: `"${transcript}"` });
        this.autoScrollToBottom(true); // Força a rolagem ao receber transcrição de voz
        this.sendQuestionToAgent(transcript);
      });
    };
    
    this.recognition.onend = () => this.ngZone.run(() => { 
        if (this.conversationModeActive && this.status === 'listening') {
            this.setStatus('waiting');
            setTimeout(() => {
              if (this.conversationModeActive) this.startListening();
            }, 200);
        }
    });
    this.recognition.onerror = (event: any) => this.ngZone.run(() => { 
        if (this.conversationModeActive) {
          this.setStatus('waiting');
          setTimeout(() => {
            if (this.conversationModeActive) this.startListening();
          }, 500);
        } else {
          this.setStatus('idle');
        }
    });
  }
  
  private loadVoices(): void {
    if (!this.isBrowser) return;
    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.ptBrVoice = voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) || voices.find(v => v.lang === 'pt-BR') || null;
      }
    };
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = getVoices;
    }
    getVoices();
  }
  
  private setStatus(newStatus: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'waiting'): void {
    this.ngZone.run(() => { this.status = newStatus; });
  }
}