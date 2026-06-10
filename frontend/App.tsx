import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';

// Lazy-loaded pages
const Profile = lazy(() => import('./pages/Profile'));
const About = lazy(() => import('./pages/About'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminEdit = lazy(() => import('./pages/AdminEdit'));
const Comments = lazy(() => import('./pages/Comments'));
const Stats = lazy(() => import('./pages/Stats'));
const Users = lazy(() => import('./pages/Users'));
const Notifications = lazy(() => import('./pages/Notifications'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900 dark:border-neutral-100" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  const getBaseRoute = (path: string) => {
    if (path.startsWith('/admin')) return '/admin';
    if (path.startsWith('/login')) return '/login';
    return '/';
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={getBaseRoute(location.pathname)}>
        <Route path="/" element={
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full min-h-screen"
          >
            <Layout />
          </motion.div>
        }>
          <Route index element={<Home />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
          <Route path="about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
          <Route path="archive" element={<Suspense fallback={<PageLoader />}><ArchivePage /></Suspense>} />
          <Route path="categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
          <Route path="categories/:slug" element={<Suspense fallback={<PageLoader />}><CategoryPage /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
        </Route>

        <Route path="/login" element={
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full min-h-screen"
          >
            <Login />
          </motion.div>
        } />

        <Route path="/admin" element={
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full min-h-screen"
          >
            <AdminLayout />
          </motion.div>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
          <Route path="comments" element={<Suspense fallback={<PageLoader />}><Comments /></Suspense>} />
          <Route path="stats" element={<Suspense fallback={<PageLoader />}><Stats /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />
          <Route path="edit" element={<Suspense fallback={<PageLoader />}><AdminEdit /></Suspense>} />
          <Route path="edit/:id" element={<Suspense fallback={<PageLoader />}><AdminEdit /></Suspense>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
