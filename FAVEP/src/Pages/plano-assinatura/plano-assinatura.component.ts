import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/api.models';
import { MenuCentralComponent } from "../menu-central/menu-central.component";
import { MenuLateralComponent } from "../menu-lateral/menu-lateral.component";

@Component({
  selector: 'app-plano-assinatura',
  standalone: true,
  imports: [CommonModule, RouterLink, MenuCentralComponent, MenuLateralComponent],
  templateUrl: './plano-assinatura.component.html',
  styleUrls: ['./plano-assinatura.component.css']
})
export class PlanoAssinaturaComponent implements OnInit, OnDestroy {
  // Propriedade para armazenar o plano atual do usuário
  planoAtual: any;
  
  private userSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: Usuario | null) => {
      // Lógica aqui se necessário, por exemplo, carregar o plano do usuário logado
      if (user) {
        // ... carregar plano com base no user.id
      }
    });

    // Simulação do carregamento do plano atual
    this.loadCurrentPlan();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  /**
   * Simula a chamada de uma API para obter o plano atual do usuário.
   */
  loadCurrentPlan(): void {
    setTimeout(() => {
      this.planoAtual = {
        nome: 'Plano Básico',
        preco: 'R$ 49,90/mês',
        descricao: 'Acesso a recursos de gerenciamento e relatórios básicos.'
      };
    }, 1000); // Simula um atraso de 1 segundo para o carregamento
  }

  /**
   * Lógica para iniciar o processo de troca de plano.
   */
  trocarDePlano(): void {
    console.log('Iniciando processo de troca de plano...');
    alert('Processo de troca de plano iniciado!');
  }
}