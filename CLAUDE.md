# CLAUDE.md - Guia de Colaboração para Agentes de IA

Este documento serve como referência para agentes de IA (Claude) e desenvolvedores que precisam de entendimento aprofundado da estrutura, convenções e processos deste projeto.

## 📂 Estrutura do Projeto

```
ai-beautify-comment/
├── manifest.json              # Configuração da extensão Chrome
├── background.js              # Service worker principal com lógica da API
├── content.js                # Script de conteúdo para interação com páginas
├── popup.html                # Interface do popup da extensão
├── popup.js                  # Lógica da interface do popup
├── popup.css                 # Estilos da interface
├── utils.js                  # Funções utilitárias e gerenciamento de configurações
├── icon.png                  # Ícone da extensão
├── version.json              # Informações de versão para updates automáticos
├── package.json              # Dependências e scripts de desenvolvimento
├── .eslintrc.js              # Configuração do ESLint
├── scripts/
│   ├── validate.js           # Script de validação da extensão
│   └── create-zip.js         # Script para criação do ZIP de distribuição
├── CHANGELOG.md              # Histórico de versões
├── README.md                 # Documentação principal
└── CLAUDE.md                 # Este arquivo
```

## ⚡ Scripts de Desenvolvimento Essenciais

### Scripts NPM Disponíveis
```bash
npm install           # Instala dependências do projeto
npm run lint         # Executa ESLint para verificar qualidade do código
npm run lint:fix     # Corrige automaticamente problemas de linting
npm run validate     # Validação completa da extensão
npm run syntax-check # Verificação básica de sintaxe JavaScript
npm run check        # Executa lint + validate (pré-commit essencial)
npm run zip          # Cria ZIP de distribuição após validação
npm test             # Executa syntax-check + lint
```

### Script de Validação (`npm run validate`)
O script `scripts/validate.js` verifica:
- ✅ Existência de todos os arquivos obrigatórios
- ✅ Estrutura e campos do manifest.json
- ✅ Consistência de versões entre manifest.json, version.json e package.json
- ✅ Sintaxe básica dos arquivos JavaScript
- ✅ Importação correta do utils.js no background.js

### Script de ZIP (`npm run zip`)
O script `scripts/create-zip.js` cria um ZIP de distribuição contendo apenas:
- Arquivos de produção necessários
- Exclui node_modules, .git, scripts de desenvolvimento
- Nomeia o arquivo como `ai-beautify-comment-v{version}.zip`

## ✅ Fluxo de Validação Obrigatório

Antes de qualquer commit ou release:

1. **Verificações Automáticas**:
   ```bash
   npm run check  # Deve passar sem erros
   ```

2. **Testes Manuais Essenciais**:
   - **AI Beautify**: Testar substituição in-place em campos editáveis
   - **AI Comment**: Testar geração de comentários com 1 e múltiplas respostas
   - **Detecção de Idioma**: Testar com português, inglês, espanhol
   - **Menu de Contexto**: Verificar hierarquia visual (Beautify → Separador → Comment)
   - **Configurações**: Testar configurações separadas para cada funcionalidade

3. **Validação de Distribuição**:
   ```bash
   npm run zip  # Cria ZIP e valida conteúdo
   ```

## 🧠 Arquitetura e Decisões de Design

### Principais Componentes

#### 1. background.js - Service Worker Principal
- **Função**: Lógica central da extensão, API calls, menu de contexto
- **APIs Utilizadas**: chrome.contextMenus, chrome.scripting, chrome.tabs
- **Responsabilidades**:
  - Criar e gerenciar menu de contexto
  - Processar seleções do usuário (AI Beautify vs AI Comment)
  - Comunicar com API do Gemini
  - Mostrar indicadores visuais de carregamento
  - Gerenciar múltiplas respostas

#### 2. content.js - Script de Conteúdo
- **Função**: Interação com páginas web, modal de seleção
- **Responsabilidades**:
  - Mostrar modals de múltiplas respostas
  - Implementar substituição de texto in-place (para AI Beautify)
  - Copiar para clipboard como fallback
  - Gerenciar notificações de sucesso/erro

#### 3. utils.js - Utilitários
- **Função**: Gerenciamento de configurações, prompts customizados
- **Responsabilidades**:
  - CRUD de custom prompts
  - Gerenciamento de configurações (responseCount, etc.)
  - Funções de validação de storage

### Filosofia de Design

#### Detecção de Idioma (v3.0.0)
- **Decisão Arquitetural**: Removida detecção manual JavaScript
- **Implementação**: Usa instrução "Respond in the same language as the input text"
- **Benefícios**: Mais preciso, menos código, melhor performance
- **Localização no código**: Todos os prompts em background.js

