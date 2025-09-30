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
  newUser = {
    email: '',
    password: '',
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
      // Simulação de chamada de serviço para criar o usuário
      // Na vida real, você chamaria um serviço como: this.authService.createUser(this.newUser).subscribe(...)
      console.log('Dados do novo usuário:', this.newUser);

      this.statusMessage = 'Usuário adicionado com sucesso!';
      form.resetForm(); // Limpa o formulário após o sucesso
    } else {
      this.statusMessage = 'Erro: Por favor, preencha todos os campos corretamente.';
    }
  }
}