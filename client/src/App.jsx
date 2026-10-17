import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { PublicOnlyRoute, RequireAuth } from './auth/guards.jsx';
import { AppLayout, PublicLayout } from './components/layout/layouts.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { FeedPage } from './pages/FeedPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { PostPage } from './pages/PostPage.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>
        <Route element={<PublicLayout authForm />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastrar" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/foryou" element={<FeedPage key="foryou" feed="foryou" />} />
          <Route path="/seguindo" element={<FeedPage key="seguindo" feed="seguindo" />} />
          <Route path="/perfil/:id" element={<ProfilePage />} />
          <Route path="/post/:id" element={<PostPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
