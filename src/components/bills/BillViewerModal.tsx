import React, { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink, Trash2, Plus, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { imageStorageService } from '../../services/imageStorageService';

export const BillViewerModal: React.FC = () => {
  const { activeModal, closeModal, selectedBill, expenses, openModal, settings } = useApp();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;
    setImageError(false);
    if (selectedBill) {
      setZoomLevel(1);
      if (selectedBill.imageData) {
        setImageSrc(selectedBill.imageData);
      } else {
        imageStorageService.getImage(selectedBill.id).then((data) => {
          if (isMounted) setImageSrc(data);
        });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [selectedBill]);

  if (activeModal !== 'bill-viewer' || !selectedBill) return null;

  const relatedExpense = expenses.find((e) => e.id === selectedBill.expenseId || e.billId === selectedBill.id);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleOpenExpense = () => {
    if (relatedExpense) {
      openModal('expense-detail', relatedExpense);
    }
  };

  const handleOpenDeleteConfirm = () => {
    openModal('delete-bill-confirm', selectedBill);
  };

  return (
    <Modal
      isOpen={activeModal === 'bill-viewer'}
      onClose={closeModal}
      title={selectedBill.storeName || selectedBill.fileName}
      subtitle={`Uploaded on ${new Date(selectedBill.uploadedAt).toLocaleDateString()}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {relatedExpense ? (
              <button
                onClick={handleOpenExpense}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-950 rounded-lg hover:bg-brand-200 dark:hover:bg-brand-900 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Related Expense</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  closeModal();
                  openModal('add-expense');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Related Expense</span>
              </button>
            )}
            <button
              onClick={handleOpenDeleteConfirm}
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
              title="Delete Bill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zoomable Image View Container */}
        <div className="relative h-[65vh] w-full rounded-2xl bg-slate-950 overflow-auto flex items-center justify-center p-4 border border-slate-800 shadow-inner">
          {imageSrc && !imageError ? (
            <div className="transition-transform duration-200 origin-center" style={{ transform: `scale(${zoomLevel})` }}>
              <img
                src={imageSrc}
                alt={selectedBill.storeName || 'Bill receipt'}
                onError={() => setImageError(true)}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : (
            <div className="text-center text-slate-400 p-6 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-300">
                {imageError ? 'Receipt image unavailable' : 'Loading receipt image...'}
              </p>
              {imageError && (
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  This image was uploaded before permanent storage was enabled. You can safely delete this bill or link an expense to it.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
          <span>File: {selectedBill.fileName}</span>
          <span>
            Total:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {settings.currency}{(selectedBill.totalAmount || 0).toLocaleString('en-IN')}
            </strong>
          </span>
        </div>
      </div>
    </Modal>
  );
};
