import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/UserContext'

export interface Word {
  id: string
  word: string
  translation: string
}

export interface FlashcardProgress {
  id?: string
  user_id: string
  word_id: string
  correct_count: number
  incorrect_count: number
  last_practiced_at: string
}

export interface FlashcardStats {
  total_words_practiced: number
  total_correct: number
  total_incorrect: number
  accuracy_percentage: number
}

export function useFlashcards() {
  const { user } = useUser()
  const [words, setWords] = useState<Word[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [showTranslation, setShowTranslation] = useState(false)
  const [stats, setStats] = useState<FlashcardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all words
  const fetchWords = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('words')
        .select('id, word, translation')
        .order('word')

      if (error) throw error
      setWords(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch words')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch user statistics
  const fetchStats = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('flashcard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setStats(data || {
        total_words_practiced: 0,
        total_correct: 0,
        total_incorrect: 0,
        accuracy_percentage: 0
      })
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [user])

  // Record answer (correct or incorrect)
  const recordAnswer = useCallback(async (isCorrect: boolean) => {
    if (!user || !words[currentWordIndex]) return

    const wordId = words[currentWordIndex].id

    try {
      // Check if progress record exists
      const { data: existingProgress } = await supabase
        .from('flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('word_id', wordId)
        .single()

      if (existingProgress) {
        // Update existing record
        const { error } = await supabase
          .from('flashcard_progress')
          .update({
            correct_count: existingProgress.correct_count + (isCorrect ? 1 : 0),
            incorrect_count: existingProgress.incorrect_count + (isCorrect ? 0 : 1),
            last_practiced_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)

        if (error) throw error
      } else {
        // Create new record
        const { error } = await supabase
          .from('flashcard_progress')
          .insert({
            user_id: user.id,
            word_id: wordId,
            correct_count: isCorrect ? 1 : 0,
            incorrect_count: isCorrect ? 0 : 1,
            last_practiced_at: new Date().toISOString()
          })

        if (error) throw error
      }

      // Refresh stats
      await fetchStats()

      // Move to next word
      nextWord()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record answer')
    }
  }, [user, words, currentWordIndex, fetchStats])

  // Navigate to next word
  const nextWord = useCallback(() => {
    setShowTranslation(false)
    setCurrentWordIndex((prev) => (prev + 1) % words.length)
  }, [words.length])

  // Navigate to previous word
  const previousWord = useCallback(() => {
    setShowTranslation(false)
    setCurrentWordIndex((prev) => (prev - 1 + words.length) % words.length)
  }, [words.length])

  // Toggle translation visibility
  const toggleTranslation = useCallback(() => {
    setShowTranslation((prev) => !prev)
  }, [])

  // Shuffle words
  const shuffleWords = useCallback(() => {
    setWords((prev) => [...prev].sort(() => Math.random() - 0.5))
    setCurrentWordIndex(0)
    setShowTranslation(false)
  }, [])

  useEffect(() => {
    fetchWords()
    fetchStats()
  }, [fetchWords, fetchStats])

  return {
    currentWord: words[currentWordIndex],
    showTranslation,
    stats,
    loading,
    error,
    totalWords: words.length,
    currentIndex: currentWordIndex,
    recordAnswer,
    nextWord,
    previousWord,
    toggleTranslation,
    shuffleWords
  }
}
