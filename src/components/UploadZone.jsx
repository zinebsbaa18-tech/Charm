import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

export default function UploadZone({ onFile, preview }) {
  const { t } = useTranslation();

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onloadend = () => onFile(file, reader.result);
      reader.readAsDataURL(file);
    }
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      id="upload-zone"
      className={`upload-zone relative rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'active' : ''} ${preview ? 'p-4' : ''}`}
    >
      <input {...getInputProps()} id="upload-input" />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Uploaded garment"
            className="max-h-80 mx-auto rounded-2xl object-contain shadow-card"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-on-surface/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-surface rounded-full px-5 py-2.5 flex items-center gap-2 text-label-lg text-on-surface font-semibold shadow-soft">
              <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
              Change Photo
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-center gap-5 py-8 transition-transform duration-300 ${isDragActive ? 'scale-105' : ''}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isDragActive ? 'bg-primary/10' : 'bg-surface-container'}`}>
            <span className={`material-symbols-outlined text-5xl transition-colors ${isDragActive ? 'text-primary' : 'text-on-surface-variant'}`}>
              {isDragActive ? 'download' : 'cloud_upload'}
            </span>
          </div>
          <div>
            <p className="text-headline-sm font-body font-semibold text-on-surface mb-2">
              {isDragActive ? '✨ Drop it here!' : t('home.uploadTitle')}
            </p>
            <p className="text-body-md text-on-surface-variant mb-1">{t('home.uploadDesc')}</p>
            <p className="text-label-xs text-on-surface-variant/70">{t('home.uploadHint')}</p>
          </div>
          <button
            type="button"
            className="btn-secondary text-sm px-6 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="material-symbols-outlined text-[18px] me-1 align-middle">folder_open</span>
            Browse Files
          </button>
        </div>
      )}
    </div>
  );
}
