'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, X, Youtube, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface YouTubeVideosInputProps {
  videos: string[]
  onChange: (videos: string[]) => void
  disabled?: boolean
  className?: string
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null
  
  // Remove whitespace
  url = url.trim()
  
  // Patterns for different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  // If it's already just an ID (11 characters, alphanumeric, hyphens, underscores)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url
  }
  
  return null
}

// Validate YouTube URL
function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null
}

// Get embed URL from video ID
function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

// Get watch URL from video ID
function getWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

// Get thumbnail URL from video ID
function getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault'
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

export function YouTubeVideosInput({
  videos,
  onChange,
  disabled = false,
  className,
}: YouTubeVideosInputProps) {
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const { toast } = useToast()

  const handleAddVideo = () => {
    if (!newVideoUrl.trim()) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a YouTube URL',
        variant: 'destructive',
      })
      return
    }

    const videoId = extractYouTubeId(newVideoUrl)
    if (!videoId) {
      toast({
        title: 'Invalid YouTube URL',
        description: 'Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)',
        variant: 'destructive',
      })
      return
    }

    const watchUrl = getWatchUrl(videoId)
    
    // Check if video already exists
    if (videos.includes(watchUrl)) {
      toast({
        title: 'Duplicate video',
        description: 'This video is already in the list',
        variant: 'destructive',
      })
      return
    }

    onChange([...videos, watchUrl])
    setNewVideoUrl('')
    
    toast({
      title: 'Video added',
      description: 'YouTube video has been added successfully',
      variant: 'success',
    })
  }

  const handleRemoveVideo = (index: number) => {
    const newVideos = videos.filter((_, i) => i !== index)
    onChange(newVideos)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddVideo()
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)"
          value={newVideoUrl}
          onChange={(e) => setNewVideoUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAddVideo}
          disabled={disabled || !newVideoUrl.trim()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Video
        </Button>
      </div>

      {videos.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            YouTube Videos ({videos.length})
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((videoUrl, index) => {
              const videoId = extractYouTubeId(videoUrl)
              if (!videoId) return null

              return (
                <Card key={index} className="relative group border border-border rounded-lg overflow-hidden bg-muted/30">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={getThumbnailUrl(videoId, 'high')}
                      alt={`YouTube video ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to default thumbnail if high quality fails
                        (e.target as HTMLImageElement).src = getThumbnailUrl(videoId, 'default')
                      }}
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all duration-200">
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center cursor-pointer hover:bg-red-700 transition-colors">
                        <svg
                          className="w-8 h-8 text-white ml-1"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {/* Remove button */}
                    {!disabled && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveVideo(index)}
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove video"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {!disabled && (
                    <CardContent className="p-3">
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 w-fit"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in YouTube
                      </a>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {videos.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
          <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No YouTube videos added yet
          </p>
        </div>
      )}
    </div>
  )
}


