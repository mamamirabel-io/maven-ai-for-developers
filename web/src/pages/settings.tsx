import { useState, useEffect } from 'react'
import { useSettings } from '@/hooks/use-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Chinese',
  'Arabic',
  'Hindi',
  'Turkish',
  'Dutch',
  'Polish',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Greek',
]

export default function SettingsPage() {
  const { profile, loading, saving, updateLanguagePreferences } = useSettings()
  const [nativeLanguage, setNativeLanguage] = useState('English')
  const [targetLanguage, setTargetLanguage] = useState('Spanish')

  useEffect(() => {
    if (profile) {
      setNativeLanguage(profile.native_language || 'English')
      setTargetLanguage(profile.target_language || 'Spanish')
    }
  }, [profile])

  const handleSave = async () => {
    try {
      await updateLanguagePreferences({
        native_language: nativeLanguage,
        target_language: targetLanguage,
      })
      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your language learning preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="native-language">Native Language</Label>
            <Select
              value={nativeLanguage}
              onValueChange={setNativeLanguage}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your native language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The language you speak fluently
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-language">Target Language</Label>
            <Select
              value={targetLanguage}
              onValueChange={setTargetLanguage}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your target language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The language you're learning
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
