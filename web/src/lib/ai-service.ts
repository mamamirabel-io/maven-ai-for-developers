import { supabase } from './supabase'

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'

export interface RandomPhraseResponse {
  phrase: string
  words_used: string[]
}

export interface ExampleSentence {
  sentence: string
  translation: string
}

export interface TranslationResponse {
  word: string
  source_language: string
  target_language: string
  primary_translation: string
  alternative_translations: string[]
  examples: ExampleSentence[]
  notes: string
}

/**
 * Generate a random phrase using the AI service
 * @param words - Array of words to use in the phrase
 * @returns Promise with the generated phrase and words used
 */
export async function generateRandomPhrase(words: string[]): Promise<RandomPhraseResponse> {
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to generate phrases')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/random-phrase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ words }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to generate phrase: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Translate a word with context and examples using the AI service
 * @param word - The word to translate
 * @param sourceLanguage - Source language (optional, uses user preference if not provided)
 * @param targetLanguage - Target language (optional, uses user preference if not provided)
 * @returns Promise with translation, examples, and notes
 */
export async function translateWord(
  word: string,
  sourceLanguage?: string,
  targetLanguage?: string
): Promise<TranslationResponse> {
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to translate words')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      word,
      ...(sourceLanguage && { source_language: sourceLanguage }),
      ...(targetLanguage && { target_language: targetLanguage }),
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to translate word: ${response.statusText}`)
  }

  return response.json()
}
