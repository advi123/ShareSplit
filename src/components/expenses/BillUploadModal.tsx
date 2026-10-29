import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import {
  Upload,
  CheckCircle2,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Cpu,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory, ItemizedExpenseItem, Expense, Bill } from '../../types';
import { getTodayStr } from '../../utils/dateUtils';
import { preprocessReceiptImage, compressImageForAI } from '../../utils/imagePreprocess';
import { apiService } from '../../services/apiService';

function cleanPriceString(str: string): number {
  if (!str) return 0;
  // Clean currency symbols and delimiters
  const clean = str.replace(/[₹$€£Rs\.\/]/gi, '').trim();

  // 1. Explicit decimal pattern: e.g. 150.00, 24.50, 46.0
  const decimalMatch = str.match(/(\d+)[.,](\d{1,2})\b/);
  if (decimalMatch) {
    const rawWhole = decimalMatch[1].replace(/,/g, '');
    const frac = decimalMatch[2];

    // Check if whole part has leading misread ₹ (as 2 or 3) on a 2-digit price: e.g. "346.0" -> 46, "210.0" -> 10
    if ((rawWhole.startsWith('2') || rawWhole.startsWith('3')) && rawWhole.length === 3) {
      const candidate = parseFloat(rawWhole.slice(1));
      if (candidate >= 5 && candidate <= 99) {
        return candidate;
      }
    }
    return parseFloat(`${rawWhole}.${frac}`);
  }

  // 2. Integer match with missing decimal / Indian Rupee OCR Glitch recovery
  const intMatch = clean.match(/\d+/);
  if (intMatch) {
    const rawStr = intMatch[0];
    let val = parseFloat(rawStr);

    // Indian Rupee (₹) + Decimal Dot OCR Glitch Detection:
    // In Tesseract with English dictionary, the '₹' symbol is read as '2' or '3',
    // and the trailing '.0' loses its dot and is read as '0'.
    // e.g. "₹46.0" -> "3460" -> true price is 46
    //      "₹10.0" -> "2100" -> true price is 10
    //      "₹99.0" -> "2990" -> true price is 99
    //      "₹89.0" -> "2890" -> true price is 89
    //      "₹9.0"  -> "290"  -> true price is 9
    if (rawStr.length >= 3 && rawStr.length <= 5 && (rawStr.startsWith('2') || rawStr.startsWith('3')) && rawStr.endsWith('0')) {
      const candidateStr = rawStr.slice(1, -1);
      const candidateVal = parseFloat(candidateStr);
      if (candidateVal > 0 && candidateVal < 2000) {
        return candidateVal;
      }
    }

    // Leading '2' or '3' from '₹' merged with 2-digit price:
    // e.g. "346" -> 46, "210" -> 10, "232" -> 32, "315" -> 15
    if (rawStr.length === 3 && (rawStr.startsWith('2') || rawStr.startsWith('3'))) {
      const candidate = parseFloat(rawStr.slice(1));
      if (candidate >= 5 && candidate <= 99) {
        return candidate;
      }
    }

    // Heuristic: If Tesseract dropped a decimal point from a 2-decimal paise price (e.g. 2100 -> 21.00)
    if (val >= 1000 && val % 100 === 0 && val !== 1000 && val !== 2000 && val !== 5000) {
      val = val / 100;
    }
    // Heuristic: If Tesseract dropped a 1-decimal dot (e.g. 460 -> 46.0)
    else if (val >= 100 && val % 10 === 0 && (val / 10 >= 5)) {
      val = val / 10;
    }

    return val < 100000 ? val : 0;
  }
  return 0;
}

