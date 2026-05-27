import { useRef } from 'react';
import { resizeToSquareDataUrl } from '../photo';

interface Props {
  hasPhoto: boolean;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}

/**
 * Hover-reveal photo management affordance for editor-mode seated students.
 * Appears as a small floating button group over the seat.
 */
export function PhotoUploadMenu({ hasPhoto, onUpload, onRemove }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeToSquareDataUrl(file);
      onUpload(dataUrl);
    } catch {
      alert('Could not process the image. Please try a JPEG, PNG, or WebP file.');
    }
    // Reset so the same file can be re-selected after a remove.
    e.target.value = '';
  }

  return (
    <div className="photo-menu">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="photo-menu__input"
        tabIndex={-1}
        onChange={handleFileChange}
        aria-label="Choose photo file"
      />
      <button
        type="button"
        className="photo-menu__btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        title={hasPhoto ? 'Replace photo' : 'Upload photo'}
        aria-label={hasPhoto ? 'Replace photo' : 'Upload photo'}
      >
        {hasPhoto ? '↺' : '📷'}
      </button>
      {hasPhoto && (
        <button
          type="button"
          className="photo-menu__btn photo-menu__btn--remove"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove photo"
          aria-label="Remove photo"
        >
          ✕
        </button>
      )}
    </div>
  );
}
