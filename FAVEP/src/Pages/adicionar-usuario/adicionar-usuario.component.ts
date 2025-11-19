import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { Usuario } from '../../models/api.models';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MenuCentralComponent } from "../menu-central/menu-central.component";
import { MenuLateralComponent } from "../menu-lateral/menu-lateral.component";

@Component({
  selector: 'app-adicionar-usuario',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MenuCentralComponent, MenuLateralComponent],
  templateUrl: './adicionar-usuario.component.html',
  styleUrls: ['./adicionar-usuario.component.css']
})
export class AdicionarUsuarioComponent implements OnInit, OnDestroy {
  private userSubscription: Subscription | undefined;

  // Propriedades do formulário de usuário
  // Removido 'password' pois o backend gera automaticamente
  newUser = {
    email: '',
    accessLevel: ''
  };
  statusMessage: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Apenas me inscrevo para o usuário, se necessário para outras lógicas futuras.
    this.userSubscription = this.authService.currentUser.subscribe((user: Usuario | null) => {
      // Por enquanto, não há lógica necessária aqui, mas a inscrição é mantida.
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  // Novo método para adicionar usuário
  addUser(form: NgForm): void {
    if (form.valid) {
      // Chama o serviço real conectado ao backend
      this.authService.preRegisterSubUser(this.newUser.email, this.newUser.accessLevel)
        .subscribe({
          next: (res) => {
            console.log('Usuário adicionado:', res);
            this.statusMessage = res.message || 'Usuário convidado com sucesso! A senha foi enviada por e-mail.';
            form.resetForm(); // Limpa o formulário após o sucesso
          },
          error: (err) => {
            console.error('Erro ao adicionar usuário:', err);
            // Exibe a mensagem de erro vinda do backend (ex: Plano insuficiente)
            this.statusMessage = err.error?.error || 'Erro ao adicionar usuário. Tente novamente.';
          }
        });
    } else {
      this.statusMessage = 'Erro: Por favor, preencha todos os campos corretamente.';
    }
  }
}