'use client'

import React, { useRef } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  height?: number
}

export function RichTextEditor({
  value = '',
  onChange,
  disabled = false,
  placeholder = '',
  className,
  height = 300,
}: RichTextEditorProps) {
  const quillRef = useRef<any>(null)

  // Quill toolbar configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'direction': 'rtl' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  }

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'script',
    'direction',
    'color', 'background',
    'align',
    'link', 'image', 'video'
  ]

  return (
    <div className={cn('rich-text-editor-wrapper', className)}>
      <style jsx global>{`
        .rich-text-editor-wrapper .quill {
          border: 1px solid hsl(var(--input));
          border-radius: 0.5rem;
          background: hsl(var(--background));
        }
        
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
          padding: 0.75rem;
        }
        
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          font-size: 0.875rem;
          min-height: ${height}px;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${height}px;
          color: hsl(var(--foreground));
        }
        
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        
        .rich-text-editor-wrapper .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        
        .rich-text-editor-wrapper .ql-fill {
          fill: hsl(var(--foreground));
        }
        
        .rich-text-editor-wrapper .ql-picker-label {
          color: hsl(var(--foreground));
        }
        
        .rich-text-editor-wrapper .ql-picker-options {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
        }
        
        .rich-text-editor-wrapper .ql-picker-item:hover {
          background: hsl(var(--accent));
        }
        
        .rich-text-editor-wrapper .ql-snow .ql-tooltip {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .rich-text-editor-wrapper .ql-snow .ql-tooltip input {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--input));
          color: hsl(var(--foreground));
        }
        
        .rich-text-editor-wrapper .ql-snow .ql-tooltip a {
          color: hsl(var(--primary));
        }
        
        .rich-text-editor-wrapper .ql-snow .ql-tooltip a:hover {
          color: hsl(var(--primary));
          opacity: 0.8;
        }
        
        /* Disabled state */
        .rich-text-editor-wrapper .quill.disabled .ql-toolbar {
          opacity: 0.5;
          pointer-events: none;
        }
        
        .rich-text-editor-wrapper .quill.disabled .ql-editor {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        /* Dark mode adjustments */
        .dark .rich-text-editor-wrapper .ql-toolbar {
          background: hsl(var(--muted));
        }
        
        .dark .rich-text-editor-wrapper .ql-container {
          background: hsl(var(--background));
        }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={disabled}
        className={cn(disabled && 'disabled')}
      />
    </div>
  )
}

