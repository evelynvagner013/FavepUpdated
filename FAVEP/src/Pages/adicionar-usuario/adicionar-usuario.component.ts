import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PropriedadeService } from '../../services/propriedade.service';
import { Router, RouterLink } from '@angular/router';
import { Usuario, Propriedade } from '../../models/api.models';
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

  // --- CONTROLE DE ABAS ---
  abaAtiva: 'adicionar' | 'visualizar' = 'adicionar';

  // --- DADOS DO FORMULÁRIO (ADICIONAR) ---
  newUser = {
    email: '',
    accessLevel: ''
  };
  statusMessage: string = '';

  // --- PROPRIEDADES DISPONÍVEIS (ADMIN) ---
  availableProperties: Propriedade[] = [];

  // Controle de seleção na aba "Adicionar"
  selectedProperties: { [id: string]: boolean } = {};

  // --- LISTAGEM DE COLABORADORES ---
  subUsers: Usuario[] = [];
  isLoadingUsers: boolean = false;

  // --- CONTROLE DO MODAL DE EDIÇÃO/VISUALIZAÇÃO ---
  showModal: boolean = false;
  isEditingMode: boolean = false;
  userToEdit: Usuario | null = null;

  // Controle de seleção dentro do Modal (Edição)
  selectedPropertiesEdit: { [id: string]: boolean } = {};
  editedRole: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private propriedadeService: PropriedadeService
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: Usuario | null) => {
      // Se necessário, lógica de redirecionamento ou verificação de permissão aqui
    });

    // Carrega as propriedades do Admin (necessário tanto para adicionar quanto para editar)
    this.loadProperties();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  // --- ALTERNÂNCIA DE ABAS ---
  selecionarAba(aba: 'adicionar' | 'visualizar'): void {
    this.abaAtiva = aba;
    if (aba === 'visualizar') {
      this.loadSubUsers();
    }
  }

  // --- CARGA DE DADOS ---
  loadProperties(): void {
    this.propriedadeService.getPropriedades().subscribe({
      next: (props) => {
        this.availableProperties = props;
        // Se já estiver na aba visualizar, garante que os nomes das propriedades apareçam corretamente
        if (this.abaAtiva === 'visualizar') {
          this.loadSubUsers();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar propriedades:', err);
      }
    });
  }

  loadSubUsers(): void {
    this.isLoadingUsers = true;
    this.authService.getSubUsers().subscribe({
      next: (users) => {
        this.subUsers = users;
        this.isLoadingUsers = false;
      },
      error: (err) => {
        console.error('Erro ao buscar colaboradores:', err);
        this.statusMessage = 'Erro ao carregar lista de colaboradores.';
        this.isLoadingUsers = false;
      }
    });
  }

  // --- AUXILIARES DE SELEÇÃO (ADICIONAR) ---
  getSelectedPropertyIds(): string[] {
    return Object.keys(this.selectedProperties).filter(id => this.selectedProperties[id]);
  }

  // --- FUNÇÃO ADICIONAR USUÁRIO ---
  addUser(form: NgForm): void {
    if (form.valid) {
      const selectedIds = this.getSelectedPropertyIds();

      this.authService.preRegisterSubUser(this.newUser.email, this.newUser.accessLevel, selectedIds)
        .subscribe({
          next: (res) => {
            console.log('Usuário adicionado:', res);
            this.statusMessage = res.message || 'Usuário convidado com sucesso! A senha foi enviada por e-mail.';
            form.resetForm();
            this.selectedProperties = {};
            // Se quiser atualizar a lista imediatamente, pode chamar:
            // this.loadSubUsers();
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

  // --- VISUALIZAÇÃO NA TABELA ---
  getPropriedadesAcessiveis(user: Usuario): string {
    if (!user.propriedadesAcessiveis || user.propriedadesAcessiveis.length === 0) {
      return 'Nenhuma';
    }
    return user.propriedadesAcessiveis.map(p => p.nomepropriedade).join(', ');
  }

  // --- LÓGICA DO MODAL ---

  openModal(user: Usuario): void {
    this.userToEdit = user;
    this.showModal = true;
    this.isEditingMode = false; // Começa sempre em modo visualização
    this.statusMessage = ''; // Limpa mensagens antigas

    // Prepara os dados caso o usuário queira editar
    this.editedRole = user.cargo || '';
    this.selectedPropertiesEdit = {};

    // Marca as checkboxes baseadas no que o usuário JÁ TEM
    if (user.propriedadesAcessiveis) {
      user.propriedadesAcessiveis.forEach(prop => {
        this.selectedPropertiesEdit[prop.id] = true;
      });
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.userToEdit = null;
    this.isEditingMode = false;
  }

  toggleEditMode(): void {
    this.isEditingMode = !this.isEditingMode;
  }

  saveUserChanges(): void {
    if (!this.userToEdit || !this.userToEdit.id) return;

    // Filtra os IDs marcados no modal
    const selectedIds = Object.keys(this.selectedPropertiesEdit).filter(id => this.selectedPropertiesEdit[id]);

    this.authService.updateSubUser(this.userToEdit.id, {
      cargo: this.editedRole,
      propriedades: selectedIds
    }).subscribe({
      next: (updatedUser) => {
        console.log('Usuário atualizado:', updatedUser);

        // Atualiza a lista local para refletir as mudanças sem precisar recarregar tudo do zero
        const index = this.subUsers.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.subUsers[index] = updatedUser;
        }

        this.closeModal();
        this.statusMessage = 'Colaborador atualizado com sucesso!';

        // Remove a mensagem de sucesso após 3 segundos
        setTimeout(() => { this.statusMessage = ''; }, 3000);
      },
      error: (err) => {
        console.error('Erro ao atualizar colaborador:', err);
        // Exibe erro (você pode querer adicionar um campo de erro específico no modal)
        alert(err.error?.error || 'Erro ao atualizar colaborador.');
      }
    });
  }

  // Helper para o trackBy no ngFor (melhora performance)
  trackById(index: number, item: Usuario): string {
    return item.id;
  }
}
