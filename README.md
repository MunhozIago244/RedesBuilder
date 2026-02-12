<p align="center">
  <img src="./public/banner.png" alt="NetBuilder Academy Banner" width="720" />
  <!-- 📸 SUBSTITUA: Crie um banner 1280×640 com o nome "NetBuilder Academy" e ícones de rede/arquitetura -->
</p>

<h1 align="center">NetBuilder Academy</h1>

<p align="center">
  <strong>Projete, simule e documente infraestrutura de rede e arquitetura de software — tudo visual, tudo no browser.</strong>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick%20Start-▶-00d4aa?style=for-the-badge" alt="Quick Start" /></a>&nbsp;
  <a href="https://github.com/SEU-USUARIO/RedesBuilder/issues/new?template=bug_report.md"><img src="https://img.shields.io/badge/Reportar%20Bug-🐛-ff6b6b?style=for-the-badge" alt="Reportar Bug" /></a>&nbsp;
  <a href="#-funcionalidades"><img src="https://img.shields.io/badge/Features-✨-c084fc?style=for-the-badge" alt="Features" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build" />
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square" alt="PRs Welcome" />
</p>

---

## 💡 O que é?

NetBuilder Academy é uma **plataforma visual completa** para projetar topologias de rede e arquiteturas de software diretamente no browser. Arraste componentes, conecte-os, e a plataforma gera **código real** (Docker, Kubernetes, Terraform), analisa **segurança**, estima **custos multi-cloud** e mantém **versionamento automático** — tudo sem backend.

---

## ✨ Funcionalidades

### 🌐 Network Builder
> Projete topologias com **20+ dispositivos** — roteadores, switches L2/L3, firewalls, access points, servidores e dispositivos IoT. Simule tráfego ICMP/ARP em tempo real.

<p align="center">
  <img src="./docs/screenshots/network-builder.gif" alt="Network Builder Demo" width="700" />
  <!-- 📸 SUBSTITUA: GIF mostrando drag & drop de dispositivos, criação de conexões e simulação de pacotes -->
</p>

**Por que importa:** Visualize problemas de topologia *antes* de comprar equipamentos.

---

### 🏗️ Architecture Builder
> Diagrame arquiteturas completas com **30+ componentes** — SPA, REST API, microsserviços, filas, caches, CDN, databases. Defina protocolos (gRPC, WebSocket, GraphQL) e direção de fluxo.

<p align="center">
  <img src="./docs/screenshots/architecture-builder.gif" alt="Architecture Builder Demo" width="700" />
  <!-- 📸 SUBSTITUA: GIF mostrando criação de arquitetura three-tier com conexões tipadas e protocolos -->
</p>

**Por que importa:** Documente decisões de arquitetura de forma visual e compartilhável.

---

### ⚡ Code Generator
> Transforme diagramas em **código deployável** — Docker Compose, Kubernetes manifests, Terraform HCL e Nginx configs. Copie ou baixe tudo com um clique.

<p align="center">
  <img src="./docs/screenshots/code-generator.png" alt="Code Generator Preview" width="700" />
  <!-- 📸 SUBSTITUA: Screenshot do Code Generator mostrando tabs com preview de Docker Compose e botão Download All -->
</p>

| Formato | O que gera |
|---------|-----------|
| **Docker Compose** | Services, volumes, healthchecks, networks, depends_on |
| **Kubernetes** | Deployments, Services, resource limits, readiness probes |
| **Terraform** | VPC, subnets, security groups, RDS, ECS, ALB (AWS) |
| **Nginx** | Upstreams, reverse proxy, SSL redirect, rate limiting |

---

### 🛡️ Security Analyzer
> **9 regras de segurança** analisam seu diagrama e retornam um score de 0–100 com grau A–F. Cada finding tem severidade, descrição e recomendação acionável.

<p align="center">
  <img src="./docs/screenshots/security-analyzer.png" alt="Security Analyzer" width="700" />
  <!-- 📸 SUBSTITUA: Screenshot mostrando score card com grau, badges de severidade e lista de findings -->
</p>

**Por que importa:** Encontre falhas de segurança no design *antes* de escrever uma linha de código.

---

### 💰 Cost Estimator
> Compare custos entre **AWS, Azure e GCP** em tempo real. Veja breakdown por componente e receba dicas de otimização.

<p align="center">
  <img src="./docs/screenshots/cost-estimator.png" alt="Cost Estimator" width="700" />
  <!-- 📸 SUBSTITUA: Screenshot mostrando 3 cards de providers com preços mensais e badge "MELHOR PREÇO" -->
</p>

