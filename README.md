# 🌾 FAVEP: Plataforma de Gerenciamento Agrícola

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/seu-usuario/seu-repo/blob/main/LICENSE)
[![Frontend: Angular](https://img.shields.io/badge/Frontend-Angular-red?logo=angular)](https://angular.io/)
[![Backend: Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=nodedotjs)](https://nodejs.org/en/)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite-074463?logo=sqlite)](https://www.sqlite.org/index.html)

## 🎯 Visão Geral do Projeto

**FAVEP** é uma aplicação web **full-stack** desenvolvida para a gestão completa de atividades agrícolas. A plataforma visa simplificar a administração rural, oferecendo ferramentas para:

* **Gerenciar** propriedades e seus respectivos dados. 🏡
* **Controlar** produções, safras e culturas. 🌱
* **Acompanhar** detalhadamente as finanças (receitas e despesas). 💰
* **Visualizar** estatísticas e relatórios gráficos para auxiliar na tomada de decisões estratégicas. 📊

---

## 🚀 Funcionalidades Principais

| Ícone | Funcionalidade | Descrição |
| :---: | :--- | :--- |
| 🔑 | **Autenticação Segura** | Sistema de registro e login de usuários. |
| 🏡 | **Gerenciamento de Propriedades** | Cadastro, edição e visualização de todas as suas propriedades rurais. |
| 🌱 | **Controle de Produção** | Registro de safras, culturas, insumos e produtividade. |
| 💵 | **Gestão Financeira** | Lançamento e acompanhamento de receitas e despesas. |
| 📈 | **Visualização de Dados** | Geração de gráficos, estatísticas e relatórios em tempo real. |
| 🤝 | **Interação com Parceiros** | Seção dedicada para exibir parceiros estratégicos do agronegócio. |

---

## 🛠️ Tecnologias Utilizadas

O projeto é dividido em duas partes principais: Frontend (Aplicação Web) e Backend (Servidor API).

### 🎨 Frontend (FAVEP/)

| Tecnologia | Descrição |
| :--- | :--- |
| **Framework:** Angular | Framework de desenvolvimento web. |
| **Linguagem:** TypeScript | Superset do JavaScript para desenvolvimento em escala. |
| **Estilização:** CSS | Linguagem de folha de estilos. |
| **Componentes:** Angular Material | Biblioteca de componentes de UI. |

### ⚙️ Backend (ServerBackup/)

| Tecnologia | Descrição |
| :--- | :--- |
| **Framework:** Express.js | Framework minimalista e flexível para Node.js. |
| **Linguagem:** JavaScript (Node.js) | Ambiente de execução. |
| **ORM:** Prisma | ORM moderno para Node.js. |
| **Banco de Dados:** SQLite | Banco de dados leve e integrado (para desenvolvimento). |
| **Autenticação:** JWT com bcrypt | JSON Web Tokens para segurança e bcrypt para hashing de senhas. |

---

## 🖥️ Comandos para Execução

Siga os passos abaixo para colocar o projeto FAVEP em execução na sua máquina local.

### 1. ⚙️ Executando o Backend (Servidor Node.js)

1.  Navegue até o diretório do servidor:
    ```bash
    cd ServerBackup/
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Gere os arquivos do Prisma Client (necessário para interagir com o DB):
    ```bash
    npx prisma generate
    ```
4.  Inicie o servidor. **Recomendado para desenvolvimento:**
    ```bash
    npx nodemon index.js
    ```
    (Ou `node index.js` para uma execução simples).

> ℹ️ **O servidor estará em execução em:** `http://localhost:5050`

### 2. 🅰️ Executando o Frontend (Aplicação Angular)

1.  Navegue até o diretório da aplicação Angular:
    ```bash
    cd FAVEP/
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o servidor de desenvolvimento:
    ```bash
    ng serve
    ```
    Para build de produção:
    ```bash
    ng build
    ```

> ℹ️ **A aplicação estará disponível em:** `http://localhost:4200/`