function parseReceiptText(text: string, activeMemberIds: string[]): {
  items: { name: string; amount: number; participants: string[] }[];
  storeName: string;
  category: ExpenseCategory;
  deliveryFee: number;
  handlingFee: number;
  discount: number;
} {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: { name: string; amount: number; participants: string[] }[] = [];
  let storeName = 'Blinkit';
  let category: ExpenseCategory = 'Groceries';
  let deliveryFee = 0;
  let handlingFee = 0;
  let discount = 0;

  const textLower = text.toLowerCase();
  if (textLower.includes('blinkit')) {
    storeName = 'Blinkit';
    category = 'Blinkit';
  } else if (textLower.includes('zepto')) {
    storeName = 'Zepto';
    category = 'Blinkit';
  } else if (textLower.includes('instamart') || textLower.includes('swiggy')) {
    storeName = 'Swiggy Instamart';
    category = 'Blinkit';
  } else if (textLower.includes('dmart') || textLower.includes('d-mart')) {
    storeName = 'D-Mart';
    category = 'Groceries';
  } else if (textLower.includes('supermarket') || textLower.includes('grocer')) {
    storeName = 'Supermarket';
    category = 'Groceries';
  } else if (textLower.includes('restaurant') || textLower.includes('cafe') || textLower.includes('dhaba')) {
    storeName = 'Dining / Restaurant';
    category = 'Food';
  }

  // Keywords that denote end of line items
  const stopKeywords = [
    'subtotal', 'sub total', 'total amount', 'net payable', 'grand total',
    'total due', 'amount payable', 'balance due', 'bill amount', 'cgst', 'sgst',
    'savings', 'total saving', 'total items', 'thank you', 'visit again',
    'item bill', 'tem bill', 'bill details', 'order bill', 'total order',
    'download invoice'
  ];

  // Skip keywords for non-item lines
  const skipKeywords = [
    'invoice', 'order summary', 'tax invoice', 'gstin', 'cashier', 'fssai',
    'phone', 'tel:', 'date:', 'time:', 'customer', 'pos', 'terminal',
    'welcome', 'mrp', 'rate', 'item name', 'description', 'qty', 'hsn',
    'help', 'home delivery', 'delivered', 'bill details', 'order', 'repeat order', 'arrived',
    'item details', 'completed'
  ];

  let inItemsSection = true;
  let pendingName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    // Check delivery fee
    if (lineLower.includes('delivery') && (lineLower.includes('fee') || lineLower.includes('charge') || lineLower.includes('partner'))) {
      const p = cleanPriceString(line);
      if (p > 0 && p < 500) deliveryFee += p;
      continue;
    }

    // Check surge fee (adds to delivery)
    if (lineLower.includes('surge')) {
      const p = cleanPriceString(line);
      if (p > 0 && p < 500) deliveryFee += p;
      continue;
    }

    // Check handling charge / packaging fee / platform charge
    if (lineLower.includes('handling') || lineLower.includes('packaging') || lineLower.includes('platform')) {
      const p = cleanPriceString(line);
      if (p > 0 && p < 100) handlingFee = p;
      continue;
    }

    // Check discounts / coupons / offers
    if (lineLower.includes('discount') || lineLower.includes('coupon') || lineLower.includes('promo') || lineLower.includes('offer')) {
      const p = cleanPriceString(line);
      if (p > 0 && p < 2000) discount = p;
      continue;
    }

    // Stop at final totals section (Item Bill, Total Order Bill Details, etc.)
    if (
      stopKeywords.some((kw) => lineLower.includes(kw)) ||
      lineLower.includes('item bill') ||
      lineLower.includes('tem bill') ||
      lineLower.includes('total order') ||
      lineLower.includes('bill details') ||
      lineLower.includes('download invoice')
    ) {
      inItemsSection = false;
      continue;
    }

    if (!inItemsSection) continue;
    if (skipKeywords.some((kw) => lineLower.includes(kw))) continue;
    if (/^[—\-_=*.]+$/.test(line)) continue;

    // Check if line contains a price
    const words = line.split(/\s+/);
    const lastWord = words[words.length - 1];
    const amount = /\d/.test(lastWord) ? cleanPriceString(lastWord) : 0;

    if (amount > 0 && amount < 25000 && words.length > 1) {
      const lineName = words.slice(0, -1).join(' ').replace(/[₹$€£]/g, '').trim();
      let finalName = pendingName ? `${pendingName} ${lineName}` : lineName;

      // Clean UI symbols, buttons, and app navigation noise (e.g. "< HELP", "+ \"", "vv\"", "O Home Delivery v/")
      finalName = finalName.replace(/^[<+v"Tx\s—\-~`|®©•○>✔✓*]+/gi, '').trim();
      finalName = finalName.replace(/^.*?home delivery[^\w]*/gi, '').trim();
      finalName = finalName.replace(/^(help|delivered|repeat order|item details|delivery)\s*/gi, '').trim();
      finalName = finalName.replace(/^v\/\s*/gi, '').trim();
      finalName = finalName.replace(/^\d+\s*[xX*]\s+/, '').trim();
      finalName = finalName.replace(/^[<+v"Tx\s—\-~`|®©•○>✔✓*]+/gi, '').trim();

      // Never add bill totals, item bills, or fees as an item!
      const nameLower = finalName.toLowerCase();
      if (
        nameLower.includes('item bill') ||
        nameLower.includes('tem bill') ||
        nameLower.includes('total') ||
        nameLower.includes('delivery') ||
        nameLower.includes('handling') ||
        nameLower.includes('surge') ||
        nameLower.includes('discount') ||
        nameLower.includes('grand total')
      ) {
        continue;
      }

      // Only push if valid text remains
      if (finalName.length >= 2 && /[a-zA-Z]/.test(finalName)) {
        items.push({
          name: finalName,
          amount,
          participants: [...activeMemberIds]
        });
        pendingName = '';
        continue;
      }
    }

    // Accumulate multi-line item name if line is pure text without numbers
    if (line.length >= 3 && !/\d{2,}/.test(line) && /[a-zA-Z]/.test(line)) {
      pendingName = pendingName ? `${pendingName} ${line}` : line;
    }
  }

  return { items, storeName, category, deliveryFee, handlingFee, discount };
}

interface QueueBillItem {
  id: string;
  file: File;
  originalPreview: string;
  enhancedPreview: string;
  useEnhanced: boolean;
  storeName: string;
  category: ExpenseCategory;
  paidBy: string;
  date: string;
  deliveryFee: number;
  handlingFee: number;
  discount: number;
  items: ItemizedExpenseItem[];
  scannedWith?: 'local' | 'ai';
  isScanning?: boolean;
}

export const BillUploadModal: React.FC = () => {
  const { activeModal, closeModal, members, settings, saveBill, currentWeek } = useApp();

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [billQueue, setBillQueue] = useState<QueueBillItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyPendingAction, setKeyPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('sharesplit_gemini_api_key') || '';
    setGeminiKeyInput(savedKey);
  }, []);

  if (activeModal !== 'upload-bill') return null;

  const currency = settings.currency;
  const activeMembers = members.filter((m) => m.isActive !== false);
  const todayStr = getTodayStr();
  const currentBill = billQueue[currentQueueIndex];

  const runAIScanOnItems = async (itemsToScan: QueueBillItem[], apiKeyToUse: string) => {
    setIsProcessing(true);
    setProcessingStatus('✨ Gemini AI is analyzing receipt items, fees & discounts...');

    try {
      const updated = [...itemsToScan];
      for (let idx = 0; idx < updated.length; idx++) {
        const item = updated[idx];
        const optimizedImage = await compressImageForAI(item.originalPreview, 1400, 0.85);
        const aiResult = await apiService.bills.parseAI(optimizedImage, apiKeyToUse);

        if (aiResult) {
          if (aiResult.storeName) item.storeName = aiResult.storeName;
          if (aiResult.category) item.category = aiResult.category as ExpenseCategory;
          if (aiResult.date) item.date = aiResult.date;
          if (aiResult.deliveryFee !== undefined) item.deliveryFee = Number(aiResult.deliveryFee) || 0;
          if (aiResult.handlingFee !== undefined) item.handlingFee = Number(aiResult.handlingFee) || 0;
          if (aiResult.discount !== undefined) item.discount = Number(aiResult.discount) || 0;

          if (Array.isArray(aiResult.items)) {
            item.items = aiResult.items.map((it, iIdx) => ({
              id: `item-ai-${Date.now()}-${idx}-${iIdx}`,
              name: it.name || `Item ${iIdx + 1}`,
              amount: Number(it.amount) || 0,
              participants: activeMembers.map((m) => m.id)
            }));
          }
          item.scannedWith = 'ai';
        }
      }

      setBillQueue(updated);
      setStep('review');
    } catch (err: any) {
      console.error('AI Vision parsing failed:', err);
      setBillQueue(itemsToScan);
      setStep('review');
      alert(err.message || 'AI Vision failed to read receipt. Please verify your free Gemini API key.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      const defaultPayer = activeMembers.find((m) => m.isYou)?.id || activeMembers[0]?.id || '';
      setIsProcessing(true);
      setProcessingStatus('Reading and preparing receipt images...');

      try {
        const queueItems: QueueBillItem[] = [];

        for (let idx = 0; idx < filesArr.length; idx++) {
          const file = filesArr[idx];
          const rawPreview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target?.result as string);
            reader.readAsDataURL(file);
          });

          // Ultra-fast 15ms downscale to ~1400px (slashes 8MB phone photo down to ~200KB instantly)
          const fastPreview = await compressImageForAI(rawPreview, 1400, 0.85);

          queueItems.push({
            id: `queue-${Date.now()}-${idx}`,
            file,
            originalPreview: fastPreview,
            enhancedPreview: fastPreview,
            useEnhanced: false,
            storeName: file.name.replace(/\.[^/.]+$/, ''),
            category: 'Groceries',
            paidBy: defaultPayer,
            date: todayStr,
            deliveryFee: 0,
            handlingFee: 0,
            discount: 0,
            items: []
          });
        }

        setBillQueue(queueItems);
        setCurrentQueueIndex(0);
      } catch (err) {
        console.error('Image pre-processing failed:', err);
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    }
  };

  const handleRunLocalOCR = async (targetIndex?: number) => {
    const indices = targetIndex !== undefined ? [targetIndex] : billQueue.map((_, i) => i);
    if (indices.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus('Reading receipt items with Enhanced Local OCR...');

    try {
      const updated = [...billQueue];

      for (const idx of indices) {
        const item = updated[idx];
        const imageToUse = item.useEnhanced ? item.enhancedPreview : item.originalPreview;

        const result = await Tesseract.recognize(imageToUse, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProcessingStatus(`Recognizing text (${Math.round((m.progress || 0) * 100)}%)...`);
            }
          }
        });

        const parsed = parseReceiptText(result.data.text, activeMembers.map((m) => m.id));

        item.items = parsed.items.map((it, iIdx) => ({
          id: `item-${Date.now()}-${idx}-${iIdx}`,
          name: it.name,
          amount: it.amount,
          participants: it.participants
        }));
        if (parsed.storeName && parsed.storeName !== 'Store Purchase') {
          item.storeName = parsed.storeName;
        }
        item.category = parsed.category;
        item.deliveryFee = parsed.deliveryFee;
        item.handlingFee = parsed.handlingFee;
        item.discount = parsed.discount;
        item.scannedWith = 'local';
      }

      setBillQueue(updated);
      setStep('review');
    } catch (err) {
      console.error('Local OCR failed:', err);
      setStep('review');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleRunAIVision = async (targetIndex?: number) => {
    const apiKey = localStorage.getItem('sharesplit_gemini_api_key') || geminiKeyInput.trim();
    if (!apiKey) {
      setKeyPendingAction(() => () => handleRunAIVision(targetIndex));
      setShowKeyModal(true);
      return;
    }

    const indices = targetIndex !== undefined ? [targetIndex] : billQueue.map((_, i) => i);
    if (indices.length === 0) return;

    const itemsToScan = indices.map((i) => billQueue[i]);
    await runAIScanOnItems(itemsToScan, apiKey);
  };

  const handleSaveGeminiKey = () => {
    if (geminiKeyInput.trim()) {
      localStorage.setItem('sharesplit_gemini_api_key', geminiKeyInput.trim());
      setShowKeyModal(false);
      if (keyPendingAction) {
        const action = keyPendingAction;
        setKeyPendingAction(null);
        action();
      }
    }
  };

  const updateCurrentBillField = (field: keyof QueueBillItem, value: any) => {
    setBillQueue((prev) =>
      prev.map((item, idx) => (idx === currentQueueIndex ? { ...item, [field]: value } : item))
    );
  };

  const toggleEnhancedImage = async () => {
    if (!currentBill) return;
    if (currentBill.useEnhanced) {
      updateCurrentBillField('useEnhanced', false);
    } else {
      if (currentBill.enhancedPreview === currentBill.originalPreview) {
        setIsProcessing(true);
        setProcessingStatus('Enhancing image contrast...');
        try {
          const { enhancedUrl } = await preprocessReceiptImage(currentBill.originalPreview, { enhance: true });
          updateCurrentBillField('enhancedPreview', enhancedUrl);
        } catch (e) {
          console.error(e);
        } finally {
          setIsProcessing(false);
          setProcessingStatus('');
        }
      }
      updateCurrentBillField('useEnhanced', true);
    }
  };

  const handleAddItem = () => {
    if (!currentBill) return;
    const newItem: ItemizedExpenseItem = {
      id: `item-${Date.now()}-${currentBill.items.length + 1}`,
      name: `New Item ${currentBill.items.length + 1}`,
      amount: 0,
      participants: activeMembers.map((m) => m.id)
    };
    updateCurrentBillField('items', [...currentBill.items, newItem]);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!currentBill) return;
    updateCurrentBillField(
      'items',
      currentBill.items.filter((i) => i.id !== itemId)
    );
  };

  const updateItemInCurrentBill = (itemId: string, field: 'name' | 'amount', val: any) => {
    if (!currentBill) return;
    const updatedItems = currentBill.items.map((i) =>
      i.id === itemId ? { ...i, [field]: val } : i
    );
    updateCurrentBillField('items', updatedItems);
  };

  const toggleItemParticipant = (itemId: string, personId: string) => {
    if (!currentBill) return;
    const updatedItems = currentBill.items.map((item) => {
      if (item.id !== itemId) return item;
      const has = item.participants.includes(personId);
      return {
        ...item,
        participants: has
          ? item.participants.filter((p) => p !== personId)
          : [...item.participants, personId]
      };
    });
    updateCurrentBillField('items', updatedItems);
  };

  const currentItemsSubtotal = currentBill
    ? currentBill.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
    : 0;
  const currentFinalTotal = currentBill
    ? Math.max(
        0,
        currentItemsSubtotal +
          Number(currentBill.deliveryFee || 0) +
          Number(currentBill.handlingFee || 0) -
          Number(currentBill.discount || 0)
      )
    : 0;

  const handleSaveAllExpenses = async () => {
    for (let i = 0; i < billQueue.length; i++) {
      const qItem = billQueue[i];
      const itemsSub = qItem.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const totalAmt = Math.max(
        0,
        itemsSub +
          Number(qItem.deliveryFee || 0) +
          Number(qItem.handlingFee || 0) -
          Number(qItem.discount || 0)
      );
      const allParticipants = Array.from(new Set(qItem.items.flatMap((it) => it.participants)));

      const newBill: Bill = {
        id: '',
        expenseId: '',
        fileName: qItem.file.name,
        storeName: qItem.storeName,
        category: qItem.category,
        totalAmount: totalAmt,
        paidBy: qItem.paidBy,
        date: qItem.date,
        uploadedAt: new Date().toISOString(),
        imageData: qItem.originalPreview
      };

      try {
        const uploadedBill = await saveBill(newBill, qItem.originalPreview);
        const backendBillId = uploadedBill?.id || '';

        const newExpense: Expense = {
          id: '',
          weekId: currentWeek?.id || '',
          date: qItem.date || todayStr,
          description: qItem.storeName,
          category: qItem.category,
          type: 'itemized',
          source: 'bill',
          paidBy: qItem.paidBy,
          totalAmount: totalAmt,
          participants: allParticipants.length > 0 ? allParticipants : activeMembers.map((m) => m.id),
          billId: backendBillId,
          createdAt: new Date().toISOString(),
          items: qItem.items
        };

        await apiService.expenses.create(newExpense);
      } catch (err) {
        console.error('Failed to save bill or expense record:', err);
      }
    }

    closeModal();
    window.location.reload();
  };

  const handleResetModal = () => {
    setBillQueue([]);
    setStep('upload');
    closeModal();
  };

  return (
    <Modal
      isOpen={activeModal === 'upload-bill'}
      onClose={handleResetModal}
      title="Smart Bill & Receipt Scanner"
      subtitle={
        step === 'upload'
          ? 'Upload receipt images for instant itemized parsing'
          : `Reviewing ${billQueue.length} bill(s)`
      }
      maxWidth="2xl"
    >
      {/* API Key Modal Dialog */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Google Gemini AI Vision Setup
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reads crumpled, dim, and blurry receipts with 99%+ accuracy.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Gemini API Key (Free)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 font-mono text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed flex items-center gap-1">
                <span>Free keys take 30 seconds at</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-600 dark:text-purple-400 font-bold underline inline-flex items-center gap-0.5"
                >
                  aistudio.google.com <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowKeyModal(false);
                  setKeyPendingAction(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGeminiKey}
                disabled={!geminiKeyInput.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'upload' ? (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/40">
            {billQueue.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 justify-center max-h-48 overflow-y-auto p-2">
                  {billQueue.map((item, idx) => (
                    <div key={item.id} className="relative group">
                      <img
                        src={item.useEnhanced ? item.enhancedPreview : item.originalPreview}
                        alt={`Bill ${idx + 1}`}
                        className="w-20 h-28 object-cover rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-bold bg-slate-900 text-white rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {billQueue.length} Receipt Image(s) Prepared
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <label className="cursor-pointer text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                    Click to select bill image(s)
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Upload physical receipts, grocery slips, or Blinkit/Zepto screenshots
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Processing Banner */}
          {isProcessing && (
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
              <span>{processingStatus}</span>
            </div>
          )}

          {/* Single Scan Button */}
          {billQueue.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => handleRunAIVision()}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.005] disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Scan Receipt</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Review Queue Step */
        <div className="space-y-5">
          {/* Queue Navigation Header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Bill {currentQueueIndex + 1} of {billQueue.length}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                ✨ Scanned
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentQueueIndex === 0}
                onClick={() => setCurrentQueueIndex((prev) => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentQueueIndex === billQueue.length - 1}
                onClick={() => setCurrentQueueIndex((prev) => prev + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentBill && (
            <div className="space-y-4">
              {/* Receipt Preview Card with Image Enhancement Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={currentBill.useEnhanced ? currentBill.enhancedPreview : currentBill.originalPreview}
                    alt="Receipt Thumbnail"
                    className="w-12 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentBill.file.name}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {currentBill.useEnhanced ? 'Contrast Enhanced (OCR optimized)' : 'Original Photo'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleEnhancedImage}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1 hover:bg-slate-100"
                  >
                    {currentBill.useEnhanced ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{currentBill.useEnhanced ? 'View Original' : 'View Enhanced'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunAIVision(currentQueueIndex)}
                    disabled={isProcessing}
                    className="px-3 py-1 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Re-scan</span>
                  </button>
                </div>
              </div>

              {/* Status Banner when scanning */}
              {isProcessing && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2.5 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span>{processingStatus}</span>
                </div>
              )}

              {/* Expense Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store / Expense Name
                  </label>
                  <input
                    type="text"
                    value={currentBill.storeName}
                    onChange={(e) => updateCurrentBillField('storeName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    value={currentBill.date}
                    onChange={(e) => updateCurrentBillField('date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paid By
                  </label>
                  <select
                    value={currentBill.paidBy}
                    onChange={(e) => updateCurrentBillField('paidBy', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  >
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={currentBill.category}
                    onChange={(e) => updateCurrentBillField('category', e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  >
                    <option value="Blinkit">Blinkit</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Food">Food</option>
                    <option value="Travel">Travel</option>
                    <option value="Rent">Rent</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Household">Household</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Extracted Bill Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Extracted Items ({currentBill.items.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {currentBill.items.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      No items were automatically detected from this image.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Smartphone photos with shadows or thermal receipt paper read best with Gemini AI.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRunAIVision(currentQueueIndex)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Scan with Gemini AI</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        + Add Manually
                      </button>
                    </div>
                  </div>
                ) : (
                  currentBill.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItemInCurrentBill(item.id, 'name', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500 font-bold">{currency}</span>
                          <input
                            type="number"
                            step="any"
                            value={item.amount || ''}
                            onChange={(e) => updateItemInCurrentBill(item.id, 'amount', e.target.value)}
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          For:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeMembers.map((m) => {
                            const isChecked = item.participants.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleItemParticipant(item.id, m.id)}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                  isChecked
                                    ? 'bg-brand-50 text-brand-800 border-brand-300 dark:bg-brand-950 dark:text-brand-300'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                                }`}
                              >
                                {isChecked ? '☑ ' : '☐ '}
                                {m.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Delivery Fee, Handling Fee & Discount Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Delivery & Surge Fee ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={currentBill.deliveryFee || ''}
                    placeholder="0"
                    onChange={(e) => updateCurrentBillField('deliveryFee', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Handling Charge ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={currentBill.handlingFee || ''}
                    placeholder="0"
                    onChange={(e) => updateCurrentBillField('handlingFee', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Discount / Coupon ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={currentBill.discount || ''}
                    placeholder="0"
                    onChange={(e) => updateCurrentBillField('discount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Total Card & Submit Action */}
              <div className="p-4 rounded-xl bg-brand-50/70 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider">
                    Total for Bill #{currentQueueIndex + 1}
                  </span>
                  <div className="text-xl font-black text-brand-900 dark:text-brand-100">
                    {currency}{currentFinalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <button
                  onClick={handleSaveAllExpenses}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl shadow-2xs transition-colors duration-150"
                >
                  Save All {billQueue.length} Expense(s)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
