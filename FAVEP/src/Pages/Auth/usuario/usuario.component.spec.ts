import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';


interface Usuario {
fotoperfil: any;
  nome: string;
  email: string;
  telefone: string;
  fotoUrl: string;
  plano: string;
  dataAssinatura: Date | string;
  dataValidade: Date | string;
}

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
  
  ],
  providers: [DatePipe],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit {
  menuAberto = false;
  usuarioNome: string = '';
  usuarioFoto: string = '';

  usuario: Usuario = {
    nome: 'Thomas Edison',
    email: 'thomas@site.com',
    telefone: '(60) 12 345 6789',
    fotoUrl: 'assets/img/usuario.jpg',
    plano: 'Anual',
    dataAssinatura: new Date('2025-07-19'),
    dataValidade: new Date('2026-07-19')
  };

  usuarioEditavel!: Usuario;
  editModalAberto = false;


  constructor(
    private datePipe: DatePipe,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.atualizarHeaderInfo();
    this.usuarioEditavel = { ...this.usuario };
  }

  alternarMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click', ['$event'])
  fecharMenuFora(event: MouseEvent): void {
    const alvo = event.target as HTMLElement;
    if (this.menuAberto && !alvo.closest('.menu-toggle') && !alvo.closest('.main-menu')) {
      this.menuAberto = false;
    }
  }

  abrirModalEdicao(): void {
    this.usuarioEditavel = { ...this.usuario };
    this.editModalAberto = true;
  }

  fecharModalEdicao(): void {
    this.editModalAberto = false;
  }

  salvarAlteracoesPerfil(): void {
    this.usuario = { ...this.usuarioEditavel };
    this.atualizarHeaderInfo();
    this.fecharModalEdicao();
  }

  private atualizarHeaderInfo(): void {
    this.usuarioNome = this.usuario.nome;
    this.usuarioFoto = this.usuario.fotoUrl;
  }

  navegarParaContato(): void {
    this.router.navigate(['/contato']);
  }
}