import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth/Auth';
import ClientList from './components/Clientes/ClientList';
import ContactList from './components/Contatos/ContactList';
import Reports from './components/Relatorio/Reports';
import { Users, UserCircle, FileText, LogOut } from 'lucide-react';
import logo from './assets/logo.png';

type TabType = 'clients' | 'contacts' | 'reports';

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const tabs = [
    { id: 'clients' as TabType, label: 'Clientes', icon: Users },
    { id: 'contacts' as TabType, label: 'Contatos', icon: UserCircle },
    { id: 'reports' as TabType, label: 'Relatórios', icon: FileText },
  ];

  return (
    <div className="min-h-screen app-bg">
      <nav className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between h-auto sm:h-16 gap-2 sm:gap-0 py-3 sm:py-0">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                Sistema de Cadastro
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm mb-6 p-2 print:hidden">
          <div className="flex gap-2 overflow-x-auto sm:overflow-visible px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`sm:flex-1 flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={{ minWidth: 120 }}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {activeTab === 'clients' && <ClientList />}
          {activeTab === 'contacts' && <ContactList />}
          {activeTab === 'reports' && <Reports />}
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
