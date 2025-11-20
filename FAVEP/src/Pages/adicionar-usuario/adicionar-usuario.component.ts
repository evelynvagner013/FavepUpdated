import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PropriedadeService } from '../../services/propriedade.service'; // Importação do Service
import { Router, RouterLink } from '@angular/router';
import { Usuario, Propriedade } from '../../models/api.models'; // Importação do Model
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

  newUser = {
    email: '',
    accessLevel: ''
  };

  // Variáveis para controle das propriedades
  availableProperties: Propriedade[] = [];
  selectedProperties: { [id: string]: boolean } = {}; // Mapa de seleção: { 'id_123': true, 'id_456': false }

  statusMessage: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private propriedadeService: PropriedadeService // Injeção do serviço
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: Usuario | null) => {
      // Lógica futura se necessário
    });

    // Carrega as propriedades do admin para exibir no formulário
    this.loadProperties();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  loadProperties(): void {
    this.propriedadeService.getPropriedades().subscribe({
      next: (props) => {
        this.availableProperties = props;
      },
      error: (err) => {
        console.error('Erro ao carregar propriedades:', err);
      }
    });
  }

  // Helper para converter o objeto de seleção em array de IDs
  getSelectedPropertyIds(): string[] {
    return Object.keys(this.selectedProperties).filter(id => this.selectedProperties[id]);
  }

  addUser(form: NgForm): void {
    if (form.valid) {
      const selectedIds = this.getSelectedPropertyIds();

      // Passamos os IDs selecionados para o serviço
      this.authService.preRegisterSubUser(this.newUser.email, this.newUser.accessLevel, selectedIds)
        .subscribe({
          next: (res) => {
            console.log('Usuário adicionado:', res);
            this.statusMessage = res.message || 'Usuário convidado com sucesso! A senha foi enviada por e-mail.';
            form.resetForm();
            this.selectedProperties = {}; // Limpa as seleções
          },
          error: (err) => {
            console.error('Erro ao adicionar usuário:', err);
            this.statusMessage = err.error?.error || 'Erro ao adicionar usuário. Tente novamente.';
          }
        });
    } else {
      this.statusMessage = 'Erro: Por favor, preencha todos os campos corretamente.';
    }
  }
}
