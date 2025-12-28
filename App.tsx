import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Trash2, Send, ShoppingCart, User, MapPin, Calendar, FileText, CheckCircle2, 
  ClipboardList, ArrowRight, History, ArrowLeft, Package, AlertCircle, LogOut, 
  ShieldCheck, Truck, XCircle, Check, Users, Navigation, Wheat, Pencil, Lock, X, 
  KeyRound, ChevronDown, Hash, Phone, PauseCircle, AlertTriangle, Save, Mail, 
  Search, FileSpreadsheet, Download, Eye, EyeOff, Languages, Siren, Clock, 
  RefreshCw, Upload, Filter, CircleCheck, Sparkles, ShieldAlert, Camera, Image as LucideImage, Maximize2,
  ListPlus, Info, CheckCircle
} from 'lucide-react';
import { PRODUCT_CATALOG, CUSTOMER_LIST, WAREHOUSES, DRIVERS_FLEET, DELIVERY_SHIFTS } from './constants.ts';
import { OrderItem, SalesOrder, OrderStatus, Role, Shipment, EmergencyReport, UserProfile } from './types.ts';
import { getUserByPin } from './users.ts';
import { TRANSLATIONS } from './translations.ts';
import { MagicParser } from './components/MagicParser.tsx';

// --- STYLING CONSTANTS ---
const INPUT_CLASS = "w-full bg-gray-900/50 border border-gray-800/50 rounded-2xl py-3.5 px-5 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder-gray-600 font-medium text-sm shadow-inner";
const LABEL_CLASS = "text-[10px] font-black text-gray-500 px-1 uppercase tracking-[0.15em] mb-2 block";
const CARD_CLASS = "glass rounded-[32px] p-6 shadow-2xl border border-gray-800/50";

