import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileUp, Sparkles, Clock, Compass, Menu, X, LogOut, LogIn, Database, CheckCircle2, RefreshCw, HelpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './FirebaseProvider';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Beranda' },
  { to: '/upload', icon: FileUp, label: 'Data Prota/Prosem' },
  { to: '/generator', icon: Sparkles, label: 'Buat Perangkat' },
  { to: '/references', icon: Compass, label: 'Referensi Industri' },
  { to: '/guide', icon: HelpCircle, label: 'Panduan Publikasi' },
  { to: '/history', icon: Clock, label: 'Riwayat' },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbInfo, setDbInfo] = useState<{ database?: string; time?: string }>({});
  const location = useLocation();
  const { user, signInWithGoogle, logOut } = useAuth();

  const checkDbConnection = async () => {
    setDbStatus('checking');
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'connected') {
          setDbStatus('connected');
          setDbInfo({ database: data.database, time: data.time });
          return;
        }
      }
      setDbStatus('error');
    } catch {
      setDbStatus('error');
    }
  };

  useEffect(() => {
    checkDbConnection();
  }, []);

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-primary text-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center font-bold text-xl text-white">S</div>
            <span className="font-bold tracking-tight leading-none text-lg">Sahabat Ajar<br/><span className="text-sm font-normal opacity-80">Bahasa Inggris</span></span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* InsForge Cloud Storage Status */}
        <div className="mx-4 mb-3 p-3 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={15} className="text-emerald-400" />
              <span className="text-xs font-semibold text-white/90">InsForge DB</span>
            </div>
            <button 
              onClick={checkDbConnection}
              title="Periksa Ulang Koneksi InsForge"
              className="text-white/50 hover:text-white transition-colors"
            >
              <RefreshCw size={12} className={dbStatus === 'checking' ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : dbStatus === 'checking' ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
            <span className="text-[11px] text-white/70">
              {dbStatus === 'connected' ? 'Terhubung (Cloud Aktif)' : dbStatus === 'checking' ? 'Memeriksa...' : 'Koneksi Terputus'}
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 mt-auto">
          {user ? (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3 px-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-white/20 rounded-full" />
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{user.displayName || 'Guru'}</span>
                  <span className="text-xs text-white/60 truncate">{user.email}</span>
                </div>
              </div>
              <button 
                onClick={logOut}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm"
              >
                <LogOut size={16} /> Keluar
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-brand-primary font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <LogIn size={18} /> Masuk Google
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-brand-primary text-white z-50 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center font-bold text-sm text-white">S</div>
          <span className="text-lg font-bold">Sahabat Ajar</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-brand-primary/95 backdrop-blur-sm pt-20 px-4 flex flex-col">
          <nav className="flex flex-col space-y-3 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-4 rounded-xl transition-colors",
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-white/80 hover:bg-white/5"
                )}
              >
                <item.icon size={22} />
                <span className="text-lg font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-4 mb-6 border-t border-white/20">
            {user ? (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User avatar" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-white/20 rounded-full" />
                  )}
                  <div className="flex flex-col text-white">
                    <span className="font-medium">{user.displayName || 'Guru'}</span>
                    <span className="text-sm opacity-80">{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={() => { logOut(); setMobileMenuOpen(false); }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
                >
                  <LogOut size={20} /> Keluar
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-white text-brand-primary font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-lg"
              >
                <LogIn size={20} /> Masuk Google
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-full">
          {!user ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 text-brand-primary">
                <LayoutDashboard size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Selamat Datang di Sahabat Ajar</h2>
              <p className="text-slate-600 mb-8">Silakan masuk menggunakan akun Google Anda untuk menyimpan riwayat perangkat pembelajaran secara cloud agar dapat diakses dari perangkat manapun.</p>
              <button 
                onClick={signInWithGoogle}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 transition-colors shadow-md shadow-brand-primary/20 w-full"
              >
                <LogIn size={20} /> Masuk dengan Google
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
