import { Component, Inject, NgZone, OnInit, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, Renderer2, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { AgentService, GeminiMessage } from '../../services/agent.service';
import { FormsModule } from '@angular/forms';

// Interface para estruturar as mensagens de exibição
export interface Message {
  sender: 'user' | 'agent';
  text: string;
}

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
  status: 'idle' | 'processing' | 'speaking' | 'error' = 'idle';
  isChatOpen = false;
  readAloudEnabled = false;
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

  // --- Síntese de Voz ---
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
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.setPositionFromStorage();
    }
  }

  // --- Lógica de Arrastar (sem alterações) ---
  onDragStart(event: MouseEvent | TouchEvent) {
    if (window.innerWidth <= 480) return;
    if ((event.target as HTMLElement).closest('.header-btn')) return;
    this.isDragging = true; this.dragMoved = false;
    this.renderer.addClass(this.chatWidget.nativeElement, 'dragging');
    const widgetRect = this.chatWidget.nativeElement.getBoundingClientRect();
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.offsetX = clientX - widgetRect.left; this.offsetY = clientY - widgetRect.top;
  }
  @HostListener('document:mousemove', ['$event']) onDragMove(event: MouseEvent) { if (!this.isDragging) return; this.dragMoved = true; event.preventDefault(); this.setPosition(event.clientX - this.offsetX, event.clientY - this.offsetY); }
  @HostListener('document:touchmove', ['$event']) onTouchMove(event: TouchEvent) { if (!this.isDragging) return; this.dragMoved = true; event.preventDefault(); this.setPosition(event.touches[0].clientX - this.offsetX, event.touches[0].clientY - this.offsetY); }
  @HostListener('document:mouseup') @HostListener('document:touchend') onDragEnd() { if (this.isDragging) { this.isDragging = false; this.renderer.removeClass(this.chatWidget.nativeElement, 'dragging'); if (this.isBrowser && this.dragMoved) { const finalRect = this.chatWidget.nativeElement.getBoundingClientRect(); localStorage.setItem('chatWidgetPosition', JSON.stringify({ top: finalRect.top, left: finalRect.left })); } } }
  private setPosition(x: number, y: number) { if (!this.chatWidget) return; const el = this.chatWidget.nativeElement; const rect = el.getBoundingClientRect(); const constrainedX = Math.max(0, Math.min(x, window.innerWidth - rect.width)); const constrainedY = Math.max(0, Math.min(y, window.innerHeight - rect.height)); this.renderer.setStyle(el, 'left', `${constrainedX}px`); this.renderer.setStyle(el, 'top', `${constrainedY}px`); }
  private setPositionFromStorage() { if (this.isBrowser && this.chatWidget) { const pos = localStorage.getItem('chatWidgetPosition'); if (pos) { const { top, left } = JSON.parse(pos); this.setPosition(left, top); } else { const fabRight = 20; const fabBottom = 115; const widget = this.chatWidget.nativeElement; const initialX = window.innerWidth - widget.offsetWidth - fabRight; const initialY = window.innerHeight - widget.offsetHeight - fabBottom - 75; this.setPosition(initialX, initialY); } } }

  // --- Métodos de Controle da Interface ---
  handleHeaderClick(event: MouseEvent, action: 'close' | 'readAloud') { if (this.dragMoved) { event.stopPropagation(); setTimeout(() => this.dragMoved = false, 0); return; } if (action === 'close') this.toggleChat(); if (action === 'readAloud') this.toggleReadAloud(); }
  
  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    if (!this.isChatOpen) {
        this.stopSpeaking(); // Garante que a fala pare ao fechar o chat
    }
    if (this.isChatOpen && this.messages.length === 0) {
      const initialMessage = 'Olá! Sou a Sementinha. Como posso te ajudar hoje?';
      this.messages.push({ sender: 'agent', text: initialMessage });
      this.geminiHistory.push({ role: 'model', parts: [{ text: initialMessage }] });
      this.autoScrollToBottom(true);
    }
  }

  /**
   * CORREÇÃO: Lógica de Mute/Unmute.
   * Agora, além de alternar a preferência para futuras mensagens,
   * a função interrompe qualquer fala em andamento.
   */
  toggleReadAloud(): void {
    this.readAloudEnabled = !this.readAloudEnabled;
    
    // Se estiver falando no momento do clique, para a fala imediatamente.
    if (this.status === 'speaking') {
      this.stopSpeaking();
      this.setStatus('idle');
    }
  }
  
  private autoScrollToBottom(force: boolean = false): void { setTimeout(() => { try { const element = this.chatBody.nativeElement; const isScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 40; if (force || isScrolledToBottom) { element.scrollTop = element.scrollHeight; } } catch (err) {} }, 50); }

  // --- Métodos de Comunicação ---
  sendTextMessage(): void { if (!this.currentMessage.trim()) return; this.messages.push({ sender: 'user', text: this.currentMessage }); this.autoScrollToBottom(true); this.sendQuestionToAgent(this.currentMessage); this.currentMessage = ''; }
  
  private sendQuestionToAgent(question: string): void {
    this.setStatus('processing');
    this.autoScrollToBottom(true);
    this.geminiHistory.push({ role: 'user', parts: [{ text: question }] });
    this.agentService.askQuestion(question, this.geminiHistory).subscribe({
      next: (response) => {
        const fullResponse = response.response;
        this.geminiHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
        const paragraphs = fullResponse.split('\n').filter(p => p.trim() !== '');
        this.displayParagraphsSequentially(paragraphs);
        
        // A fala só é iniciada se o modo "readAloud" estiver ativo
        if (this.readAloudEnabled) {
          this.speak(fullResponse);
        }
      },
      error: (err) => {
        const errorMessage = 'Desculpe, não consegui me conectar. Tente novamente mais tarde.';
        this.messages.push({ sender: 'agent', text: errorMessage });
        this.autoScrollToBottom();
        this.setStatus('idle');
        this.geminiHistory.pop();
      }
    });
  }

  private displayParagraphsSequentially(paragraphs: string[], index = 0) {
    if (index >= paragraphs.length) {
      // Só muda o status para 'idle' se não houver uma fala em andamento.
      if (this.status !== 'speaking') {
        this.setStatus('idle');
      }
      return;
    }
    const paragraph = paragraphs[index].trim();
    if (paragraph) {
      this.messages.push({ sender: 'agent', text: paragraph });
      this.autoScrollToBottom();
    }
    setTimeout(() => {
      this.displayParagraphsSequentially(paragraphs, index + 1);
    }, 800);
  }

  // --- Lógica de Voz (Apenas Leitura) ---
  private speak(text: string): void {
    if (!this.isBrowser) return;
    this.stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    if (this.ptBrVoice) utterance.voice = this.ptBrVoice;
    
    utterance.onstart = () => this.ngZone.run(() => this.setStatus('speaking'));
    
    utterance.onend = () => this.ngZone.run(() => {
      this.setStatus('idle');
    });
    
    window.speechSynthesis.speak(utterance);
  }
  
  private stopSpeaking(): void {
    if (this.isBrowser) window.speechSynthesis.cancel();
  }
  
  // --- Funções Auxiliares ---
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

  private setStatus(newStatus: 'idle' | 'processing' | 'speaking' | 'error'): void {
    this.ngZone.run(() => { this.status = newStatus; });
  }
}