// --- HELPERS ---
const StatusBadge = ({ status, t }: { status?: OrderStatus, t: any }) => {
  const styles: Record<string, string> = {
    'Pending Assistant': 'bg-blue-900/20 text-blue-400 border-blue-800/30',
    'Pending Finance': 'bg-purple-900/20 text-purple-400 border-purple-800/30',
    'Approved': 'bg-emerald-900/20 text-emerald-400 border-emerald-800/30', 
    'Ready for Driver': 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30',
    'Partially Shipped': 'bg-sky-900/20 text-sky-400 border-sky-800/30',
    'In Transit': 'bg-indigo-900/20 text-indigo-400 border-indigo-800/30',
    'Completed': 'bg-green-600 text-white border-green-500',
    'Rejected': 'bg-red-900/20 text-red-400 border-red-800/30',
    'On Hold': 'bg-orange-900/20 text-orange-400 border-orange-800/30',
    'Canceled': 'bg-gray-800 text-gray-500 border-gray-700',
  };
  const statusKeyMap: Record<string, string> = {
    'Pending Assistant': 'status_pendingAssistant', 'Pending Finance': 'status_pendingFinance', 'Approved': 'status_approved', 'Rejected': 'status_rejected', 'Ready for Driver': 'status_readyDriver', 'Partially Shipped': 'status_partiallyShipped', 'In Transit': 'status_inTransit', 'Completed': 'status_completed', 'On Hold': 'status_onHold', 'Emergency': 'status_emergency', 'Canceled': 'status_canceled'
  };
  const style = status ? styles[status] : 'bg-gray-800 text-gray-400';
  const label = status ? t[statusKeyMap[status]] || status : status;
  return <span className={`px-3 py-1 rounded-lg text-[9px] font-bold border ${style} whitespace-nowrap uppercase tracking-widest`}>{label}</span>;
};

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>(() => (localStorage.getItem('ifcg_lang') as 'ar' | 'en') || 'ar');
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('ifcg_lang', lang);
  }, [lang]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = sessionStorage.getItem('ifcg_user_session_v4');
    return saved ? JSON.parse(saved) : null;
  });

  const [globalOrders, setGlobalOrders] = useState<SalesOrder[]>(() => {
    const saved = localStorage.getItem('ifcg_shared_db_v4');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loginTargetRole, setLoginTargetRole] = useState<Role | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isMagicImportOpen, setIsMagicImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const initialOrderState: SalesOrder = {
    customerName: '', areaLocation: '', orderDate: new Date().toISOString().split('T')[0], 
    receivingDate: '', deliveryShift: 'أول نقلة', deliveryType: 'Own Cars', items: [], 
    overallNotes: '', serialNumber: ''
  };

  const [order, setOrder] = useState<SalesOrder>(() => {
    const draft = localStorage.getItem('ifcg_order_draft');
    return draft ? JSON.parse(draft) : initialOrderState;
  });

  // Persist draft
  useEffect(() => {
    if (activeTab === 'pending' && !editingId && order.items.length > 0) {
      localStorage.setItem('ifcg_order_draft', JSON.stringify(order));
    }
  }, [order, activeTab, editingId]);

  useEffect(() => {
    if (currentUser) sessionStorage.setItem('ifcg_user_session_v4', JSON.stringify(currentUser));
    else sessionStorage.removeItem('ifcg_user_session_v4');
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('ifcg_shared_db_v4', JSON.stringify(globalOrders));
  }, [globalOrders]);

  const handleOrderSubmit = async () => {
    if (!order.customerName || !order.areaLocation || order.items.length === 0 || !order.receivingDate) {
      setValidationError(t.validationItemDetails + " " + t.validationClient);
      return;
    }
    setSubmissionStatus('submitting');
    await new Promise(r => setTimeout(r, 1200));

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
    localStorage.removeItem('ifcg_order_draft');
    setSubmissionStatus('success');
    
    setTimeout(() => {
      setSubmissionStatus('idle');
      setEditingId(null);
      setOrder(initialOrderState);
      setActiveTab('history');
    }, 2000);
  };

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
  };

  const filtered = useMemo(() => {
    let base = globalOrders;
    if (currentUser?.role === 'sales') {
      base = base.filter(o => o.createdBy === currentUser.email);
    } else if (currentUser?.role === 'assistant') {
      if (activeTab === 'pending') base = base.filter(o => o.status === 'Pending Assistant');
    } else if (currentUser?.role === 'finance') {
      if (activeTab === 'pending') base = base.filter(o => o.status === 'Pending Finance');
    } else if (currentUser?.role === 'warehouse') {
      if (activeTab === 'pending') base = base.filter(o => o.status === 'Approved' || o.status === 'On Hold');
    }

    return base.filter(o => 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.serialNumber?.includes(searchTerm)
    );
  }, [globalOrders, currentUser, activeTab, searchTerm]);

  // --- LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-blue-600 shadow-2xl shadow-blue-500/20 mb-4">
              <Wheat className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">IFCG <span className="text-blue-500">PORTAL</span></h1>
            <p className="text-gray-500 font-medium text-sm">{t.loginSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {(['sales', 'assistant', 'finance', 'warehouse', 'driver_supervisor'] as Role[]).map(role => (
              <button 
                key={role} 
                onClick={() => setLoginTargetRole(role)}
                className="group flex items-center justify-between p-5 rounded-3xl glass hover:border-blue-500/50 hover:bg-blue-600/5 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors">
                    {role === 'sales' && <User size={20}/>}
                    {role === 'assistant' && <ShieldCheck size={20}/>}
                    {role === 'finance' && <FileSpreadsheet size={20}/>}
                    {role === 'warehouse' && <Package size={20}/>}
                    {role === 'driver_supervisor' && <Truck size={20}/>}
                  </div>
                  <span className="font-bold text-gray-200">{t[`role_${role}` as keyof typeof t] as string}</span>
                </div>
                <ArrowRight size={18} className="text-gray-600 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>

        {loginTargetRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="w-full max-w-sm glass p-10 rounded-[40px] text-center border border-white/5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto mb-6">
                <Lock className="text-blue-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">{t.enterPin}</h2>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-8">{t[`role_${loginTargetRole}` as keyof typeof t] as string}</p>
              
              <input 
                autoFocus 
                type="password" 
                placeholder="••••" 
                className="w-full bg-gray-950 border-2 border-gray-800 rounded-2xl py-5 text-center text-4xl tracking-[0.5em] text-white focus:border-blue-600 outline-none transition-all mb-8 shadow-inner"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const user = getUserByPin((e.target as HTMLInputElement).value);
                    if (user && user.role === loginTargetRole) {
                      setCurrentUser(user);
                      setLoginTargetRole(null);
                    } else alert(t.invalidCode);
                  }
                }}
              />
              <button onClick={() => setLoginTargetRole(null)} className="text-gray-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">{t.cancel}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN APP VIEW ---
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 glass border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg"><Wheat size={20} className="text-white"/></div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white">IFCG <span className="text-blue-500">CLOUD</span></h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{t[`role_${currentUser.role}` as keyof typeof t] as string}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all"><Languages size={18}/></button>
            <button onClick={() => setCurrentUser(null)} className="p-3 rounded-2xl bg-red-900/10 border border-red-900/10 text-red-500 hover:bg-red-600 hover:text-white transition-all"><LogOut size={18}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Dashboard Tabs */}
        <div className="p-1.5 rounded-3xl bg-gray-900/50 border border-gray-800 flex shadow-2xl">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 py-4 text-xs font-black rounded-2xl transition-all uppercase tracking-widest ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-gray-500 hover:text-gray-300'}`}>
            {currentUser.role === 'sales' ? t.newOrder : t.tab_reviewPending}
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-xs font-black rounded-2xl transition-all uppercase tracking-widest ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-gray-500 hover:text-gray-300'}`}>
            {currentUser.role === 'sales' ? t.myHistory : t.tab_fullHistory}
          </button>
        </div>

        {/* Main Interface Content */}
        {activeTab === 'pending' && currentUser.role === 'sales' && submissionStatus !== 'success' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className={CARD_CLASS}>
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500"><ListPlus size={22}/></div>
                  <h2 className="text-2xl font-black text-white">{editingId ? t.editingOrder : t.newOrder}</h2>
                </div>
                <button 
                  onClick={() => setIsMagicImportOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Sparkles size={16}/> Magic AI
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Client Section */}
                <div className="space-y-6 md:col-span-2">
                   <div className="flex items-center gap-2 mb-2 border-b border-gray-800 pb-2">
                     <Info size={14} className="text-blue-500" />
                     <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{t.clientInfo}</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>{t.clientName}</label>
                      <input 
                        className={INPUT_CLASS} 
                        list="clients" 
                        value={order.customerName} 
                        onChange={e => {
                          const found = CUSTOMER_LIST.find(c => c.name === e.target.value);
                          setOrder({...order, customerName: e.target.value, areaLocation: found ? found.location : order.areaLocation});
                        }} 
                        placeholder={t.selectClient as string} 
                      />
                      <datalist id="clients">{CUSTOMER_LIST.map(c => <option key={c.name} value={c.name} />)}</datalist>
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>{t.location}</label>
                      <input className={INPUT_CLASS} value={order.areaLocation} onChange={e => setOrder({...order, areaLocation: e.target.value})} placeholder={t.areaAddress as string} />
                    </div>
                   </div>
                </div>

                {/* Logistics Section */}
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>{t.receivingDate}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18}/>
                    <input type="date" className={`${INPUT_CLASS} pl-12`} value={order.receivingDate} onChange={e => setOrder({...order, receivingDate: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={LABEL_CLASS}>{t.deliveryShift}</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18}/>
                    <select className={`${INPUT_CLASS} pl-12 appearance-none cursor-pointer`} value={order.deliveryShift} onChange={e => setOrder({...order, deliveryShift: e.target.value as any})}>
                      {DELIVERY_SHIFTS.map(s => <option key={s} value={s}>{s === 'أول نقلة' ? t.shift_First : s === 'ثانى نقلة' ? t.shift_Second : t.shift_Night}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="mt-12 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-blue-500"/>
                    <h3 className="font-black text-white uppercase tracking-widest text-xs">{t.orderItems}</h3>
                  </div>
                  <button 
                    onClick={() => setOrder({...order, items: [...order.items, {id: Math.random().toString(36).substr(2, 9), itemName: '', quantity: 1}]})}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Plus size={14}/> {t.addItem}
                  </button>
                </div>

                {order.items.length === 0 ? (
                  <div className="py-12 text-center bg-gray-950/30 rounded-3xl border border-dashed border-gray-800">
                    <Package className="w-12 h-12 text-gray-800 mx-auto mb-3" />
                    <p className="text-gray-600 text-xs font-bold">{t.noItems}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={item.id} className="flex gap-3 items-center group animate-in slide-in-from-left duration-300">
                        <div className="relative flex-1">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={14}/>
                           <input 
                            className={`${INPUT_CLASS} pl-10`} 
                            list="products" 
                            value={item.itemName} 
                            onChange={e => {
                              const n = [...order.items]; n[idx].itemName = e.target.value; setOrder({...order, items: n});
                            }} 
                            placeholder={t.searchProduct as string} 
                          />
                          <datalist id="products">{PRODUCT_CATALOG.map(p => <option key={p} value={p} />)}</datalist>
                        </div>
                        <div className="relative w-24">
                          <input 
                            type="number" 
                            className={`${INPUT_CLASS} text-center font-black !px-2`} 
                            value={item.quantity} 
                            onChange={e => {
                              const n = [...order.items]; n[idx].quantity = parseInt(e.target.value) || 0; setOrder({...order, items: n});
                            }} 
                          />
                        </div>
                        <button 
                          onClick={() => setOrder({...order, items: order.items.filter(i => i.id !== item.id)})}
                          className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                        >
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Section */}
              <div className="mt-12 space-y-6 pt-8 border-t border-gray-800">
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>{t.overallNotes}</label>
                  <textarea 
                    className={`${INPUT_CLASS} h-28 resize-none`} 
                    value={order.overallNotes} 
                    onChange={e => setOrder({...order, overallNotes: e.target.value})} 
                    placeholder={t.overallNotesPlaceholder as string} 
                  />
                </div>

                {validationError && (
                  <div className="p-4 bg-red-900/10 text-red-400 rounded-2xl border border-red-800/20 text-xs font-bold flex items-center gap-3">
                    <AlertCircle size={18}/> {validationError}
                  </div>
                )}

                <button 
                  onClick={handleOrderSubmit} 
                  disabled={submissionStatus === 'submitting'}
                  className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50"
                >
                  {submissionStatus === 'submitting' ? <RefreshCw className="animate-spin" /> : (editingId ? <CheckCircle size={24}/> : <Send size={20} />)}
                  {editingId ? t.updateOrder : t.submitOrder}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Feedback */}
        {submissionStatus === 'success' && (
          <div className="text-center py-24 animate-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-4xl font-black text-white mb-2">{t.successTitle}</h2>
            <p className="text-gray-500 font-medium">{t.successMsg}</p>
          </div>
        )}

        {/* List View / History */}
        {(activeTab === 'history' || (activeTab === 'pending' && currentUser.role !== 'sales')) && submissionStatus !== 'success' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={20}/>
              <input 
                className={`${INPUT_CLASS} pl-14 bg-gray-900 border-gray-800/50 h-16 text-lg rounded-3xl shadow-xl`} 
                placeholder={t.searchPlaceholder as string} 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>

            {filtered.length === 0 ? (
              <div className="py-24 text-center glass rounded-[40px] border border-dashed border-gray-800">
                <ClipboardList className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                <p className="text-gray-600 font-bold uppercase tracking-widest">{t.emptySearch}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filtered.map(o => (
                  <div key={o.id} className="glass rounded-[32px] p-8 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">#{o.serialNumber}</span>
                          <StatusBadge status={o.status} t={t} />
                        </div>
                        <h3 className="text-2xl font-black text-white leading-none tracking-tight">{o.customerName}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={14} className="text-blue-500"/> {o.areaLocation}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{o.receivingDate}</div>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{o.deliveryShift}</div>
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-3">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                          <span className="text-gray-400 font-bold">{it.itemName}</span>
                          <span className="text-white font-black">x{it.quantity}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t.totalQty}</span>
                        <span className="text-blue-400 font-black text-xl">{o.items.reduce((s, i) => s + i.quantity, 0)}</span>
                      </div>
                    </div>

                    {/* Quick Actions based on role */}
                    <div className="mt-6 flex gap-2">
                      {currentUser.role === 'sales' && o.status === 'Pending Assistant' && (
                        <button 
                          onClick={() => { setEditingId(o.id!); setOrder({...o}); setActiveTab('pending'); }} 
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <Pencil size={14}/> {t.editOrder}
                        </button>
                      )}
                      
                      {currentUser.role === 'assistant' && o.status === 'Pending Assistant' && (
                        <>
                          <button onClick={() => updateStatus(o.id!, { status: 'Pending Finance' }, "Approved by Support")} className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-blue-700">{t.approveQty}</button>
                          <button onClick={() => updateStatus(o.id!, { status: 'Rejected' }, "Rejected by Support")} className="flex-1 bg-red-900/20 text-red-500 py-3.5 rounded-2xl font-bold text-xs border border-red-900/20">{t.reject}</button>
                        </>
                      )}

                      {currentUser.role === 'finance' && o.status === 'Pending Finance' && (
                        <button onClick={() => updateStatus(o.id!, { status: 'Approved' }, "Finance Approved")} className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-emerald-700">{t.approveOrder}</button>
                      )}

                      {currentUser.role === 'warehouse' && (o.status === 'Approved' || o.status === 'On Hold') && (
                        <button onClick={() => updateStatus(o.id!, { status: 'Ready for Driver' }, "Order Prepared")} className="w-full bg-orange-600 text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-orange-700">{t.markReady}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <MagicParser 
        isOpen={isMagicImportOpen} 
        onClose={() => setIsMagicImportOpen(false)} 
        onParsed={(data) => setOrder({...order, ...data})} 
      />
    </div>
  );
}