#### AI Beautify vs AI Comment
- **AI Beautify**: Melhora texto do usuário, substitui in-place quando possível
- **AI Comment**: Gera comentários sobre conteúdo, sempre copia para clipboard
- **Diferenciação**: Detectada via `promptName.includes('AI Text Beautifier')`

## 💡 Informações para Futuros Contextos

### Padrões de Código
- **Convenção de Strings**: Single quotes (automaticamente corrigido por ESLint)
- **Async/Await**: Preferido sobre Promises para legibilidade
- **Error Handling**: Usa tipos de erro padronizados em utils.js
- **Chrome APIs**: Sempre com fallbacks e verificação de `chrome.runtime.lastError`

### Configurações e Estado
- **Storage**: `chrome.storage.sync` para configurações do usuário
- **Estrutura de Settings**:
  ```javascript
  {
    apiKey: string,
    customPrompts: Array<CustomPrompt>,
    defaultResponseCount: number,
    defaultBeautifyResponseCount: number
  }
  ```

### Comunicação com Gemini API
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Método**: JSON com múltiplas tentativas para múltiplas respostas
- **Fallback**: Single API calls se JSON parsing falhar
- **Timeout**: 10 segundos com retry logic

### Performance e UX
- **Loading Indicators**: Visual com logo da extensão
- **Substituição In-Place**: Detecta elementos editáveis (input, textarea, contenteditable)
- **Fallback para Clipboard**: Quando substituição in-place não é possível
- **Notificações**: Sistema robusto com fallbacks para sites que bloqueiam

## 🚀 Comandos Úteis para Desenvolvimento

### Git e Versionamento
```bash
git status                     # Verificar estado do repositório
git add .                      # Adicionar todas as mudanças
git commit -m "mensagem"       # Commit com mensagem
git tag -a v3.0.0 -m "Release v3.0.0"  # Criar tag de versão
git push origin --tags         # Push das tags
```

### Desenvolvimento da Extensão
```bash
# Carregar no Chrome (modo desenvolvedor)
# 1. chrome://extensions/
# 2. Ativar "Modo do desenvolvedor"
# 3. "Carregar sem compactação" → selecionar pasta do projeto

# Recarregar após mudanças
# Clicar no ícone de reload na página de extensões
```

### Debugging
```bash
# Ver logs do background script
# chrome://extensions/ → clicar em "service worker" na extensão

# Ver logs do content script
# F12 → Console na página onde a extensão está ativa
```

## 🔧 Configurações Específicas

### ESLint (.eslintrc.js)
- **Ambiente**: Browser + WebExtensions
- **Globals**: chrome, importScripts
- **Override para scripts/**: Ambiente Node.js
- **Regras**: Single quotes, semicolons obrigatórios, warnings para variáveis não utilizadas

### Manifest V3 Específico
- **Service Worker**: background.js (não background page)
- **Permissions**: contextMenus, storage, clipboardWrite, scripting, notifications, alarms, activeTab
- **Host Permissions**: generativelanguage.googleapis.com para API calls

## 📊 Métricas e Validação

### Critérios de Qualidade
- **ESLint**: 0 erros (warnings permitidos)
- **Validation Script**: 100% pass
- **Manual Testing**: AI Beautify e AI Comment funcionando
- **Multi-language**: Testado em pelo menos 3 idiomas

### Processo de Release
1. `npm run check` ✅
2. Update de versões (manifest.json, version.json) ✅  
3. Commit de mudanças ✅
4. `git tag -a v{version}` ✅
5. `npm run zip` ✅
6. GitHub Release + ZIP upload ✅
7. `git push origin --tags` ✅

---

## 📝 Notas para Claude

### Context Awareness
- **Versão Atual**: 3.0.0 (major update com AI Beautify)
- **Branch Principal**: main/master
- **Última Major Feature**: AI Beautify com in-place text replacement
- **Última Refatoração**: Remoção de detecção manual de idioma

### Comandos Preferidos
- Sempre rodar `npm run check` antes de commits
- Usar `npm run lint:fix` para correções automáticas
- Testar manualmente após mudanças significativas
- Documentar breaking changes no CHANGELOG.md

### Debugging Comum
- **TypeScript errors**: Geralmente relacionados a declarações globais em background.js
- **API errors**: Verificar rate limits e formato do API key
- **Menu não aparece**: Verificar permissions e documentUrlPatterns
- **In-place replacement falha**: Normal em elementos não-editáveis, fallback para clipboard

Este documento deve ser atualizado sempre que houver mudanças arquiteturais significativas no projeto.