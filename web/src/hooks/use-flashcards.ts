/**
 * Flashcards Hook with Spaced Repetition System (SRS)
 * 
 * This hook implements the SM-2 algorithm for optimal flashcard review scheduling.
 * 
 * SRS Features:
 * - Automatically adjusts review intervals based on performance
 * - Prioritizes words that need more practice (due/overdue cards shown first)
 * - Uses ease factor (1.30-2.50+) to personalize learning intervals
 * - Resets struggling cards to reinforce learning
 * 
 * Algorithm:
 * - Incorrect answers (quality 0): Reset repetitions, decrease ease factor
 * - Correct answers (quality 4): Increase interval exponentially based on ease factor
 * - Initial intervals: 1 day, 6 days, then calculated based on ease factor
 * 
 * Card Priority:
 * 1. Due cards (next_review_date <= now) - needs immediate review
 * 2. New cards (never practiced) - ready to learn
 * 3. Future cards (scheduled for later) - already mastered recently
 */
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

  // Fetch words prioritized by SRS - due words first, then new words
  const fetchWords = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get all words
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('id, word, translation')
        .order('word')

      if (wordsError) throw wordsError

      // Get user's progress for all words
      const { data: progressData, error: progressError } = await supabase
        .from('flashcard_progress')
        .select('word_id, next_review_date, ease_factor, interval_days, repetitions')
        .eq('user_id', user.id)

      if (progressError) throw progressError

      // Create a map of word_id to progress
      const progressMap = new Map(
        (progressData || []).map(p => [p.word_id, p])
      )

      // Prioritize words: due for review > new words > future words
      const now = new Date().toISOString()
      const processedWords = (wordsData || []).map((word: any) => {
        const progress = progressMap.get(word.id)
        return {
          id: word.id,
          word: word.word,
          translation: word.translation,
          nextReview: progress?.next_review_date || now,
          isDue: !progress || new Date(progress.next_review_date) <= new Date(),
          isNew: !progress
        }
      })

      // Sort: due cards first, then new cards, then future cards
      processedWords.sort((a: any, b: any) => {
        if (a.isDue && !b.isDue) return -1
        if (!a.isDue && b.isDue) return 1
        if (a.isNew && !b.isNew) return -1
        if (!a.isNew && b.isNew) return 1
        return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
      })

      setWords(processedWords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch words')
      console.error('Fetch words error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

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

  // Record answer (correct or incorrect) with SRS algorithm
  const recordAnswer = useCallback(async (isCorrect: boolean) => {
    if (!user || !words[currentWordIndex]) return

    const wordId = words[currentWordIndex].id
    const quality = isCorrect ? 4 : 0 // SM-2 quality: 0 = failed, 4 = correct

    try {
      // Check if progress record exists
      const { data: existingProgress, error: progressError } = await supabase
        .from('flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('word_id', wordId)
        .maybeSingle()

      if (progressError) throw progressError

      if (existingProgress) {
        // Calculate new SRS values using the database function
        const { data: srsData, error: srsError } = await supabase
          .rpc('calculate_srs_interval', {
            p_ease_factor: existingProgress.ease_factor,
            p_interval_days: existingProgress.interval_days,
            p_repetitions: existingProgress.repetitions,
            p_quality: quality
          })

        if (srsError) {
          console.error('SRS calculation error:', srsError)
          throw srsError
        }

        if (!srsData || srsData.length === 0) {
          throw new Error('No SRS data returned from calculation')
        }

        const newSRS = srsData[0]

        // Update existing record with SRS values
        const { error } = await supabase
          .from('flashcard_progress')
          .update({
            correct_count: existingProgress.correct_count + (isCorrect ? 1 : 0),
            incorrect_count: existingProgress.incorrect_count + (isCorrect ? 0 : 1),
            ease_factor: newSRS.new_ease_factor,
            interval_days: newSRS.new_interval_days,
            repetitions: newSRS.new_repetitions,
            next_review_date: newSRS.new_next_review_date,
            last_practiced_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)

        if (error) throw error
      } else {
        // Calculate initial SRS values for new card
        const { data: srsData, error: srsError } = await supabase
          .rpc('calculate_srs_interval', {
            p_ease_factor: 2.5,
            p_interval_days: 0,
            p_repetitions: 0,
            p_quality: quality
          })

        if (srsError) {
          console.error('SRS calculation error:', srsError)
          throw srsError
        }

        if (!srsData || srsData.length === 0) {
          throw new Error('No SRS data returned from calculation')
        }

        const newSRS = srsData[0]

        // Create new record with SRS values
        const { error } = await supabase
          .from('flashcard_progress')
          .insert({
            user_id: user.id,
            word_id: wordId,
            correct_count: isCorrect ? 1 : 0,
            incorrect_count: isCorrect ? 0 : 1,
            ease_factor: newSRS.new_ease_factor,
            interval_days: newSRS.new_interval_days,
            repetitions: newSRS.new_repetitions,
            next_review_date: newSRS.new_next_review_date,
            last_practiced_at: new Date().toISOString()
          })

        if (error) throw error
      }

      // Refresh stats and words (to update due cards)
      await fetchStats()
      await fetchWords()

      // Move to next word
      nextWord()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record answer'
      setError(errorMessage)
      console.error('SRS error details:', err)
      alert(`Error: ${errorMessage}`) // Show error to user for debugging
    }
  }, [user, words, currentWordIndex, fetchStats, fetchWords, nextWord])

  useEffect(() => {
    if (user) {
      fetchWords()
      fetchStats()
    }
  }, [user, fetchWords, fetchStats])

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
