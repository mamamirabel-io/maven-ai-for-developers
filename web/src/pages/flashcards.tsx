import { useFlashcards } from '@/hooks/use-flashcards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ArrowRight, 
  Shuffle 
} from 'lucide-react'

export default function FlashcardsPage() {
  const {
    currentWord,
    showTranslation,
    stats,
    loading,
    error,
    totalWords,
    currentIndex,
    recordAnswer,
    nextWord,
    previousWord,
    toggleTranslation,
    shuffleWords
  } = useFlashcards()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Words Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Add some words to start practicing!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const accuracyPercentage = stats?.accuracy_percentage || 0
  const totalAttempts = (stats?.total_correct || 0) + (stats?.total_incorrect || 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Flashcards</h1>
        <p className="text-gray-600">Practice your vocabulary with interactive flashcards</p>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Words</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_words_practiced || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Correct</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.total_correct || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Incorrect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.total_incorrect || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracyPercentage.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            Word {currentIndex + 1} of {totalWords}
          </span>
          <Button variant="outline" size="sm" onClick={shuffleWords}>
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
        </div>
        <Progress value={((currentIndex + 1) / totalWords) * 100} className="h-2" />
      </div>

      {/* Flashcard */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="min-h-[300px] flex flex-col items-center justify-center space-y-6">
            {/* Word */}
            <div className="text-center">
              <Badge variant="secondary" className="mb-4">Word</Badge>
              <h2 className="text-5xl font-bold mb-6">{currentWord.word}</h2>
            </div>

            {/* Translation */}
            <div className="text-center">
              {showTranslation ? (
                <>
                  <Badge variant="secondary" className="mb-4">Translation</Badge>
                  <p className="text-3xl text-gray-600">{currentWord.translation}</p>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={toggleTranslation}
                  className="mt-4"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show Translation
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button
          variant="outline"
          size="lg"
          onClick={() => recordAnswer(false)}
          className="h-16 border-red-200 hover:bg-red-50 hover:border-red-300"
          disabled={!showTranslation}
        >
          <XCircle className="h-6 w-6 mr-2 text-red-600" />
          <span className="text-lg">Incorrect</span>
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          onClick={() => recordAnswer(true)}
          className="h-16 border-green-200 hover:bg-green-50 hover:border-green-300"
          disabled={!showTranslation}
        >
          <CheckCircle2 className="h-6 w-6 mr-2 text-green-600" />
          <span className="text-lg">Correct</span>
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={previousWord}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button 
          variant="ghost" 
          onClick={toggleTranslation}
          size="sm"
        >
          {showTranslation ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show
            </>
          )}
        </Button>

        <Button variant="outline" onClick={nextWord}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Help Text */}
      {!showTranslation && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Click "Show Translation" to reveal the answer, then mark your response as correct or incorrect
        </div>
      )}

      {/* Overall Progress */}
      {totalAttempts > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>Your learning journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Accuracy Rate</span>
                  <span className="text-sm text-gray-600">{accuracyPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={accuracyPercentage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Correct Answers</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.total_correct || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Incorrect Answers</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.total_incorrect || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
