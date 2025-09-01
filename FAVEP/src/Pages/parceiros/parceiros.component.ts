import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FooterComponent } from '../footer/footer.component';
import { MenuCimaComponent } from "../navbar/menu-cima/menu-cima.component"; // Ajuste o caminho se necessário

// Interface para definir a estrutura de um parceiro
interface Parceiro {
  id: number;
  nome: string;
  logoUrl: string;
  descricao: string;
  siteUrl?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  redesSociais: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

@Component({
  selector: 'app-parceiros',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenuCimaComponent
],
  templateUrl: './parceiros.component.html',
  styleUrl: './parceiros.component.css'
})
export class ParceirosComponent implements OnInit {

  parceiros: Parceiro[] = [];

  constructor() { }

  ngOnInit(): void {
  }

}
