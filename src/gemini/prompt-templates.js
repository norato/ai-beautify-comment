// Prompt Templates Service
// Centraliza todas as configurações de prompts para o Gemini API

console.log('[🤖] AI Beautify Comment - Loading Prompt Templates Service');

/**
 * @typedef {Object} PromptConfig
 * @property {string} name - Nome descritivo do prompt
 * @property {string} promptText - Texto base do prompt para a API
 * @property {number} responseCount - Número padrão de respostas esperadas
 */

// =============================================================================
// CONFIGURAÇÕES PADRÃO
// =============================================================================

/**
 * Valores padrão para contagem de respostas.
 * Estes valores são usados como fallback quando não especificado pelo usuário.
 */
const DEFAULT_RESPONSE_COUNTS = {
  COMMENT: 3,      // Para AI Comment (padrão)
  BEAUTIFY: 1,     // Para AI Beautify (sempre 1 resposta)
  CUSTOM: 2        // Para prompts customizados (fallback)
};

// =============================================================================
// PROMPTS ESTÁTICOS - CONFIGURAÇÕES PRINCIPAIS
// =============================================================================

/**
 * Prompt padrão para gerar comentários profissionais.
 * Usado na funcionalidade 'AI Comment' (generateProfessionalComment).
 * 
 * Características:
 * - Gera comentários pensativos e profissionais
 * - Adiciona insights significativos à discussão
 * - Faz perguntas quando apropriado
 * - Responde no mesmo idioma do texto de entrada
 * 
 * @type {PromptConfig}
 */
const DEFAULT_PROFESSIONAL_COMMENT_PROMPT = {
  name: 'Default Professional Comment',
  promptText: 'Generate thoughtful, professional comments that add meaningful insights or perspectives to the discussion. Ask thoughtful questions when appropriate and share relevant experiences when fitting. Respond in the same language as the input text.',
  responseCount: DEFAULT_RESPONSE_COUNTS.COMMENT
};

/**
 * Prompt para melhorar e aprimorar textos existentes.
 * Usado na funcionalidade 'AI Beautify' (beautifyText).
 * 
 * Características:
 * - Melhora a clareza e profissionalismo do texto
 * - Mantém o significado e intenção originais
 * - Corrige gramática e melhora legibilidade
 * - Não adiciona informações novas
 * - Responde no mesmo idioma do texto de entrada
 * 
 * @type {PromptConfig}
 */
const BEAUTIFY_TEXT_PROMPT = {
  name: 'AI Text Beautifier',
  promptText: 'Improve and enhance the following text while maintaining its core message and intent. Make it more professional, clear, and engaging. Keep the same tone and style but polish the language, fix any grammar issues, and enhance readability. Do not change the fundamental meaning or add new information. Respond in the same language as the input text.',
  responseCount: DEFAULT_RESPONSE_COUNTS.BEAUTIFY
};

// =============================================================================
// PROMPTS DINÂMICOS - TEMPLATES E FUNÇÕES
// =============================================================================

/**
 * Template base para prompts JSON customizados.
 * Usado para gerar múltiplas sugestões baseadas em prompts personalizados do usuário.
 * 
 * Estrutura:
 * - Regras rígidas de formatação JSON
 * - Incorpora texto do prompt customizado
 * - Gera número específico de respostas
 * - Inclui diretrizes de qualidade e formatação
 */
const CUSTOM_JSON_PROMPT_TEMPLATE = {
  /**
   * Seção de instruções principais
   */
  header: (numResponses) => `You are a thoughtful professional. Generate ${numResponses} unique comment suggestions for the following content.`,
  
  /**
   * Regras rigorosas de formatação JSON
   */
  formattingRules: (numResponses) => `STRICT FORMATTING RULES:
- Respond ONLY with a valid JSON object
- The JSON object must have a single key called "sugestoes"
- The value of "sugestoes" must be an array of ${numResponses} strings
- Each string must be a unique, professional comment
- Do not include any explanation, markdown, or additional text
- Do not wrap in \`\`\`json blocks`,

  /**
   * Diretrizes de qualidade para as respostas
   */
  responseGuidelines: `RESPONSE GUIDELINES:
- Keep responses concise (2-3 sentences maximum)
- Be specific, add value, and keep it authentic
- Make each suggestion unique and different from the others
- Maintain a professional yet personable tone`,
  
  /**
   * Gera exemplo de estrutura JSON
   */
  jsonExample: (numResponses) => {
    const examples = [];
    for (let i = 1; i <= numResponses; i++) {
      examples.push(`    "Sugestão de comentário única ${i} aqui"`);
    }
    
    return `Example format for ${numResponses} responses:
{
  "sugestoes": [
${examples.join(',\n')}
  ]
}`;
  }
};

