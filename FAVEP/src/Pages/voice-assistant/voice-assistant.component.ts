import { Component, Inject, NgZone, OnInit, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, Renderer2, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { FormsModule } from '@angular/forms';

// Interface para estruturar as mensagens
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
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' = 'idle';
  isChatOpen = false;
  isSupported: boolean = false;
  readAloudEnabled = false;
  private isBrowser: boolean;

  // --- Mensagens e Conversa ---
  messages: Message[] = [];
  currentMessage: string = '';

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
    if (!this.isChatOpen && this.status === 'listening') { this.stopListening(); }
    if (this.isChatOpen && this.messages.length === 0) {
      this.messages.push({ sender: 'agent', text: 'Olá! Sou a Sementinha. Como posso te ajudar hoje?' });
      this.autoScrollToBottom();
    }
  }
  
  toggleReadAloud(): void {
    this.readAloudEnabled = !this.readAloudEnabled;
    if (!this.readAloudEnabled && this.status === 'speaking') { this.stopSpeaking(); }
  }
  
  private autoScrollToBottom(): void {
    setTimeout(() => {
      try {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      } catch (err) {}
    }, 0);
  }
  
  // --- Métodos de Comunicação ---
  sendTextMessage(): void {
    if (!this.currentMessage.trim()) return;
    this.messages.push({ sender: 'user', text: this.currentMessage });
    this.autoScrollToBottom();
    this.sendQuestionToAgent(this.currentMessage);
    this.currentMessage = '';
  }

  private sendQuestionToAgent(question: string): void {
    this.setStatus('processing');
    this.autoScrollToBottom();

    this.agentService.askQuestion(question, []).subscribe({
      next: (response) => {
        const fullResponse = response.response;
        
        const sentences = fullResponse.match(/[^.!?]+[.!?]*/g) || [fullResponse];

        this.displaySentencesSequentially(sentences);

        if (this.readAloudEnabled) {
          this.speak(fullResponse);
        }
      },
      error: (err) => {
        const errorMessage = 'Desculpe, não consegui ligar-me. Tente novamente mais tarde.';
        this.messages.push({ sender: 'agent', text: errorMessage });
        this.autoScrollToBottom();
        this.setStatus('idle');
      }
    });
  }
  
  private displaySentencesSequentially(sentences: string[], index = 0) {
    if (index >= sentences.length) {
      if (!this.readAloudEnabled) {
        this.setStatus('idle');
      }
      return;
    }

    this.messages.push({ sender: 'agent', text: sentences[index].trim() });
    this.autoScrollToBottom();

    setTimeout(() => {
      this.displaySentencesSequentially(sentences, index + 1);
    }, 900);
  }

  // --- Lógica de Voz ---
  private speak(text: string): void {
    if (!this.isBrowser) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    if (this.ptBrVoice) utterance.voice = this.ptBrVoice;
    utterance.onstart = () => this.ngZone.run(() => this.setStatus('speaking'));
    utterance.onend = () => this.ngZone.run(() => this.setStatus('idle'));
    window.speechSynthesis.speak(utterance);
  }
  
  private stopSpeaking(): void {
    if (this.isBrowser) window.speechSynthesis.cancel();
    this.setStatus('idle');
  }
  
  toggleListen(): void {
    if (!this.isSupported || this.status === 'error') return;
    if (this.status === 'idle') { this.startListening(); } 
    else if (this.status === 'listening') { this.stopListening(); }
  }
  
  private startListening(): void {
    this.setStatus('listening');
    try { this.recognition.start(); } catch (e) { this.setStatus('idle'); }
  }
  
  private stopListening(): void {
    if (this.status === 'listening') {
      this.recognition.stop();
      this.setStatus('idle');
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
        this.autoScrollToBottom();
        this.sendQuestionToAgent(transcript);
      });
    };
    
    this.recognition.onend = () => this.ngZone.run(() => { if (this.status === 'listening') this.setStatus('idle'); });
    this.recognition.onerror = () => this.ngZone.run(() => { this.setStatus('idle'); });
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
  
  private setStatus(newStatus: 'idle' | 'listening' | 'processing' | 'speaking' | 'error'): void {
    this.ngZone.run(() => { this.status = newStatus; });
  }
}