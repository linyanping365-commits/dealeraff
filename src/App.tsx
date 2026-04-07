import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Tags,
  MousePointerClick,
  Settings,
  Wallet,
  SlidersHorizontal,
  Link as LinkIcon,
  Bell,
  LogOut,
  Menu,
  Maximize,
  User,
  Minus,
  Square,
  X,
  Clock,
  Globe,
  Mail,
  Lock,
  ArrowRight,
  Download,
  RefreshCw,
  Database,
  Maximize2,
  MousePointer2,
  Info,
  Users,
  Save,
  Search,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { offersData } from './offersData';
import { Toaster, toast } from 'sonner';

const data = [
  { time: '00:00', clicks: 0, conversions: 0, payout: 0 },
  { time: '03:00', clicks: 0, conversions: 0, payout: 0 },
  { time: '06:00', clicks: 0, conversions: 0, payout: 0 },
  { time: '09:00', clicks: 0, conversions: 0, payout: 0 },
  { time: '12:00', clicks: 0, conversions: 0, payout: 0 },
  { time: '15:00', clicks: 0, conversions: 0, payout: 0 },
  { time: '18:00', clicks: 0, conversions: 0, payout: 0 },
  { time: '21:00', clicks: 0, conversions: 0, payout: 0 },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [adminTab, setAdminTab] = useState('link-management');
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    availableBalance: 0,
    pendingBalance: 0,
    totalEarned: 0,
    totalWithdrawals: 0,
    offerId: '',
    taskName: 'Manual Adjustment',
    taskAmount: 10.00
  });
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [offerSearchName, setOfferSearchName] = useState('');
  const [offerSearchId, setOfferSearchId] = useState('');

  const itemsPerPage = 50;
  const totalPages = Math.ceil(offersData.length / itemsPerPage);
  
  const filteredOffers = offersData.filter(offer => {
    const matchName = offerSearchName ? offer.title.toLowerCase().includes(offerSearchName.toLowerCase()) : true;
    const matchId = offerSearchId ? offer.id.toString().includes(offerSearchId) : true;
    return matchName && matchId;
  });
  
  const currentOffers = filteredOffers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    let userUnsubscribe: () => void;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          const isDefaultAdmin = user.email === '890305@wty.com';
          
          // Ensure user is permanently recorded in Firestore
          await setDoc(userRef, {
            email: user.email,
            role: isDefaultAdmin ? 'admin' : (userDoc.exists() ? userDoc.data().role : 'user'),
            lastLogin: serverTimestamp(),
            // Only set createdAt if it doesn't exist
            ...(userDoc.exists() ? {} : { 
              createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : serverTimestamp() 
            })
          }, { merge: true });

          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().role === 'admin' || isDefaultAdmin);
          } else {
            setIsAdmin(isDefaultAdmin);
          }

          // Listen to current user data
          userUnsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setCurrentUserData(doc.data());
            }
          });

        } catch (error) {
          console.error("Error fetching/updating user role:", error);
          setIsAdmin(user.email === '890305@wty.com');
        }
      } else {
        setIsAdmin(false);
        setCurrentUserData(null);
        if (userUnsubscribe) userUnsubscribe();
      }
      setIsLoading(false);
    });
    return () => {
      unsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentView === 'admin' && adminTab === 'user-management') {
      const usersRef = collection(db, 'users');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRegisteredUsers(usersList);
      }, (error) => {
        console.error("Error fetching users:", error);
      });
      return () => unsubscribe();
    }
  }, [isAuthenticated, currentView, adminTab]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Login successful!');
        setCurrentView('dashboard');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        await signOut(auth);
        setIsLoginMode(true);
        toast.success('Registration successful! Please log in.');
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
      toast.error(error.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!');
    } catch (error) {
      console.error('Logout failed', error);
      toast.error('Logout failed');
    }
  };

  const formattedTime = currentTime.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  });

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditForm({
      availableBalance: user.availableBalance || 0,
      pendingBalance: user.pendingBalance || 0,
      totalEarned: user.totalEarned || 0,
      totalWithdrawals: user.totalWithdrawals || 0,
      offerId: '',
      taskName: 'Manual Adjustment',
      taskAmount: 10.00
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await setDoc(userRef, {
        availableBalance: Number(editForm.availableBalance),
        pendingBalance: Number(editForm.pendingBalance),
        totalEarned: Number(editForm.totalEarned),
        totalWithdrawals: Number(editForm.totalWithdrawals),
      }, { merge: true });
      
      // If we wanted to add a task to a subcollection, we could do it here
      // e.g. await addDoc(collection(userRef, 'tasks'), { name: editForm.taskName, amount: Number(editForm.taskAmount), date: serverTimestamp() });
      
      setEditingUser(null);
      toast.success('User data updated successfully!');
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error('Failed to update user data.');
    }
  };

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-[#1a1e2d] text-white">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full font-sans">
        <Toaster position="top-center" />
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-b from-[#2b52ff] to-[#1e3ab8] p-12 relative overflow-hidden">
          {/* Grid Background Overlay */}
          <div 
            className="absolute inset-0 opacity-10" 
            style={{ 
              backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }}
          ></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-[#2b52ff] font-bold text-xl">
                D
              </div>
              <span className="text-white text-2xl font-bold tracking-wide">dealeraff</span>
            </div>

            <h1 className="text-white text-5xl font-bold leading-tight mb-6">
              Scale Your<br />Performance<br />With Precision.
            </h1>
            
            <p className="text-blue-100 text-lg mb-12 max-w-md">
              Join the world's most advanced CPA network. Real-time tracking, exclusive offers, and dedicated support.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <Globe className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Global Reach</h3>
                  <p className="text-blue-200">Access offers across 150+ countries.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-blue-200 text-sm mt-12">
            © 2026 Dealeraff Network. All rights reserved.
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-[#1a1e2d]">
          <div className="w-full max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-white mb-2">
              {isLoginMode ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-gray-400 mb-8">
              {isLoginMode ? 'Enter your credentials to access your dashboard.' : 'Sign up to get started with Dealeraff.'}
            </p>

            {authError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 border border-gray-700/50 rounded-lg bg-[#151824] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2b52ff] focus:border-transparent transition-all"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Password</label>
                  {isLoginMode && (
                    <a href="#" className="text-sm text-[#2b52ff] hover:text-blue-400 transition-colors">Forgot Password?</a>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 border border-gray-700/50 rounded-lg bg-[#151824] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2b52ff] focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#2b52ff] hover:bg-blue-600 text-white py-3.5 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2b52ff] focus:ring-offset-[#1a1e2d]"
              >
                {isLoginMode ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} />
              </button>
            </form>

            <p className="mt-8 text-center text-gray-400">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setAuthError('');
                }} 
                className="text-[#2b52ff] hover:text-blue-400 font-medium transition-colors"
              >
                {isLoginMode ? 'Sign Up Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f4f6f9] font-sans text-sm">
      <Toaster position="top-center" />
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1e2d] text-gray-400 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center justify-center bg-[#151824]">
          <h1 className="text-white text-2xl font-bold tracking-wider">dealeraff</h1>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-6 py-3 mx-4 rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-[#635bff] text-white' : 'hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard size={18} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setCurrentView('all-offers')}
            className={`w-full flex items-center gap-3 px-6 py-3 mx-4 rounded-md transition-colors ${currentView === 'all-offers' ? 'bg-[#635bff] text-white' : 'hover:text-white hover:bg-white/5'}`}
          >
            <Tags size={18} />
            <span className="font-medium">All Offers</span>
          </button>
          <button 
            onClick={() => setCurrentView('clicks')}
            className={`w-full flex items-center gap-3 px-6 py-3 mx-4 rounded-md transition-colors ${currentView === 'clicks' ? 'bg-[#635bff] text-white' : 'hover:text-white hover:bg-white/5'}`}
          >
            <MousePointerClick size={18} />
            <span className="font-medium">Clicks</span>
          </button>
          <button 
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center gap-3 px-6 py-3 mx-4 rounded-md transition-colors ${currentView === 'settings' ? 'bg-[#635bff] text-white' : 'hover:text-white hover:bg-white/5'}`}
          >
            <Settings size={18} />
            <span className="font-medium">Settings</span>
          </button>
          <button 
            onClick={() => setCurrentView('wallet')}
            className={`w-full flex items-center gap-3 px-6 py-3 mx-4 rounded-md transition-colors ${currentView === 'wallet' ? 'bg-[#635bff] text-white' : 'hover:text-white hover:bg-white/5'}`}
          >
            <Wallet size={18} />
            <span className="font-medium">Wallet</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => setCurrentView('admin')}
              className={`w-full flex items-center gap-3 px-6 py-3 mx-4 rounded-md transition-colors ${currentView === 'admin' ? 'bg-[#635bff] text-white' : 'hover:text-white hover:bg-white/5'}`}
            >
              <SlidersHorizontal size={18} />
              <span className="font-medium">Admin</span>
            </button>
          )}
          <button 
            onClick={() => setCurrentView('notifications')}
            className={`w-full flex items-center gap-3 px-6 py-3 mx-4 rounded-md transition-colors ${currentView === 'notifications' ? 'bg-[#635bff] text-white' : 'hover:text-white hover:bg-white/5'}`}
          >
            <Bell size={18} />
            <span className="font-medium">Notifications</span>
          </button>
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#ff7a00] text-white flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/10 rounded-md">
              <Menu size={20} />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-md">
              <Maximize size={18} />
            </button>
            <div className="flex flex-col ml-2">
              <span className="text-[10px] uppercase tracking-wider opacity-80">Current Panel Time:</span>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Clock size={14} />
                {formattedTime}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <img src="https://flagcdn.com/w20/us.png" alt="US Flag" className="w-5 h-auto rounded-sm" />
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {currentView === 'dashboard' && (
          <div className="flex-1 overflow-auto p-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Total Earned Card */}
            <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#00c2ff] text-white text-center py-2 font-semibold">
                Total Earned
              </div>
              <div className="flex divide-x divide-gray-100">
                <div className="flex-1 p-4 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Approved Income</div>
                  <div className="text-xl text-gray-600">$ {(currentUserData?.totalEarned || 0).toFixed(2)}</div>
                </div>
                <div className="flex-1 p-4 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Pending Income</div>
                  <div className="text-xl text-gray-600">$ {(currentUserData?.pendingBalance || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Today Card */}
            <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#8b5cf6] text-white text-center py-2 font-semibold">
                Today
              </div>
              <div className="flex divide-x divide-gray-100">
                <div className="flex-1 p-4 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Approved Income</div>
                  <div className="text-xl text-gray-600">$ {(currentUserData?.totalEarned || 0).toFixed(2)}</div>
                </div>
                <div className="flex-1 p-4 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Pending Income</div>
                  <div className="text-xl text-gray-600">$ {(currentUserData?.pendingBalance || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#10b981] text-white text-center py-2 font-semibold">
                Balance
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Withdrawable</div>
                <div className="text-xl text-[#10b981] font-bold">$ {(currentUserData?.availableBalance || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Summary Chart */}
          <div className="bg-white rounded-md shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">Summary</span>
                <select className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-600 outline-none focus:border-blue-400">
                  <option>Today</option>
                  <option>Yesterday</option>
                  <option>This Week</option>
                  <option>This Month</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <button className="hover:text-gray-600"><Minus size={14} /></button>
                <button className="hover:text-gray-600"><Square size={12} /></button>
                <button className="hover:text-gray-600"><X size={14} /></button>
              </div>
            </div>

            <div className="p-6">
              {/* Chart Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="text-center">
                  <div className="text-[#ff4d4f] text-sm mb-1">Approved Income</div>
                  <div className="text-2xl font-bold text-[#ff4d4f]">$ {(currentUserData?.totalEarned || 0).toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#fa8c16] text-sm mb-1">Pending Income</div>
                  <div className="text-2xl font-bold text-[#fa8c16]">$ {(currentUserData?.pendingBalance || 0).toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#52c41a] text-sm mb-1">Conversions</div>
                  <div className="text-2xl font-bold text-[#52c41a]">0</div>
                </div>
                <div className="text-center">
                  <div className="text-[#1890ff] text-sm mb-1">Clicks</div>
                  <div className="text-2xl font-bold text-[#1890ff]">0</div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9ca3af' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      domain={[0, 4]}
                      ticks={[0, 1, 2, 3, 4]}
                    />
                    <Tooltip />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="square"
                      iconSize={10}
                      wrapperStyle={{ top: -20, fontSize: '12px', color: '#9ca3af' }}
                    />
                    <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#86efac" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="conversions" name="Conversions" stroke="#cbd5e1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="payout" name="Payout" stroke="#f9a8d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* All Offers Content */}
        {currentView === 'all-offers' && (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">All Offers</h2>
            
            {/* Filters */}
            <div className="bg-white rounded-md shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between p-4 border-b border-gray-50">
                <span className="font-bold text-gray-700">Filters</span>
                <div className="flex items-center gap-2 text-gray-400">
                  <button className="hover:text-gray-600"><Minus size={14} /></button>
                  <button className="hover:text-gray-600"><X size={14} /></button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Offer Name</label>
                    <input 
                      type="text" 
                      value={offerSearchName}
                      onChange={(e) => setOfferSearchName(e.target.value)}
                      className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Offer ID</label>
                    <input 
                      type="text" 
                      value={offerSearchId}
                      onChange={(e) => setOfferSearchId(e.target.value)}
                      className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Incent Allowed</label>
                    <select className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                      <option>All</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stream Type</label>
                    <select className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                      <option>All</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
                    <select className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                      <option>Active</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Category</label>
                    <input type="text" className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toast.info('More filters coming soon!')}
                    className="bg-[#00c2ff] hover:bg-cyan-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    Show More Filters +
                  </button>
                  <button 
                    onClick={() => toast.success('Filters applied successfully!')}
                    className="bg-[#635bff] hover:bg-indigo-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="flex bg-gray-200 rounded overflow-hidden">
                  <button className="px-4 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-300 transition-colors">NO APPROVAL</button>
                  <button className="px-4 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-300 transition-colors">APPROVAL</button>
                  <button className="px-4 py-1.5 text-xs font-bold bg-[#635bff] text-white">ALL</button>
                </div>
                <span className="text-gray-600 font-bold">Total Offers: {offersData.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toast.success('Columns updated!')} className="flex items-center gap-1 bg-[#00c2ff] hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"><LayoutDashboard size={14}/> Columns</button>
                <button onClick={() => toast.success('Export started!')} className="flex items-center gap-1 bg-[#00c2ff] hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"><Download size={14}/> Export</button>
                <button onClick={() => toast.success('Data refreshed!')} className="flex items-center gap-1 bg-[#00c2ff] hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"><RefreshCw size={14}/> Refresh</button>
                <button onClick={() => toast.success('Cache cleared!')} className="flex items-center gap-1 bg-[#00c2ff] hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"><Database size={14}/> Cache</button>
                <button onClick={() => toast.info('Expanded view toggled!')} className="flex items-center gap-1 bg-[#00c2ff] hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"><Maximize2 size={14}/> Expand</button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
              {currentOffers.map((offer) => (
                <div key={offer.id} className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden relative flex flex-col">
                  <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-md z-10">
                    APPROVAL
                  </div>
                  <div className="p-6 flex-1 flex flex-col items-center justify-center border-b border-gray-50">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white font-bold text-xl text-center leading-tight shadow-md mb-4 ${offer.type === 'green' ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-pink-500 to-purple-600'}`}>
                      BEST<br/>OFFER
                    </div>
                    <p className="text-xs text-gray-500 text-center line-clamp-2 h-8 mb-2">
                      (Web/Wap) #H{offer.hNumber} V2 (Biweekly) - High Value Campaign - Global - CC Submit
                    </p>
                    <div className="text-xl font-bold text-gray-800">${offer.price}</div>
                    <div className="text-[10px] text-gray-400">#{offer.id}</div>
                  </div>
                  <div className="p-4 bg-gray-50 flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://dealeraff.com/offer/${offer.id}`);
                        toast.success('Offer link copied to clipboard!');
                      }}
                      className="w-full bg-[#ff6b6b] hover:bg-red-500 text-white py-2 rounded text-sm font-bold transition-colors"
                    >
                      Get Offer Link
                    </button>
                    <div className="flex justify-center gap-1.5">
                      <img src="https://flagcdn.com/w20/us.png" alt="us" className="w-4 h-3 rounded-sm object-cover" />
                      <img src="https://flagcdn.com/w20/kr.png" alt="kr" className="w-4 h-3 rounded-sm object-cover" />
                      <img src="https://flagcdn.com/w20/tw.png" alt="tw" className="w-4 h-3 rounded-sm object-cover" />
                      <img src="https://flagcdn.com/w20/hk.png" alt="hk" className="w-4 h-3 rounded-sm object-cover" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between bg-white p-4 rounded-md shadow-sm border border-gray-100 mt-2 mb-8">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, offersData.length)} of {offersData.length} entries
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center px-4 font-medium text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clicks Content */}
        {currentView === 'clicks' && (
          <div className="flex-1 overflow-auto p-8 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <MousePointer2 className="text-[#635bff]" size={28} />
                  <h2 className="text-3xl font-bold text-[#1a1e2d]">Sync History (Clicks)</h2>
                </div>
                <div className="text-gray-500 font-medium">
                  Total Syncs: 0
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
                {/* Table Header */}
                <div className="grid grid-cols-5 bg-[#f8f9fa] p-4 border-b border-gray-200">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">CLICK ID</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">TASK NAME</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">PAYOUT</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">STATUS</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">TIME</div>
                </div>

                {/* Empty State */}
                <div className="flex flex-col items-center justify-center py-24 bg-white">
                  <MousePointer2 className="text-gray-200 mb-4" size={48} />
                  <p className="text-gray-400 italic mb-1">No synchronization history found yet.</p>
                  <p className="text-gray-400 text-sm">New postbacks will appear here automatically.</p>
                </div>
              </div>

              {/* Info Alert */}
              <div className="bg-[#f0f4ff] border border-[#e0e7ff] rounded-lg p-5">
                <h4 className="text-[#4f46e5] font-bold mb-1">Real-time Synchronization:</h4>
                <p className="text-[#6366f1] text-sm">
                  This page shows the history of all incoming postbacks from external platforms. Successful syncs automatically update your balance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Content */}
        {currentView === 'settings' && (
          <div className="flex-1 overflow-auto p-8 bg-[#f4f6f9]">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-normal text-[#38bdf8] mb-8">Profile Settings</h2>
                
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Email</label>
                    <input 
                      type="email" 
                      defaultValue="890305@wty.com"
                      className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      defaultValue="890305@wty.com"
                      className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Company Name</label>
                    <input 
                      type="text" 
                      placeholder="Company Name"
                      className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm text-gray-400 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Skype</label>
                    <input 
                      type="text" 
                      placeholder="Skype"
                      className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm text-gray-400 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="pt-4">
                    <button className="bg-[#635bff] hover:bg-indigo-600 text-white px-8 py-2.5 rounded text-sm font-medium transition-colors">
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Content */}
        {currentView === 'wallet' && (
          <div className="flex-1 overflow-auto p-8 bg-[#f4f6f9]">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Main Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-normal text-[#38bdf8] mb-8">Withdraw Funds</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Balance Box */}
                  <div className="bg-[#f8f9fa] rounded-lg p-6 border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Balance</div>
                    <div className="text-4xl font-bold text-[#10b981] mb-2">$ {(currentUserData?.availableBalance || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Available for immediate withdrawal</div>
                  </div>
                  
                  {/* Minimum Payout Box */}
                  <div className="bg-[#f8f9fa] rounded-lg p-6 border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Minimum Payout</div>
                    <div className="text-4xl font-bold text-[#334155] mb-2">$ 100</div>
                    <div className="text-xs text-gray-500">Fixed threshold for all publishers</div>
                  </div>
                </div>

                <div className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Paypal Account Email</label>
                    <input 
                      type="email" 
                      placeholder="Enter your Paypal email address"
                      className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Amount to Withdraw (USD)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-400 font-medium">$</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded pl-8 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => toast.error('Insufficient balance for withdrawal. Minimum payout is $100.')}
                      className="bg-[#635bff] hover:bg-indigo-600 text-white px-8 py-3 rounded text-sm font-bold transition-colors"
                    >
                      Request Withdrawal
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Alert */}
              <div className="bg-[#f0f4ff] border border-[#dbeafe] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="text-[#1d4ed8]" size={20} />
                  <h3 className="text-[#1d4ed8] font-bold text-lg">Withdrawal Information</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-[#2563eb] text-sm ml-1">
                  <li>Payments are processed via Paypal only.</li>
                  <li>Minimum withdrawal amount is $100.00 USD.</li>
                  <li>Ensure your Paypal email is correct to avoid payment delays.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Admin Content */}
        {currentView === 'admin' && isAdmin && (
          <div className="flex-1 overflow-auto p-8 bg-[#f8f9fa]">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setAdminTab('link-management')}
                    className={`flex items-center gap-2 text-2xl font-bold transition-colors ${adminTab === 'link-management' ? 'text-[#3b4256]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <LinkIcon size={24} className={adminTab === 'link-management' ? 'text-[#635bff]' : ''} />
                    Link Management
                  </button>
                  <button 
                    onClick={() => setAdminTab('user-management')}
                    className={`flex items-center gap-2 text-2xl font-bold transition-colors ${adminTab === 'user-management' ? 'text-[#3b4256]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Users size={24} />
                    User Management
                  </button>
                </div>
                <button 
                  onClick={() => toast.success('Settings saved successfully!')}
                  className="flex items-center gap-2 bg-[#635bff] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-md font-medium transition-colors shadow-sm"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>

              {/* Main Card */}
              {adminTab === 'link-management' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-[#3b4256] mb-1">Tracking Links (Payout &lt; $15)</h3>
                      <p className="text-gray-500 text-sm">Modify the tracking links for each individual offer ID.</p>
                    </div>
                    <div className="relative w-64">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        placeholder="Search ID or Title..."
                        className="w-full border border-gray-200 rounded-md pl-9 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wider">OFFER ID</div>
                    <div className="col-span-5 text-xs font-bold text-gray-400 uppercase tracking-wider">OFFER TITLE</div>
                    <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wider">PAYOUT</div>
                    <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider">CUSTOM TRACKING LINK</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-100">
                    {[
                      { id: 1230, title: '(Web/Wap) #L22 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 12.81 },
                      { id: 1675, title: '(Web/Wap) #L57 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 11.36 },
                      { id: 1191, title: '(Web/Wap) #L1 V2 (Biweekly) - Premium Offer - US/UK/C...', payout: 10.98 },
                      { id: 2617, title: '(Web/Wap) #L32 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 11.11 },
                      { id: 1475, title: '(Web/Wap) #L48 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 13.79 },
                      { id: 2919, title: '(Web/Wap) #L60 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 13.55 },
                      { id: 1307, title: '(Web/Wap) #L49 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 14.52 },
                      { id: 1170, title: '(Web/Wap) #L33 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 11.84 },
                      { id: 1698, title: '(Web/Wap) #L20 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 11.35 },
                      { id: 2231, title: '(Web/Wap) #L28 V2 (Biweekly) - Premium Offer - US/UK/...', payout: 12.69 },
                    ].filter(offer => 
                      offer.title.toLowerCase().includes(adminSearchQuery.toLowerCase()) || 
                      offer.id.toString().includes(adminSearchQuery)
                    ).map((offer, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                        <div className="col-span-2 text-sm font-medium text-[#635bff]">#{offer.id}</div>
                        <div className="col-span-5 text-sm text-gray-600 truncate pr-4">{offer.title}</div>
                        <div className="col-span-2 text-sm font-bold text-[#10b981]">${offer.payout.toFixed(2)}</div>
                        <div className="col-span-3">
                          <input 
                            type="text" 
                            placeholder="Enter custom link for this ID..."
                            className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === 'user-management' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-[#3b4256] mb-1">Registered Users</h3>
                    <p className="text-gray-500 text-sm">Manage all accounts that have successfully registered or logged in.</p>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider">EMAIL</div>
                    <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider">CREATED AT</div>
                    <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider">LAST LOGIN</div>
                    <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">ACTIONS</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-100">
                    {registeredUsers.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No users found.
                      </div>
                    ) : (
                      registeredUsers.map((u) => (
                        <div key={u.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                          <div className="col-span-3 text-sm font-medium text-[#3b4256] truncate pr-4">{u.email}</div>
                          <div className="col-span-3 text-sm text-gray-500">
                            {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString() : 'N/A'}
                          </div>
                          <div className="col-span-3 text-sm text-gray-500">
                            {u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString() : 'N/A'}
                          </div>
                          <div className="col-span-3 text-right">
                            <button 
                              onClick={() => handleEditUser(u)}
                              className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Content */}
        {currentView === 'notifications' && (
          <div className="flex-1 overflow-auto p-8 bg-[#f4f6f9]">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-normal text-[#38bdf8]">Notifications & History</h2>
                <div className="text-gray-500 text-sm">
                  Total Withdrawals: ${(currentUserData?.totalWithdrawals || 0).toFixed(2)}
                </div>
              </div>

              {/* Main Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
                <div className="p-6 border-b border-gray-50">
                  <h3 className="text-lg font-bold text-[#202b3c] mb-1">Withdrawal History</h3>
                  <p className="text-gray-500 text-sm">Track your payment requests and their status.</p>
                </div>
                
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="text-gray-300" size={32} />
                  </div>
                  <h4 className="text-[#202b3c] font-bold text-lg mb-2">No withdrawal history found</h4>
                  <p className="text-gray-500 text-sm mb-6">When you request a withdrawal, it will appear here.</p>
                  <button 
                    onClick={() => setCurrentView('wallet')}
                    className="text-[#635bff] font-bold text-sm hover:text-indigo-700 transition-colors"
                  >
                    Go to Wallet to request withdrawal
                  </button>
                </div>
              </div>

              {/* Alert Box */}
              <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-[#d97706]" size={20} />
                  <h4 className="text-[#92400e] font-bold">Important Notice</h4>
                </div>
                <p className="text-[#b45309] text-sm leading-relaxed">
                  Withdrawal requests are reviewed by our financial team. Once approved, funds will be sent to your Paypal account. If your request is rejected, the funds will be returned to your balance. For any questions, please contact support.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-lg font-bold text-[#1e293b]">Edit User: {editingUser.email}</h2>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-4">VIRTUAL BALANCE SETTINGS</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Available Balance ($)</label>
                    <input 
                      type="number" 
                      value={editForm.availableBalance}
                      onChange={(e) => setEditForm({...editForm, availableBalance: parseFloat(e.target.value) || 0})}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pending Balance ($)</label>
                    <input 
                      type="number" 
                      value={editForm.pendingBalance}
                      onChange={(e) => setEditForm({...editForm, pendingBalance: parseFloat(e.target.value) || 0})}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total Earned ($)</label>
                    <input 
                      type="number" 
                      value={editForm.totalEarned}
                      onChange={(e) => setEditForm({...editForm, totalEarned: parseFloat(e.target.value) || 0})}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total Withdrawals ($)</label>
                    <input 
                      type="number" 
                      value={editForm.totalWithdrawals}
                      onChange={(e) => setEditForm({...editForm, totalWithdrawals: parseFloat(e.target.value) || 0})}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 italic">* These values will be reflected directly on the user's dashboard.</p>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-4">ADD VIRTUAL TASK (INCREMENTAL)</h3>
                
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Offer ID (编号)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1001"
                      value={editForm.offerId}
                      onChange={(e) => setEditForm({...editForm, offerId: e.target.value})}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Task Name</label>
                    <input 
                      type="text" 
                      value={editForm.taskName}
                      onChange={(e) => setEditForm({...editForm, taskName: e.target.value})}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Amount ($)</label>
                    <input 
                      type="number" 
                      value={editForm.taskAmount}
                      onChange={(e) => setEditForm({...editForm, taskAmount: parseFloat(e.target.value) || 0})}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => toast.success(`Task "${editForm.taskName}" added successfully!`)}
                  className="w-full py-2.5 bg-[#ecfdf5] text-[#059669] font-bold text-sm rounded-md hover:bg-[#d1fae5] transition-colors flex items-center justify-center gap-2"
                >
                  <span>✓</span> + Complete Task & Add to History
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between gap-4">
              <button 
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-sm rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateUser}
                className="flex-1 py-2.5 bg-[#5b45ff] text-white font-bold text-sm rounded-md hover:bg-[#4f3ce0] transition-colors"
              >
                Update Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
