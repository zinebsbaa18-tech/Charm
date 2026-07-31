import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ClosetProvider } from './context/ClosetContext';
import { ChatProvider } from './context/ChatContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Detail from './pages/Detail';
import Closet from './pages/Closet';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <ClosetProvider>
            <ChatProvider>
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Layout Routes */}
              <Route path="/" element={<ProtectedRoute><Layout><Chat key="new" /></Layout></ProtectedRoute>} />
              <Route path="/chat" element={<Navigate to="/chat/new" replace />} />
              <Route path="/chat/new" element={<ProtectedRoute><Layout><Chat key="new" /></Layout></ProtectedRoute>} />
              <Route path="/chat/:chatId" element={<ProtectedRoute><Layout><KeyedChat /></Layout></ProtectedRoute>} />
              <Route path="/detail/:id" element={<ProtectedRoute><Layout><KeyedDetail /></Layout></ProtectedRoute>} />
              <Route path="/closet" element={<ProtectedRoute><Layout><Closet /></Layout></ProtectedRoute>} />
              
              {/* Default Redirect */}
              <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ChatProvider>
          </ClosetProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

// Wrap Chat with a key derived from the URL param so React fully remounts
// (clearing all state) when switching between different chats.
function KeyedChat() {
  const { chatId } = useParams();
  return <Chat key={chatId} />;
}

// Wrap Detail with the same pattern for outfit changes.
function KeyedDetail() {
  const { id } = useParams();
  return <Detail key={id} />;
}

export default App;
