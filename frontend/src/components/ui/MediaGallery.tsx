import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Youtube, Image, Video, Trash2, Pencil } from 'lucide-react';
import { MediaItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface MediaGalleryProps {
  items: MediaItem[];
  onDelete?: (id: string) => void;
  onEdit?: (item: MediaItem) => void;
  readOnly?: boolean;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export function getYoutubeThumbnail(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

/** Extracts the file ID from any Google Drive share link format. */
export function getDriveFileId(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/,
    /lh\d\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

/**
 * Google Drive blocks some direct-link formats, so we keep a list of
 * candidate embed URLs and try them one by one until one loads.
 */
function driveImageCandidates(id: string): string[] {
  return [
    `https://lh3.googleusercontent.com/d/${id}=w1600`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
}

function DriveImage({ fileId, alt, className, originalUrl }: { fileId: string; alt: string; className: string; originalUrl?: string }) {
  const candidates = useMemo(() => driveImageCandidates(fileId), [fileId]);
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [fileId]);

  if (idx >= candidates.length) {
    return (
      <div className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500">
        <Image size={28} className="opacity-50" />
        <span className="text-xs">Preview unavailable</span>
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-primary-600 dark:text-primary-400 underline flex items-center gap-1"
          >
            Open in Drive <ExternalLink size={11} />
          </a>
        )}
      </div>
    );
  }

  return (
    <img
      src={candidates[idx]}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setIdx(i => i + 1)}
    />
  );
}

export default function MediaGallery({ items, onDelete, onEdit, readOnly }: MediaGalleryProps) {
  const { hasRole, user } = useAuth();
  const canDeleteItem = (item: MediaItem) => !readOnly && hasRole('admin');
  const canEditItem = (item: MediaItem) =>
    !readOnly && (hasRole('admin', 'radio_assistant') || (hasRole('data_entry') && item.createdBy === user?.id));
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'videos'>('all');

  const filtered = filter === 'all'
    ? items
    : filter === 'videos'
      ? items.filter(i => i.type === 'video' || i.type === 'youtube')
      : items.filter(i => i.type === filter);

  // Navigate the opened image/video with the keyboard: <- -> to move, Esc to close.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'VIDEO' || tag === 'IFRAME') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLightboxIndex(i => (i !== null && i < filtered.length - 1 ? i + 1 : i));
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, filtered.length]);

  // Lock the background page while the viewer is open so only the
  // description/media scrolls - no more double-scrolling overlap.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [lightboxIndex]);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Image size={48} className="mx-auto mb-2 opacity-30" />
        <p>No media available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {([['all', 'All'], ['photo', 'Images'], ['videos', 'Videos']] as const).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((item, index) => (
          <div
            key={item.id}
            className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setLightboxIndex(index)}
          >
            {item.type === 'photo' ? (
              <div className="aspect-video bg-gray-100 dark:bg-gray-700">
                {getDriveFileId(item.url) ? (
                  <DriveImage
                    fileId={getDriveFileId(item.url)!}
                    alt={item.title || ''}
                    originalUrl={item.url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={item.url} alt={item.title || ''} className="w-full h-full object-cover" />
                )}
              </div>
            ) : item.type === 'youtube' ? (
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative flex items-center justify-center">
                <img
                  src={item.thumbnailUrl || getYoutubeThumbnail(item.url) || ''}
                  alt={item.title || ''}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Youtube size={24} className="text-white ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative flex items-center justify-center">
                <Video size={48} className="text-gray-400" />
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Video</span>
              </div>
            )}

            <div className="p-3">
              {item.title && <p className="font-medium text-base text-gray-900 dark:text-white truncate">{item.title}</p>}
              {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap break-words">{item.description}</p>}
              {item.dateTaken && (
                <p className="text-xs text-gray-400 mt-1.5">{new Date(item.dateTaken).toLocaleDateString()}</p>
              )}
            </div>

            {(canDeleteItem(item) || canEditItem(item)) && (
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                {canEditItem(item) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
                    className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {canDeleteItem(item) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="absolute top-2 left-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                item.type === 'photo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              }`}>
                {item.type === 'photo' ? <Image size={12} /> : <Video size={12} />}
                {item.type === 'photo' ? 'Image' : 'Video'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
          >
            <X size={32} />
          </button>

          <div className="absolute top-5 left-5 z-10 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {filtered.length}
          </div>

          {(() => {
            const item = filtered[lightboxIndex];
            return (
              <div className="w-full max-w-4xl my-12 sm:my-10" onClick={(e) => e.stopPropagation()}>
                {item.type === 'photo' ? (
                  getDriveFileId(item.url) ? (
                    <DriveImage
                      fileId={getDriveFileId(item.url)!}
                      alt={item.title || ''}
                      originalUrl={item.url}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg mx-auto"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title || ''}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg mx-auto"
                    />
                  )
                ) : item.type === 'youtube' ? (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={getYoutubeEmbedUrl(item.url) || ''}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video src={item.url} controls className="max-w-full max-h-[70vh] rounded-lg mx-auto" />
                )}

                {(item.title || item.description || item.dateTaken) && (
                  <div className="mt-3 bg-black/60 text-white px-4 py-3 rounded-lg max-h-60 overflow-y-auto">
                    {item.title && <p className="font-semibold text-lg">{item.title}</p>}
                    {item.description && (
                      <p className="text-white/90 text-base mt-2 leading-relaxed whitespace-pre-wrap break-words">{item.description}</p>
                    )}
                    {item.dateTaken && (
                      <p className="text-white/70 text-sm mt-2">{new Date(item.dateTaken).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Previous (←)"
            >
              <ChevronLeft size={28} className="sm:hidden" />
              <ChevronLeft size={40} className="hidden sm:block" />
            </button>
          )}
          {lightboxIndex < filtered.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Next (→)"
            >
              <ChevronRight size={28} className="sm:hidden" />
              <ChevronRight size={40} className="hidden sm:block" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
