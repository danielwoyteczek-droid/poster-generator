'use client'

import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageDataUrl: string | null
  isLoading: boolean
  error: string | null
}

export function PosterFrameModal({ open, onOpenChange, imageDataUrl, isLoading, error }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
        <DialogTitle className="sr-only">Zimmeransicht</DialogTitle>
        <div className="bg-[#e8e4de] py-16 px-8 flex items-center justify-center min-h-[70vh]">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Vorschau wird erstellt…</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 max-w-sm">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {imageDataUrl && !isLoading && (
            <div className="relative shadow-[0_40px_80px_-20px_rgba(0,0,0,0.45)]">
              <div className="border-[14px] border-black bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Poster-Vorschau"
                  className="block max-h-[70vh] w-auto"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
