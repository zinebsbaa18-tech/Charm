import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';

export default function ChatInput({ onSend, onUpload, isCentered }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files.length > 0) onUpload(files[0]);
    },
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    noClick: true,
    noKeyboard: true
  });

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div {...getRootProps()} className={isCentered 
      ? "w-full relative" 
      : "p-4 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/30 sticky bottom-0 z-30"
    }>
      <input {...getInputProps()} id="chat-dropzone-input" />
      
      {isDragActive && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-40 rounded-t-3xl flex items-center justify-center border-t-2 border-primary border-dashed">
          <p className="text-primary font-semibold text-label-lg flex items-center gap-2">
            <span className="material-symbols-outlined">download</span> Drop image to upload
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto flex items-end gap-3 bg-surface-container-low rounded-[2rem] p-2 border border-outline-variant/50 focus-within:border-primary/50 focus-within:bg-surface-container-lowest transition-all shadow-sm">
        
        {/* Upload Button */}
        <label className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-variant text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer flex-shrink-0">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files.length > 0) onUpload(e.target.files[0]);
            }} 
          />
          <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
        </label>

        {/* Text Area */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about styling, or upload a garment..."
          className="flex-1 bg-transparent border-0 outline-none resize-none py-3 px-2 text-body-md text-on-surface placeholder-on-surface-variant/60 max-h-32 min-h-[48px]"
          rows={1}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            text.trim() 
              ? 'bg-mustard text-on-surface hover:brightness-105 shadow-soft active:scale-95' 
              : 'bg-surface-variant text-on-surface-variant/50 cursor-not-allowed'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">send</span>
        </button>
      </div>
    </div>
  );
}
