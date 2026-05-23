import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { memo } from 'react';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Profile from './pages/Profile';
import ArchivePage from './pages/ArchivePage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryPage from './pages/CategoryPage';
import Admin from './pages/Admin';
import AdminEdit from './pages/AdminEdit';
import Login from './pages/Login';
import AIAssistant from './components/AIAssistant';

const MemoizedAIAssistant = memo(AIAssistant);

function App() {
  return (
    <BrowserRouter>
      <MemoizedAIAssistant />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="categories/:slug" element={<CategoryPage />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Admin />} />
          <Route path="edit" element={<AdminEdit />} />
          <Route path="edit/:id" element={<AdminEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
