# Atelier · Guia de Instalação

## 1. Windows (`.exe` Instalador)
* **Arquivo do instalador:** `release\Atelier Setup 1.0.0.exe` (gerado com `npm run electron:build`)
* **Caminho na pasta:** `C:\Users\thiag\Documents\atlelie\Atelier\release\Atelier Setup 1.0.0.exe`

### Como instalar no computador/notebook:
1. Dê um duplo clique em **`Atelier Setup 1.0.0.exe`** (pode enviar esse arquivo para o notebook da Raquel por WhatsApp/Google Drive/pendrive).
2. Siga o instalador (*Avançar → Instalar*).
3. Ele cria automaticamente o atalho **Atelier** na Área de Trabalho e no Menu Iniciar.
4. Ao abrir, entre com a conta **Google** ou **E-mail e senha** — todos os dados ficam sincronizados na nuvem pelo Firebase.

---

## 2. Celular (Android / iPhone) via Firebase Hosting
Para instalar no celular como aplicativo na tela inicial:

1. No PowerShell, publique a versão web no Firebase Hosting:
   ```powershell
   cd C:\Users\thiag\Documents\atlelie\Atelier
   npx.cmd firebase-tools login
   npx.cmd firebase-tools deploy --only hosting
   ```
2. Abra o link gerado (**`https://atelier-649da.web.app`**) no celular:
   * **Android (Chrome):** menu `⋮` → **Instalar aplicativo**.
   * **iPhone (Safari):** botão **Compartilhar** → **Adicionar à Tela de Início**.
3. Faça login com a mesma conta para manter celular e computador sempre sincronizados.