// =============================================================================
// FUNÇÕES PÚBLICAS - API DO SERVIÇO
// =============================================================================

/**
 * Retorna a configuração do prompt padrão para comentários profissionais.
 * 
 * @param {number} [responseCount] - Número customizado de respostas (opcional)
 * @returns {PromptConfig} Configuração do prompt default
 */
function getDefaultCommentPrompt(responseCount = null) {
  return {
    ...DEFAULT_PROFESSIONAL_COMMENT_PROMPT,
    responseCount: responseCount || DEFAULT_PROFESSIONAL_COMMENT_PROMPT.responseCount
  };
}

/**
 * Retorna a configuração do prompt para beautificação de texto.
 * 
 * @param {number} [responseCount] - Número customizado de respostas (opcional, normalmente 1)
 * @returns {PromptConfig} Configuração do prompt beautify
 */
function getBeautifyPrompt(responseCount = null) {
  return {
    ...BEAUTIFY_TEXT_PROMPT,
    responseCount: responseCount || BEAUTIFY_TEXT_PROMPT.responseCount
  };
}

/**
 * Gera um prompt JSON completo para prompts customizados.
 * Combina template base com conteúdo específico do usuário.
 * 
 * @param {number} numResponses - Número de sugestões desejadas
 * @param {string} customPromptText - Texto do prompt personalizado do usuário
 * @param {string} selectedText - Texto selecionado pelo usuário para processar
 * @returns {string} Prompt completo formatado para API do Gemini
 */
function generateCustomJsonPrompt(numResponses, customPromptText, selectedText) {
  console.log(`[🤖] AI Beautify Comment - Generating custom JSON prompt for ${numResponses} responses`);
  
  // Validação de entrada
  if (!customPromptText || !selectedText) {
    throw new Error('customPromptText and selectedText are required for custom JSON prompt');
  }
  
  if (numResponses < 1 || numResponses > 5) {
    console.warn(`[🤖] AI Beautify Comment - Unusual response count: ${numResponses}. Recommended: 1-5`);
  }
  
  // Monta o prompt completo
  const prompt = [
    CUSTOM_JSON_PROMPT_TEMPLATE.header(numResponses),
    '',
    CUSTOM_JSON_PROMPT_TEMPLATE.formattingRules(numResponses),
    '',
    'CONTENT GUIDELINES:',
    customPromptText,
    '',
    CUSTOM_JSON_PROMPT_TEMPLATE.responseGuidelines,
    '',
    `CONTENT: "${selectedText}"`,
    '',
    CUSTOM_JSON_PROMPT_TEMPLATE.jsonExample(numResponses)
  ].join('\n');
  
  console.log(`[🤖] AI Beautify Comment - Custom JSON prompt generated, length: ${prompt.length} characters`);
  return prompt;
}

/**
 * Retorna informações sobre todos os prompts disponíveis.
 * Útil para debug e documentação.
 * 
 * @returns {Object} Metadados dos prompts disponíveis
 */
function getPromptMetadata() {
  return {
    defaultComment: {
      name: DEFAULT_PROFESSIONAL_COMMENT_PROMPT.name,
      responseCount: DEFAULT_PROFESSIONAL_COMMENT_PROMPT.responseCount,
      type: 'static',
      description: 'Prompt padrão para comentários profissionais'
    },
    beautify: {
      name: BEAUTIFY_TEXT_PROMPT.name,
      responseCount: BEAUTIFY_TEXT_PROMPT.responseCount,
      type: 'static',
      description: 'Prompt para melhoramento de texto'
    },
    customJson: {
      name: 'Custom JSON Prompt',
      responseCount: 'variable',
      type: 'dynamic',
      description: 'Template para prompts personalizados com múltiplas respostas'
    },
    defaultCounts: DEFAULT_RESPONSE_COUNTS
  };
}

// =============================================================================
// EXPORT PARA USO EM CHROME EXTENSION (SERVICE WORKER)
// =============================================================================

// Export para contexto de service worker do Chrome
if (typeof globalThis !== 'undefined') {
  globalThis.PromptTemplates = {
    getDefaultCommentPrompt,
    getBeautifyPrompt,
    generateCustomJsonPrompt,
    getPromptMetadata
  };
  
  console.log('[🤖] AI Beautify Comment - Prompt Templates Service loaded and exported to globalThis');
}

// Export para Chrome extension - usa apenas globalThis para service worker context