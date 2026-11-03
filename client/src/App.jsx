import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { PublicOnlyRoute, RequireAuth, RequireUsername } from './auth/guards.jsx';
import { AppLayout, PublicLayout } from './components/layout/layouts.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { UsernamePage } from './pages/UsernamePage.jsx';
import { FeedPage } from './pages/FeedPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { PostPage } from './pages/PostPage.jsx';
import { SearchPage } from './pages/SearchPage.jsx';

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
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      {/* Fora do PublicOnlyRoute: o link do email precisa abrir mesmo com alguém logado no aparelho. */}
      <Route element={<PublicLayout authForm />}>
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<PublicLayout authForm showLinks={false} />}>
          <Route path="/bem-vindo" element={<UsernamePage />} />
        </Route>
        <Route element={<RequireUsername />}>
          <Route element={<AppLayout />}>
            <Route path="/foryou" element={<FeedPage key="foryou" feed="foryou" />} />
            <Route path="/seguindo" element={<FeedPage key="seguindo" feed="seguindo" />} />
            <Route path="/perfil/:id" element={<ProfilePage />} />
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="/buscar" element={<SearchPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App({ router: Router = BrowserRouter, children }) {
  return (
    <AuthProvider>
      <Router>
        {children}
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