**Por que importa:** Tome decisões de cloud informadas por números reais, não achismo.

---

### 📦 Template Gallery & 🕐 Version History
> **8 templates** pré-configurados (Three-Tier, Microsserviços, IoT, Serverless...) para começar em segundos. Auto-save a cada 30s com histórico completo e restore com um clique.

<p align="center">
  <img src="./docs/screenshots/templates-versions.png" alt="Templates e Versionamento" width="700" />
  <!-- 📸 SUBSTITUA: Screenshot split mostrando galeria de templates à esquerda e timeline de versões à direita -->
</p>

---

### ⌨️ Command Palette
> **Ctrl+K** abre uma paleta universal para navegar, executar ações e buscar — sem tirar as mãos do teclado.

---

## 🛠 Tech Stack

<table>
  <tr>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=react" width="36" /><br>
      <sub><b>React 18</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=ts" width="36" /><br>
      <sub><b>TypeScript</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=tailwind" width="36" /><br>
      <sub><b>Tailwind CSS</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=vite" width="36" /><br>
      <sub><b>Vite</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://avatars.githubusercontent.com/u/3791941?s=200&v=4" width="36" /><br>
      <sub><b>React Flow</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://user-images.githubusercontent.com/958486/218346783-72be5ae3-b953-4dd7-b239-788a882fdad6.svg" width="36" /><br>
      <sub><b>Zustand</b></sub>
    </td>
  </tr>
</table>

| Camada | Tecnologia | Propósito |
|--------|-----------|-----------|
| **UI** | React 18 + React Flow 11 | Canvas interativo com drag & drop |
| **Tipagem** | TypeScript (strict mode) | Zero `any`, type-safe de ponta a ponta |
| **Estilo** | Tailwind CSS 3.4 | Dark theme, utility-first, zero CSS custom |
| **Estado** | Zustand 4 | Stores leves com undo/redo |
| **Rotas** | React Router 6 | 8 rotas com nav shell |
| **Layout** | Dagre | Auto-layout de grafos |
| **Build** | Vite 5 | HMR instantâneo, build < 5s |

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9 (ou yarn / pnpm)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/SEU-USUARIO/RedesBuilder.git
cd RedesBuilder

# Instale as dependências
npm install
```

### Rodando

```bash
# Modo desenvolvimento (com HMR)
npm run dev

# Acesse em http://localhost:5173
```

### Build para produção

```bash
npm run build
npm run preview   # Preview do build em http://localhost:4173
```

---

## 📂 Estrutura do Projeto

```
src/
├── components/           # Componentes React reutilizáveis
│   ├── Canvas/           #   Canvas principal (React Flow)
│   ├── CommandPalette/   #   Ctrl+K — busca e ações
│   ├── Edges/            #   Arestas inteligentes
│   ├── Inspector/        #   Painel de propriedades
│   ├── Nodes/            #   20+ nós de dispositivos de rede
│   ├── Shell/            #   AppShell com nav global
│   ├── Sidebar/          #   Library de dispositivos
│   ├── Simulation/       #   Pacotes, console, inspetor
│   └── Terminal/         #   Emulador de CLI
├── data/                 # Catálogos de hardware e devices
├── engine/               # Motores: simulação, grafo, CLI, validação
│   ├── core/             #   Event bus, packet factory, scheduler
│   └── services/         #   ARP, ICMP, routing, switching
├── hooks/                # React hooks custom
├── pages/                # 8 páginas: Dashboard, Redes, Arch, CodeGen...
├── services/             # Serviços de negócio
│   ├── codegen/          #   5 geradores (Docker, K8s, Terraform, Nginx, README)
│   ├── cost/             #   Estimador multi-cloud (AWS/Azure/GCP)
│   ├── security/         #   Analyzer com 9 regras
│   └── versioning/       #   Auto-save + histórico
├── store/                # Zustand stores (network + arch)
├── types/                # TypeScript types (network, arch, platform, simulation)
└── utils/                # Utilitários (IP, MAC, auto-layout)
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma **issue** ou enviar um **pull request**.

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 👤 Autor

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/MunhozIago244.png" width="100" style="border-radius: 50%" alt="Foto do autor" />
      <br>
      <sub><b>Iago Augusto Munhoz</b></sub>
      <br>
      <a href="https://github.com/MunhozIago244">GitHub</a> ·
      <a href="https://linkedin.com/in/SEU-LINKEDIN">LinkedIn</a>
    </td>
  </tr>
</table>

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  <sub>Se este projeto te ajudou, considere dar uma ⭐ no repositório!</sub>
</p>
