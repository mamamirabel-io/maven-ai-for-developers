import { useWords } from '@/hooks/use-words'
import { useState } from 'react'
import { translateWord, type TranslationResponse } from '@/lib/ai-service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function WordsPage() {
  const {
    words,
    loading,
    currentPage,
    totalPages,
    totalCount,
    goToNextPage,
    goToPreviousPage,
    refresh,
  } = useWords()

  const [newWord, setNewWord] = useState('')
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState<TranslationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTranslate = async () => {
    if (!newWord.trim()) return

    setTranslating(true)
    setError(null)
    setTranslation(null)

    try {
      const result = await translateWord(newWord)
      setTranslation(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to translate word')
    } finally {
      setTranslating(false)
    }
  }

  const handleAddWord = () => {
    // For now, just refresh the list and clear the form
    // In a full implementation, you'd save the translation to the database
    setNewWord('')
    setTranslation(null)
    refresh()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Add Word Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Word</CardTitle>
          <CardDescription>
            Enter a word to get AI-powered translation suggestions with context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a word (e.g., 'hello')"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
              disabled={translating}
            />
            <Button onClick={handleTranslate} disabled={!newWord.trim() || translating}>
              {translating ? 'Translating...' : 'Get Translation'}
            </Button>
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          {translation && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <span>{translation.source_language}</span>
                  <span>→</span>
                  <span>{translation.target_language}</span>
                </div>
                <h3 className="font-semibold mb-2">Translation</h3>
                <p className="text-2xl font-bold">{translation.primary_translation}</p>
              </div>

              {translation.alternative_translations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Alternatives</h4>
                  <div className="flex flex-wrap gap-2">
                    {translation.alternative_translations.map((alt, idx) => (
                      <Badge key={idx} variant="secondary">{alt}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {translation.examples.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Examples</h4>
                  <div className="space-y-2">
                    {translation.examples.map((example, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium">{example.sentence}</p>
                        <p className="text-muted-foreground">{example.translation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {translation.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{translation.notes}</p>
                </div>
              )}

              <Button onClick={handleAddWord} className="w-full">
                Add Word to Collection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Words List Section */}
      <Card>
        <CardHeader>
          <CardTitle>Words</CardTitle>
          <CardDescription>
            All words from the database (showing {words.length} of {totalCount} words)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading words...</p>
            </div>
          ) : words.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No words found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Word</TableHead>
                      <TableHead className="text-right">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {words.map((word) => (
                      <TableRow key={word.id}>
                        <TableCell className="font-mono text-xs">
                          {word.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">{word.word}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(word.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
