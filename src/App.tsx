import React, { useState, useEffect } from 'react';
import { Clock, Plus, Play, Square, Pencil, Timer, X, Trash2, Download, MoreVertical, Edit, LogIn } from 'lucide-react';
import type { Company, TimeEntry, ActiveTimer, ManualEntryForm } from './types';
import { supabase } from './supabase';

function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => {
    const saved = localStorage.getItem('activeTimer');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState<ManualEntryForm>({
    companyId: '',
    startTime: '',
    endTime: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Check for user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: entriesData } = await supabase
        .from('time_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesData) setCompanies(companiesData.map(c => ({
        ...c,
        userId: c.user_id,
        createdAt: c.created_at
      })));

      if (entriesData) setTimeEntries(entriesData.map(e => ({
        ...e,
        companyId: e.company_id,
        startTime: e.start_time,
        endTime: e.end_time,
        userId: e.user_id,
        createdAt: e.created_at
      })));
    };

    if (user) {
      loadData();
    } else {
      setCompanies([]);
      setTimeEntries([]);
    }
  }, [user]);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    let intervalId: number;
    
    if (activeTimer) {
      intervalId = window.setInterval(() => {
        const startTime = new Date(activeTimer.startTime).getTime();
        const currentTime = new Date().getTime();
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeTimer]);

  // Save active timer to localStorage
  useEffect(() => {
    localStorage.setItem('activeTimer', JSON.stringify(activeTimer));
  }, [activeTimer]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for the confirmation link!');
      setShowLoginForm(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      setShowLoginForm(false);
      setEmail('');
      setPassword('');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const addCompany = async () => {
    if (!newCompanyName.trim() || !user) return;
    
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    const newCompany = {
      name: newCompanyName.trim(),
      color: colors[companies.length % colors.length],
      user_id: user.id
    };
    
    const { data, error } = await supabase
      .from('companies')
      .insert([newCompany])
      .select()
      .single();

    if (error) {
      console.error('Error adding company:', error);
      return;
    }

    if (data) {
      setCompanies([...companies, {
        ...data,
        userId: data.user_id,
        createdAt: data.created_at
      }]);
    }
    
    setNewCompanyName('');
    setShowAddCompany(false);
  };

  const updateCompany = async () => {
    if (!editingCompany || !editingCompany.name.trim()) return;
    
    const { error } = await supabase
      .from('companies')
      .update({ name: editingCompany.name.trim() })
      .eq('id', editingCompany.id);

    if (error) {
      console.error('Error updating company:', error);
      return;
    }

    setCompanies(companies.map(company => 
      company.id === editingCompany.id 
        ? { ...company, name: editingCompany.name.trim() }
        : company
    ));
    setEditingCompany(null);
  };

  const deleteCompany = async (id: string) => {
    if (activeTimer?.companyId === id) {
      stopTimer();
    }
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting company:', error);
      return;
    }

    setCompanies(companies.filter(company => company.id !== id));
    setTimeEntries(timeEntries.filter(entry => entry.companyId !== id));
    setShowDeleteConfirm(null);
  };

  const startTimer = async (companyId: string) => {
    if (!user) return;
    
    if (activeTimer) {
      await stopTimer();
    }

    const now = new Date();
    setActiveTimer({
      companyId,
      startTime: now.toISOString()
    });
  };

  const stopTimer = async () => {
    if (!activeTimer || !user) return;

    const endTime = new Date().toISOString();
    const duration = Math.round(
      (new Date(endTime).getTime() - new Date(activeTimer.startTime).getTime()) / 60000
    );
    
    const newEntry = {
      company_id: activeTimer.companyId,
      start_time: activeTimer.startTime,
      end_time: endTime,
      duration,
      is_manual: false,
      date: new Date(activeTimer.startTime).toISOString().split('T')[0],
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert([newEntry])
      .select()
      .single();

    if (error) {
      console.error('Error adding time entry:', error);
      return;
    }

    if (data) {
      setTimeEntries([{
        ...data,
        id: data.id,
        companyId: data.company_id,
        startTime: data.start_time,
        endTime: data.end_time,
        isManual: data.is_manual,
        userId: data.user_id,
        createdAt: data.created_at
      }, ...timeEntries]);
    }
    
    setActiveTimer(null);
  };

  const addManualEntry = async () => {
    if (!manualEntry.companyId || !manualEntry.startTime || !manualEntry.endTime || !user) return;
    
    const startDateTime = new Date(`${manualEntry.date}T${manualEntry.startTime}`);
    const endDateTime = new Date(`${manualEntry.date}T${manualEntry.endTime}`);
    const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000); // Convert to minutes
    
    const newEntry = {
      company_id: manualEntry.companyId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      duration,
      is_manual: true,
      date: manualEntry.date,
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert([newEntry])
      .select()
      .single();

    if (error) {
      console.error('Error adding manual entry:', error);
      return;
    }

    if (data) {
      setTimeEntries([{
        ...data,
        id: data.id,
        companyId: data.company_id,
        startTime: data.start_time,
        endTime: data.end_time,
        isManual: data.is_manual,
        userId: data.user_id,
        createdAt: data.created_at
      }, ...timeEntries]);
    }

    setManualEntry({
      companyId: '',
      startTime: '',
      endTime: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowManualEntry(false);
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting time entry:', error);
      return;
    }

    setTimeEntries(timeEntries.filter(entry => entry.id !== id));
  };

  const getCompanyTotalTime = (companyId: string) => {
    return timeEntries
      .filter(entry => entry.companyId === companyId)
      .reduce((total, entry) => total + entry.duration, 0);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const entriesByCompany: { [key: string]: TimeEntry[] } = {};
    companies.forEach(company => {
      entriesByCompany[company.id] = timeEntries.filter(entry => entry.companyId === company.id);
    });

    let csvContent = 'Company,Date,Start Time,End Time,Duration,Type\n';

    Object.entries(entriesByCompany).forEach(([companyId, entries]) => {
      const company = companies.find(c => c.id === companyId);
      if (!company) return;

      entries.forEach(entry => {
        csvContent += `"${company.name}",`;
        csvContent += `"${formatDate(entry.date)}",`;
        csvContent += `"${formatTime(entry.startTime)}",`;
        csvContent += `"${formatTime(entry.endTime)}",`;
        csvContent += `"${formatDuration(entry.duration)}",`;
        csvContent += `"${entry.isManual ? 'Manual' : 'Tracked'}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `time-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-center mb-8">
            <Clock className="w-12 h-12 text-blue-600" />
            <h1 className="text-3xl font-bold ml-4">Time Tracker</h1>
          </div>
          
          {!showLoginForm ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(true);
                    setEmail('');
                    setPassword('');
                  }}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="signupEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="signupPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  minLength={6}
                  pattern=".*[a-zA-Z].*[0-9].*|.*[0-9].*[a-zA-Z].*"
                  title="Password must be at least 6 characters and contain both letters and numbers"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Must be at least 6 characters and contain both letters and numbers
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(false);
                    setEmail('');
                    setPassword('');
                  }}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-8 h-8" />
            Time Tracker
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleSignOut}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign Out
            </button>
            <button
              onClick={exportToCSV}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowAddCompany(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          </div>
        </div>

        {/* Active Timer Display */}
        {activeTimer && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-green-600" />
              <span className="font-medium">
                Currently tracking: {companies.find(c => c.id === activeTimer.companyId)?.name}
              </span>
            </div>
            <span className="text-green-700 font-mono">{formatElapsedTime(elapsedTime)}</span>
          </div>
        )}

        {/* Company List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {companies.map(company => (
            <div
              key={company.id}
              className="bg-white rounded-lg shadow-md p-4 border-l-4"
              style={{ borderLeftColor: company.color }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">{company.name}</h3>
                <div className="flex items-center gap-2">
                  {activeTimer?.companyId === company.id ? (
                    <button
                      onClick={() => stopTimer()}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startTimer(company.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  <div className="relative group">
                    <button className="p-1 hover:bg-gray-100 rounded-full">
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 hidden group-hover:block z-10">
                      <button
                        onClick={() => setEditingCompany(company)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Name
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(company.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Company
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-gray-600">
                Total time: {formatDuration(getCompanyTotalTime(company.id))}
              </div>
            </div>
          ))}
        </div>

        {/* Manual Time Entry Button */}
        <button
          onClick={() => setShowManualEntry(true)}
          className="mb-8 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Add Manual Entry
        </button>

        {/* Time Entries List */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Recent Entries
          </h2>
          <div className="space-y-3">
            {timeEntries.map(entry => {
              const company = companies.find(c => c.id === entry.companyId);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{company?.name}</span>
                      <span className="text-sm text-gray-500">
                        {formatDuration(entry.duration)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(entry.date)} • {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {entry.isManual ? 'Manual entry' : 'Tracked'}
                    </span>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Company Modal */}
        {showAddCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Company</h3>
                <button onClick={() => setShowAddCompany(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Company name"
                className="w-full p-2 border rounded-lg mb-4"
              />
              <button
                onClick={addCompany}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Company
              </button>
            </div>
          </div>
        )}

        {/* Edit Company Modal */}
        {editingCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Company</h3>
                <button onClick={() => setEditingCompany(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={editingCompany.name}
                onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                placeholder="Company name"
                className="w-full p-2 border rounded-lg mb-4"
              />
              <button
                onClick={updateCompany}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Update Company
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-600">Delete Company</h3>
                <button onClick={() => setShowDeleteConfirm(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mb-6 text-gray-600">
                Are you sure you want to delete this company? This will also delete all time entries associated with this company. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteCompany(showDeleteConfirm)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Modal */}
        {showManualEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add Manual Time Entry</h2>
                <button
                  onClick={() => setShowManualEntry(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Company
                  </label>
                  <select
                    value={manualEntry.companyId}
                    onChange={(e) => setManualEntry({ ...manualEntry, companyId: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={manualEntry.date}
                    onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={manualEntry.startTime}
                      onChange={(e) => setManualEntry({ ...manualEntry, startTime: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={manualEntry.endTime}
                      onChange={(e) => setManualEntry({ ...manualEntry, endTime: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={addManualEntry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;