'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Copy, CheckCircle, AlertCircle, Video } from 'lucide-react'

export default function MuxSetupGuide() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text)
    setCopiedStep(step)
    setTimeout(() => setCopiedStep(null), 2000)
  }

  const envTemplate = `# Add these to your .env.local file
MUX_TOKEN_ID=your_access_token_id_here
MUX_TOKEN_SECRET=your_secret_key_here
MUX_WEBHOOK_SECRET=your_webhook_secret_here`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Mux Integration Setup Guide
        </CardTitle>
        <CardDescription>
          Follow these steps to connect your Mux account and start streaming videos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1 */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Step 1</Badge>
            <h3 className="font-medium">Get Your Mux API Credentials</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p>1. Go to your <a href="https://dashboard.mux.com/settings/access-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
              Mux Dashboard → Settings → Access Tokens <ExternalLink className="h-3 w-3" />
            </a></p>
            <p>2. Click "Generate new token"</p>
            <p>3. Select these permissions:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">Mux Video</code> - Full Access</li>
              <li><code className="bg-gray-100 px-1 rounded">Mux Data</code> - Read (optional)</li>
            </ul>
            <p>4. Copy your <strong>Access Token ID</strong> and <strong>Secret Key</strong></p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Step 2</Badge>
            <h3 className="font-medium">Add Credentials to Environment</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p>Add these environment variables to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file:</p>
            <div className="relative">
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {envTemplate}
              </pre>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(envTemplate, 2)}
              >
                {copiedStep === 2 ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Step 3</Badge>
            <h3 className="font-medium">Get Your Mux Asset ID</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p>1. Go to your <a href="https://dashboard.mux.com/video/assets" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
              Mux Dashboard → Assets <ExternalLink className="h-3 w-3" />
            </a></p>
            <p>2. Find the video you uploaded</p>
            <p>3. Copy the <strong>Asset ID</strong> (it looks like: <code className="bg-gray-100 px-1 rounded">abcd1234efgh5678</code>)</p>
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-800 text-xs">
                Make sure your video status shows as "Ready" in the Mux dashboard before using it.
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Step 4</Badge>
            <h3 className="font-medium">Create Video in System</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p>1. Restart your development server after adding environment variables</p>
            <p>2. Use the "Add Video" button above to create a new video</p>
            <p>3. Enter your video details and paste the Mux Asset ID</p>
            <p>4. The system will automatically fetch video duration and playback ID from Mux</p>
          </div>
        </div>

        {/* Restart Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <h4 className="font-medium text-yellow-800">Important</h4>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            After adding your environment variables, restart your development server with <code className="bg-yellow-100 px-1 rounded">npm run dev</code> for the changes to take effect.
          </p>
        </div>

        {/* Quick Links */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Quick Links</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://dashboard.mux.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Mux Dashboard
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://docs.mux.com/guides/video/upload-files-directly" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Upload Guide
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://docs.mux.com/api-reference/video#assets" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                API Docs
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}