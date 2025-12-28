
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Send, ShoppingCart, User, MapPin, Calendar, FileText, CheckCircle2, 
  ClipboardList, ArrowRight, History, ArrowLeft, Package, AlertCircle, LogOut, 
  ShieldCheck, Truck, XCircle, Check, Users, Navigation, Wheat, Pencil, Lock, X, 
  KeyRound, ChevronDown, Hash, Phone, PauseCircle, AlertTriangle, Save, Mail, 
  Search, FileSpreadsheet, Download, Eye, EyeOff, Languages, Siren, Clock, 
  RefreshCw, Upload, Filter, CircleCheck, Sparkles, ShieldAlert, Camera, Image as LucideImage, Maximize2
} from 'lucide-react';
import { PRODUCT_CATALOG, CUSTOMER_LIST, WAREHOUSES, DRIVERS_FLEET, DELIVERY_SHIFTS } from './constants';
import { OrderItem, SalesOrder, OrderStatus, Role, Shipment, EmergencyReport, UserProfile } from './types';
import { getUserByPin } from './users';
import { TRANSLATIONS } from './translations';
import { MagicParser } from './components/MagicParser';

// --- CLOUD CONFIGURATION ---
const CLOUD_SYNC_INTERVAL = 15000; 
const CLOUD_DB_KEY = 'ifcg_shared_db_v3';

// --- HELPER UI COMPONENTS ---

const CompanyLogo = ({ large }: { large?: boolean }) => (
  <div className={`flex flex-col items-center justify-center ${large ? 'scale-100' : 'scale-90'}`}>
    <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-900/40 mb-2">
      <Wheat className="w-8 h-8 text-white" />
    </div>
    <span className="font-black tracking-tighter text-white leading-none text-2xl">IFCG <span className="text-blue-500">PORTAL</span></span>
  </div>
);

