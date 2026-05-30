import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Profile from './pages/Profile';
import About from './pages/About';
import ArchivePage from './pages/ArchivePage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryPage from './pages/CategoryPage';
import Admin from './pages/Admin';
import AdminEdit from './pages/AdminEdit';
import Login from './pages/Login';

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
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="categories/:slug" element={<CategoryPage />} />
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
          <Route index element={<Admin />} />
          <Route path="edit" element={<AdminEdit />} />
          <Route path="edit/:id" element={<AdminEdit />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
