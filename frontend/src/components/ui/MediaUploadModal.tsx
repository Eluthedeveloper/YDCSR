import { useState, FormEvent, useEffect } from 'react';
import { Upload, Youtube, Link, Video, Image as ImageIcon } from 'lucide-react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { toLocalDateString } from '../../utils/dates';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  onSuccess: () => void;
}

type MediaType = 'photo' | 'video' | 'youtube';
type UploadTab = MediaType | 'drive';

export default function MediaUploadModal({ isOpen, onClose, defaultDate, onSuccess }: MediaUploadModalProps) {
  const { show } = useToast();
  const [tab, setTab] = useState<UploadTab>('photo');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
        dateTaken: defaultDate || toLocalDateString(new Date()),
    youtubeUrl: '',
    driveUrl: '',
  });

  useEffect(() => {
    if (isOpen) {
      setTab('photo');
      setSelectedFile(null);
      setForm({
        title: '',
        description: '',
    dateTaken: defaultDate || toLocalDateString(new Date()),
        youtubeUrl: '',
        driveUrl: '',
      });
    }
  }, [isOpen, defaultDate]);

  const switchMediaType = (type: UploadTab) => {
    setTab(type);
    setSelectedFile(null);
  };

  // Only stores the chosen file - nothing is uploaded until the user clicks Upload.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (tab === 'photo' && !file.type.startsWith('image/')) {
      show('Please select an image file', 'error');
      return;
    }
    if (tab === 'video' && !file.type.startsWith('video/')) {
      show('Please select a video file', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileSubmit = async () => {
    if (!selectedFile) {
      show('Please select a file first', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data: uploadData } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await api.post('/media', {
        type: tab === 'drive' ? 'photo' : tab,
        url: uploadData.data.url,
        title: form.title || selectedFile.name,
        description: form.description,
        dateTaken: form.dateTaken,
      });

      show(tab === 'photo' ? 'Photo uploaded successfully' : 'Video uploaded successfully', 'success');
      setSelectedFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDriveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.driveUrl.trim()) {
      show('Please paste a Google Drive link', 'error');
      return;
    }
    try {
      const parsed = new URL(form.driveUrl.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
    } catch {
      show('Please enter a valid link starting with http:// or https://', 'error');
      return;
    }

    setUploading(true);
    try {
      await api.post('/media', {
        type: 'photo',
        url: form.driveUrl.trim(),
        title: form.title,
        description: form.description,
        dateTaken: form.dateTaken,
      });
      show('Google Drive image added successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to add image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleYoutubeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.youtubeUrl) {
      show('Please enter a YouTube URL', 'error');
      return;
    }

    setUploading(true);
    try {
      await api.post('/media', {
        type: 'youtube',
        url: form.youtubeUrl,
        title: form.title,
        description: form.description,
        dateTaken: form.dateTaken,
      });

      show('YouTube video added successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to add video', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Photo / Video" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => switchMediaType('photo')}
            className={`py-2.5 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'photo'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Upload size={16} className="shrink-0" /> <span className="truncate">Upload Photo</span>
          </button>
          <button
            onClick={() => switchMediaType('video')}
            className={`py-2.5 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'video'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Video size={16} className="shrink-0" /> <span className="truncate">Upload Video</span>
          </button>
          <button
            onClick={() => switchMediaType('youtube')}
            className={`py-2.5 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'youtube'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Youtube size={16} className="shrink-0" /> <span className="truncate">YouTube Link</span>
          </button>
          <button
            onClick={() => switchMediaType('drive')}
            className={`py-2.5 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'drive'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <ImageIcon size={16} className="shrink-0" /> <span className="truncate">Drive Photo</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Enter title..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Enter description..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <DatePicker value={form.dateTaken} onChange={(v) => setForm(p => ({ ...p, dateTaken: v }))} />
          </div>

          {tab === 'photo' || tab === 'video' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {tab === 'photo' ? 'Select Photo' : 'Select Video'}
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                  <Upload size={24} className={selectedFile ? 'text-green-500 mb-2' : 'text-gray-400 mb-2'} />
                  {selectedFile ? (
                    <>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 truncate max-w-full">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">Click to choose a different file</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tab === 'photo' ? 'Click to select a photo' : 'Click to select a video'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{tab === 'photo' ? 'JPG, PNG, GIF, WebP' : 'MP4, WebM'}</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept={tab === 'photo' ? 'image/*' : 'video/*'}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          ) : tab === 'youtube' ? (
            <form onSubmit={handleYoutubeSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube URL</label>
                <div className="relative">
                  <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={form.youtubeUrl}
                    onChange={e => setForm(p => ({ ...p, youtubeUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2">
                  {uploading ? 'Adding...' : <><Youtube size={16} /> Add Video</>}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleDriveSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Drive Link</label>
                <div className="relative">
                  <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={form.driveUrl}
                    onChange={e => setForm(p => ({ ...p, driveUrl: e.target.value }))}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  In Google Drive, right-click the image → Share → "Anyone with the link", then paste the link here.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-2">
                  {uploading ? 'Adding...' : <><ImageIcon size={16} /> Add Image</>}
                </button>
              </div>
            </form>
          )}

          {(tab === 'photo' || tab === 'video') && (
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleFileSubmit}
                disabled={!selectedFile || uploading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading
                  ? 'Uploading...'
                  : <><Upload size={16} /> {tab === 'photo' ? 'Upload Photo' : 'Upload Video'}</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
