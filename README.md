Atelier · Guia de Instalação
1. Windows (.exe Instalador)
Arquivo do instalador: Atelier Setup 1.0.0.exe
Caminho na pasta: C:\Users\thiagosilva\Documents\Atelier\Atelier\release\Atelier Setup 1.0.0.exe
Como instalar no computador/notebook:
Dê um duplo clique em Atelier Setup 1.0.0.exe (pode enviar esse arquivo para o notebook da Raquel por WhatsApp/Google Drive/pendrive).
Siga o instalador (Avançar → Instalar).
Ele cria automaticamente o atalho Atelier na Área de Trabalho e no Menu Iniciar.
Ao abrir, entre com a conta Google ou E-mail e senha — todos os dados ficam sincronizados na nuvem pelo Firebase.
2. Celular (Android / iPhone) via Firebase Hosting
Para instalar no celular como aplicativo na tela inicial:

No PowerShell, publique a versão web no Firebase Hosting:
cd C:\Users\thiagosilva\Documents\Atelier\Atelier
npx.cmd firebase-tools login
npx.cmd firebase-tools deploy --only hosting
Abra o link gerado (https://atelier-649da.web.app) no celular:
Android (Chrome): menu ⋮ → Instalar aplicativo.
iPhone (Safari): botão Compartilhar → Adicionar à Tela de Início.
Faça login com a mesma conta para manter celular e computador sempre sincronizados.
