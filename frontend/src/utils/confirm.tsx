import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function confirmAction(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const {
    title = 'Are you sure?',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
  } = options;

  return new Promise((resolve) => {
    const id = toast.custom((t) => (
      <div className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => { toast.dismiss(t); resolve(false); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { toast.dismiss(t); resolve(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  });
}