const StatusBadge = ({ status, t }: { status?: OrderStatus, t: any }) => {
  const styles: Record<string, string> = {
    'Pending Assistant': 'bg-indigo-900/30 text-indigo-300 border-indigo-800',
    'Pending Finance': 'bg-purple-900/30 text-purple-300 border-purple-800',
    'Approved': 'bg-green-900/30 text-green-300 border-green-800', 
    'Ready for Driver': 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
    'Partially Shipped': 'bg-blue-900/30 text-blue-300 border-blue-800',
    'In Transit': 'bg-sky-900/30 text-sky-300 border-sky-800',
    'Completed': 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
    'Rejected': 'bg-red-900/30 text-red-300 border-red-800',
    'On Hold': 'bg-orange-900/30 text-orange-300 border-orange-800',
    'Emergency': 'bg-red-600 text-white border-red-500 animate-pulse',
    'Canceled': 'bg-gray-700 text-gray-400 border-gray-600',
  };
  const statusKeyMap: Record<string, string> = {
    'Pending Assistant': 'status_pendingAssistant', 'Pending Finance': 'status_pendingFinance', 'Approved': 'status_approved', 'Rejected': 'status_rejected', 'Ready for Driver': 'status_readyDriver', 'Partially Shipped': 'status_partiallyShipped', 'In Transit': 'status_inTransit', 'Completed': 'status_completed', 'On Hold': 'status_onHold', 'Emergency': 'status_emergency', 'Canceled': 'status_canceled'
  };
  const style = status ? styles[status] : 'bg-gray-700 text-gray-300';
  const label = status ? t[statusKeyMap[status]] || status : status;
  return <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${style} whitespace-nowrap uppercase tracking-wider`}>{label}</span>;
};

const ActionWidget = ({ onPrimary, primaryLabel, primaryColor = 'indigo', onSecondary, secondaryLabel, placeholder, t, onAdjust }: any) => {
    const [note, setNote] = useState('');
    const colors: Record<string, string> = { 
        indigo: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/30', 
        green: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/30', 
        orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/30', 
        teal: 'bg-teal-600 hover:bg-teal-700 shadow-teal-900/30' 
    };
    return (
        <div className="space-y-3 bg-gray-900/60 p-5 rounded-2xl border border-gray-800/80 mt-4 shadow-inner">
            <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
                <textarea className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:ring-2 focus:ring-blue-600 outline-none resize-none min-h-[70px] transition-all" placeholder={placeholder || t.addNote} value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div className="flex gap-2">
                {onAdjust && <button onClick={onAdjust} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-700 transition-all flex items-center justify-center gap-1"><Pencil className="w-3.5 h-3.5" /> {t.adjust}</button>}
                {onSecondary && <button onClick={() => onSecondary(note)} className="flex-1 py-3 bg-red-900/10 text-red-500 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all border border-red-900/20">{secondaryLabel || t.reject}</button>}
                <button onClick={() => onPrimary(note)} className={`flex-[2] py-3 text-white rounded-xl font-black text-xs shadow-lg transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${colors[primaryColor] || colors.indigo}`}><CheckCircle2 className="w-4 h-4" /> {primaryLabel}</button>
            </div>
        </div>
    );
};

// --- STYLING CONSTANTS ---
// Fix: Added missing INPUT_CLASS definition used throughout the form
const INPUT_CLASS = "w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder-gray-600 font-bold text-sm shadow-inner";

// --- APP LOGIC ---

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>(() => (localStorage.getItem('ifcg_lang') as 'ar' | 'en') || 'ar');
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.classList.add('dark');
    localStorage.setItem('ifcg_lang', lang);
  }, [lang]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = sessionStorage.getItem('ifcg_user_session_v3');
    return saved ? JSON.parse(saved) : null;
  });

  const [globalOrders, setGlobalOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [loginTargetRole, setLoginTargetRole] = useState<Role | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isMagicImportOpen, setIsMagicImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [order, setOrder] = useState<SalesOrder>({
    customerName: '', areaLocation: '', orderDate: new Date().toISOString().split('T')[0], receivingDate: '', deliveryShift: 'أول نقلة', deliveryType: 'Own Cars', items: [], overallNotes: '', serialNumber: ''
  });

  // --- CLOUD SYNC ENGINE ---

  const fetchFromCloud = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = localStorage.getItem(CLOUD_DB_KEY);
      if (data) setGlobalOrders(JSON.parse(data));
    } catch (e) {
      console.error("Cloud Sync Error", e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const pushToCloud = useCallback(async (updatedOrders: SalesOrder[]) => {
    localStorage.setItem(CLOUD_DB_KEY, JSON.stringify(updatedOrders));
  }, []);

  useEffect(() => {
    fetchFromCloud();
    const heartbeat = setInterval(() => fetchFromCloud(true), CLOUD_SYNC_INTERVAL);
    return () => clearInterval(heartbeat);
  }, [fetchFromCloud]);

  useEffect(() => {
    if (currentUser) sessionStorage.setItem('ifcg_user_session_v3', JSON.stringify(currentUser));
    else sessionStorage.removeItem('ifcg_user_session_v3');
  }, [currentUser]);

  // --- HANDLERS ---

  const updateStatus = async (orderId: string, updates: Partial<SalesOrder>, actionMsg: string) => {
    const updated = globalOrders.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        ...updates,
        history: [...(o.history || []), {
          role: currentUser?.role || 'Unknown',
          action: actionMsg,
          date: new Date().toLocaleString(),
          user: currentUser?.name || 'System'
        }]
      };
    });
    setGlobalOrders(updated);
    await pushToCloud(updated);
  };

  const handleOrderSubmit = async () => {
    if (!order.customerName || !order.areaLocation || order.items.length === 0) {
      setValidationError(t.validationItemDetails);
      return;
    }
    setSubmissionStatus('submitting');
    await new Promise(r => setTimeout(r, 800));

    let newList: SalesOrder[];
    if (editingId) {
      newList = globalOrders.map(o => o.id === editingId ? { 
          ...order, 
          id: editingId, 
          status: o.status || 'Pending Assistant',
          history: [...(o.history || []), { role: currentUser?.role || 'Sales', action: 'Order Modified', date: new Date().toLocaleString(), user: currentUser?.name }] 
      } : o);
    } else {
      const newOrder: SalesOrder = {
        ...order,
        id: Math.random().toString(36).substr(2, 9),
        serialNumber: `SO-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'Pending Assistant',
        createdBy: currentUser?.email,
        creatorName: currentUser?.name,
        history: [{ role: 'Sales Supervisor', action: 'Order Created', date: new Date().toLocaleString(), user: currentUser?.name }]
      };
      newList = [newOrder, ...globalOrders];
    }
    
    setGlobalOrders(newList);
    await pushToCloud(newList);
    setSubmissionStatus('success');
    setTimeout(() => {
      setSubmissionStatus('idle');
      setEditingId(null);
      setOrder({ customerName: '', areaLocation: '', orderDate: new Date().toISOString().split('T')[0], receivingDate: '', deliveryShift: 'أول نقلة', deliveryType: 'Own Cars', items: [], overallNotes: '', serialNumber: '' });
      setActiveTab('history');
    }, 1500);
  };

  // --- VIEW FILTERS ---

  const getFilteredOrders = () => {
    let base = globalOrders;
    if (currentUser?.role === 'sales') {
        base = base.filter(o => o.createdBy === currentUser.email);
    } else if (currentUser?.role === 'assistant') {
        if (activeTab === 'pending') base = base.filter(o => o.status === 'Pending Assistant');
    } else if (currentUser?.role === 'finance') {
        if (activeTab === 'pending') base = base.filter(o => o.status === 'Pending Finance');
    } else if (currentUser?.role === 'warehouse') {
        if (activeTab === 'pending') base = base.filter(o => o.status === 'Approved' || o.status === 'On Hold');
    } else if (currentUser?.role === 'driver_supervisor') {
        if (activeTab === 'pending') base = base.filter(o => o.status === 'Ready for Driver' || o.status === 'Partially Shipped');
    } else if (currentUser?.role === 'truck_driver') {
        base = base.filter(o => o.shipments?.some(s => s.driverName === currentUser.name));
    }
    
    return base.filter(o => 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.serialNumber?.includes(searchTerm)
    );
  };

  const filtered = getFilteredOrders();
  const counts = {
      assistant: globalOrders.filter(o => o.status === 'Pending Assistant').length,
      finance: globalOrders.filter(o => o.status === 'Pending Finance').length,
      warehouse: globalOrders.filter(o => o.status === 'Approved' || o.status === 'On Hold').length,
      driver: globalOrders.filter(o => o.status === 'Ready for Driver' || o.status === 'Partially Shipped').length,
  };

  if (isLoading && !currentUser) {
      return (
          <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center font-['Alexandria']">
              <RefreshCw className="animate-spin text-blue-500 mb-6" size={48} />
              <div className="text-center">
                  <h2 className="text-white font-black text-lg mb-1">CONNECTING TO CLOUD</h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Synchronizing data...</p>
              </div>
          </div>
      );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 font-['Alexandria']">
        <div className="bg-gray-900 border border-gray-800 p-10 rounded-[40px] shadow-2xl max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <CompanyLogo large />
            <h1 className="text-2xl font-black text-white mt-8 mb-2 tracking-tight">{t.loginTitle}</h1>
            <p className="text-gray-500 text-sm mb-8 font-medium">{t.loginSubtitle}</p>
            <div className="grid grid-cols-1 gap-3">
              {(['sales', 'assistant', 'finance', 'warehouse', 'driver_supervisor', 'truck_driver'] as Role[]).map(role => (
                  <button key={role} onClick={() => setLoginTargetRole(role)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-800/40 border border-gray-800 hover:border-blue-500 hover:bg-gray-800 text-white transition-all group active:scale-[0.98]">
                      <span className="font-bold text-sm">{t[`role_${role}` as keyof typeof t] as string}</span>
                      <ArrowRight size={18} className="text-gray-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
              ))}
            </div>
        </div>
        {loginTargetRole && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                <div className="bg-gray-900 border border-gray-800 p-10 rounded-[40px] w-full max-w-sm text-center shadow-2xl">
                    <div className="bg-blue-600/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/20"><Lock className="text-blue-500 w-10 h-10" /></div>
                    <h3 className="text-white font-black text-2xl mb-2 tracking-tight">{t.enterPin}</h3>
                    <p className="text-gray-500 text-xs mb-8 uppercase tracking-[0.2em] font-black">{t[`role_${loginTargetRole}` as keyof typeof t] as string}</p>
                    <input autoFocus type="password" placeholder="••••" className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl p-5 text-white text-center text-4xl tracking-[0.5em] focus:border-blue-600 outline-none transition-all mb-8 shadow-inner" onKeyDown={e => {
                        if (e.key === 'Enter') {
                            const user = getUserByPin((e.target as HTMLInputElement).value);
                            if (user && user.role === loginTargetRole) {
                                setCurrentUser(user);
                                setLoginTargetRole(null);
                            } else alert(t.invalidCode);
                        }
                    }} />
                    <button onClick={() => setLoginTargetRole(null)} className="text-gray-600 hover:text-white font-black text-xs uppercase tracking-widest transition-colors">{t.cancel}</button>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-['Alexandria'] pb-32">
        {/* HEADER RESTORED */}
        <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-900 px-6 py-5 shadow-2xl">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-lg shadow-blue-900/30"><Wheat className="w-6 h-6 text-white" /></div>
                    <div>
                        <h2 className="text-white font-black text-lg tracking-tight leading-none">IFCG <span className="text-blue-500">CLOUD</span></h2>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.15em] mt-1 block">{t[`role_${currentUser.role}` as keyof typeof t] as string}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-gray-500 hover:text-white transition-all hover:bg-gray-800"><Languages size={22} /></button>
                    <button onClick={() => setCurrentUser(null)} className="p-3 rounded-2xl bg-red-900/10 border border-red-900/20 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-90"><LogOut size={22} /></button>
                </div>
            </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 space-y-8">
            {/* NOTIFICATIONS RESTORED */}
            {((currentUser.role === 'assistant' && counts.assistant > 0) || 
               (currentUser.role === 'finance' && counts.finance > 0) ||
               (currentUser.role === 'warehouse' && counts.warehouse > 0)) && (
                <div className="bg-indigo-600 text-white p-5 rounded-3xl flex items-center justify-between shadow-2xl shadow-indigo-900/40 animate-pulse border border-indigo-400/30">
                    <div className="flex items-center gap-4">
                        <AlertCircle className="w-6 h-6" />
                        <span className="font-black text-sm uppercase tracking-wide">{t.notificationMsg}</span>
                    </div>
                    <span className="bg-white text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                        {currentUser.role === 'assistant' ? counts.assistant : currentUser.role === 'finance' ? counts.finance : counts.warehouse}
                    </span>
                </div>
            )}

            {/* TAB SELECTOR RESTORED */}
            <div className="bg-gray-900 border border-gray-800 p-2 rounded-3xl flex shadow-2xl">
                {currentUser.role === 'sales' && (
                    <>
                        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-4 text-sm font-black rounded-2xl transition-all uppercase tracking-widest ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/30' : 'text-gray-500 hover:text-gray-300'}`}>{t.newOrder}</button>
                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-sm font-black rounded-2xl transition-all uppercase tracking-widest ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/30' : 'text-gray-500 hover:text-gray-300'}`}>{t.myHistory}</button>
                    </>
                )}
                {currentUser.role !== 'sales' && currentUser.role !== 'truck_driver' && (
                    <>
                        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-4 text-sm font-black rounded-2xl transition-all uppercase tracking-widest ${activeTab === 'pending' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/30' : 'text-gray-500'}`}>{t.tab_reviewPending} ({counts[currentUser.role === 'assistant' ? 'assistant' : currentUser.role === 'finance' ? 'finance' : 'warehouse'] || 0})</button>
                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-sm font-black rounded-2xl transition-all uppercase tracking-widest ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/30' : 'text-gray-500'}`}>{t.tab_fullHistory}</button>
                    </>
                )}
            </div>

            {/* FORM VIEW RESTORED */}
            {((currentUser.role === 'sales' && activeTab === 'pending') || editingId) && submissionStatus !== 'success' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="bg-gray-900 border border-gray-800 p-8 rounded-[40px] shadow-2xl space-y-8 border-t-2 border-t-blue-600/50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-white tracking-tight">{editingId ? t.editingOrder : t.newOrder}</h3>
                            <button onClick={() => setIsMagicImportOpen(true)} className="flex items-center gap-3 bg-blue-600/10 text-blue-400 px-5 py-3 rounded-2xl border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-lg">
                                <Sparkles size={18} /> Magic AI
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 px-1 uppercase tracking-[0.2em]">{t.clientName}</label>
                                <input className={INPUT_CLASS} list="clients" value={order.customerName} onChange={e => {
                                    const found = CUSTOMER_LIST.find(c => c.name === e.target.value);
                                    setOrder({...order, customerName: e.target.value, areaLocation: found ? found.location : order.areaLocation});
                                }} placeholder={t.selectClient as string} />
                                <datalist id="clients">{CUSTOMER_LIST.map(c => <option key={c.name} value={c.name} />)}</datalist>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 px-1 uppercase tracking-[0.2em]">{t.location}</label>
                                <input className={INPUT_CLASS} value={order.areaLocation} onChange={e => setOrder({...order, areaLocation: e.target.value})} placeholder={t.areaAddress as string} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 px-1 uppercase tracking-[0.2em]">{t.receivingDate}</label>
                                <input type="date" className={INPUT_CLASS} value={order.receivingDate} onChange={e => setOrder({...order, receivingDate: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 px-1 uppercase tracking-[0.2em]">{t.deliveryShift}</label>
                                <select className={INPUT_CLASS} value={order.deliveryShift} onChange={e => setOrder({...order, deliveryShift: e.target.value as any})}>
                                    {DELIVERY_SHIFTS.map(s => <option key={s} value={s}>{s === 'أول نقلة' ? t.shift_First : s === 'ثانى نقلة' ? t.shift_Second : t.shift_Night}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                                <h4 className="font-black text-white uppercase tracking-widest text-sm">{t.orderItems as string}</h4>
                                <button onClick={() => setOrder({...order, items: [...order.items, {id: Math.random().toString(36).substr(2, 9), itemName: '', quantity: 1}]})} className="text-blue-500 text-xs font-black flex items-center gap-2 hover:bg-blue-600/10 px-4 py-2 rounded-xl transition-all border border-blue-600/20 uppercase">
                                    <Plus size={16} /> {t.addItem as string}
                                </button>
                            </div>
                            {order.items.map((item, idx) => (
                                <div key={item.id} className="flex gap-3 items-center group animate-in slide-in-from-left duration-300">
                                    <input className={`${INPUT_CLASS} flex-1 shadow-inner`} list="products" value={item.itemName} onChange={e => {
                                        const n = [...order.items]; n[idx].itemName = e.target.value; setOrder({...order, items: n});
                                    }} placeholder={t.searchProduct as string} />
                                    <datalist id="products">{PRODUCT_CATALOG.map(p => <option key={p} value={p} />)}</datalist>
                                    <div className="relative w-28">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input type="number" className={`${INPUT_CLASS} !pl-9 text-center font-black`} value={item.quantity} onChange={e => {
                                            const n = [...order.items]; n[idx].quantity = parseInt(e.target.value) || 0; setOrder({...order, items: n});
                                        }} />
                                    </div>
                                    <button onClick={() => setOrder({...order, items: order.items.filter(i => i.id !== item.id)})} className="p-3.5 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all group-hover:bg-red-900/5"><Trash2 size={22}/></button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-500 px-1 uppercase tracking-[0.2em]">{t.overallNotes}</label>
                             <textarea className={`${INPUT_CLASS} h-28 resize-none shadow-inner`} value={order.overallNotes} onChange={e => setOrder({...order, overallNotes: e.target.value})} placeholder={t.overallNotesPlaceholder as string} />
                        </div>

                        {validationError && <div className="p-5 bg-red-900/20 text-red-400 rounded-2xl border border-red-800 text-sm font-black flex items-center gap-3 animate-in shake"><AlertCircle size={22}/> {validationError}</div>}

                        <button onClick={handleOrderSubmit} disabled={submissionStatus === 'submitting'} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl shadow-blue-900/50 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.1em]">
                            {submissionStatus === 'submitting' ? <RefreshCw className="animate-spin" /> : <Send size={22} />}
                            {editingId ? t.updateOrder : t.submitOrder}
                        </button>
                    </div>
                </div>
            )}

            {/* SUCCESS STATE RESTORED */}
            {submissionStatus === 'success' && (
                <div className="text-center py-20 animate-in zoom-in duration-500">
                    <div className="bg-green-600/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-green-600/30">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">{t.successTitle}</h2>
                    <p className="text-gray-500 font-bold">{t.successMsg}</p>
                </div>
            )}

            {/* HISTORY / LIST VIEW RESTORED */}
            {((currentUser.role === 'sales' && activeTab === 'history') || 
              (currentUser.role !== 'sales' && !editingId)) && submissionStatus !== 'success' && (
                <div className="space-y-6">
                    <div className="relative group">
                        <Search className="absolute ltr:left-5 rtl:right-5 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                        <input className={`${INPUT_CLASS} ltr:pl-14 rtl:pr-14 bg-gray-900/80 border-gray-800 shadow-2xl h-16 text-lg rounded-[28px]`} placeholder={t.searchPlaceholder as string} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>

                    {filtered.length === 0 ? (
                        <div className="text-center py-28 bg-gray-900/40 rounded-[40px] border border-dashed border-gray-800 shadow-inner">
                             <ClipboardList className="w-20 h-20 text-gray-800 mx-auto mb-6" />
                             <p className="text-gray-600 font-black text-lg uppercase tracking-widest">{t.emptySearch as string}</p>
                        </div>
                    ) : (
                        filtered.map(o => (
                            <div key={o.id} className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 shadow-2xl hover:border-gray-700 transition-all space-y-6 animate-in fade-in slide-in-from-bottom-4 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-gray-950 px-2 py-1 rounded-md border border-gray-800">#{o.serialNumber}</span>
                                            <StatusBadge status={o.status} t={t} />
                                        </div>
                                        <h3 className="text-white font-black text-2xl leading-tight tracking-tight">{o.customerName}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                                            <MapPin size={16} className="text-blue-500" /> {o.areaLocation}
                                        </div>
                                    </div>
                                    <div className="text-right space-y-3">
                                        <div className="bg-gray-800 px-4 py-2 rounded-xl text-xs font-black text-gray-400 border border-gray-700 shadow-inner">{o.receivingDate}</div>
                                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-600">{o.deliveryShift}</div>
                                    </div>
                                </div>

                                <div className="bg-gray-950/60 p-6 rounded-3xl border border-gray-800/50 shadow-inner">
                                    <div className="space-y-3">
                                        {o.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-xs items-center group/item">
                                                <span className="text-gray-400 font-bold truncate flex-1 uppercase tracking-tight group-hover/item:text-gray-200 transition-colors">{item.itemName}</span>
                                                <span className="bg-blue-600/10 text-blue-500 px-3 py-1 rounded-lg font-black ml-4 shadow-sm">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-gray-800/80 flex justify-between items-center">
                                        <span className="text-gray-600 font-black uppercase tracking-[0.2em] text-[10px]">{t.totalQty as string}</span>
                                        <span className="text-white font-black text-2xl tracking-tighter">{o.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
                                    </div>
                                </div>

                                {o.overallNotes && (
                                    <div className="bg-blue-950/20 border border-blue-900/20 p-4 rounded-2xl flex gap-3 shadow-inner">
                                        <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-200/80 font-medium italic leading-relaxed">"{o.overallNotes}"</p>
                                    </div>
                                )}

                                {/* ACTION BUTTONS RESTORED */}
                                {currentUser.role === 'sales' && (
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => { setEditingId(o.id!); setOrder({...o}); }} className="flex-1 bg-gray-800 text-white py-4 rounded-2xl font-black text-xs hover:bg-gray-700 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-gray-700"><Pencil size={14}/> {t.editOrder}</button>
                                        <button onClick={() => updateStatus(o.id!, { status: 'Canceled' }, "Order Canceled")} className="p-4 bg-red-900/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-red-900/20"><XCircle size={20}/></button>
                                    </div>
                                )}

                                {currentUser.role === 'assistant' && o.status === 'Pending Assistant' && (
                                    <ActionWidget t={t} primaryLabel={t.approveQty} primaryColor="indigo" onAdjust={() => { setEditingId(o.id!); setOrder({...o}); }} onPrimary={(note: string) => updateStatus(o.id!, { status: 'Pending Finance' }, note || "Qty Approved")} onSecondary={(note: string) => updateStatus(o.id!, { status: 'Rejected' }, note || "Rejected by Support")} />
                                )}

                                {currentUser.role === 'finance' && o.status === 'Pending Finance' && (
                                    <ActionWidget t={t} primaryLabel={t.approveOrder} primaryColor="green" onPrimary={(note: string) => updateStatus(o.id!, { status: 'Approved' }, note || "Finance Approved")} onSecondary={(note: string) => updateStatus(o.id!, { status: 'Rejected' }, note || "Credit Refused")} />
                                )}

                                {currentUser.role === 'warehouse' && (o.status === 'Approved' || o.status === 'On Hold') && (
                                    <div className="pt-2">
                                        <button onClick={() => updateStatus(o.id!, { status: 'Ready for Driver' }, "Order Packed")} className="w-full bg-orange-600 text-white py-4.5 rounded-[24px] font-black text-sm shadow-xl shadow-orange-900/40 hover:bg-orange-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest">
                                            <Package size={22} /> {t.markReady as string}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </main>

        <MagicParser isOpen={isMagicImportOpen} onClose={() => setIsMagicImportOpen(false)} onParsed={(data) => setOrder({...order, ...data})} />
    </div>
  );
}
