import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Gallery from './pages/Gallery.jsx';
import { CONCEPTS } from './concepts/index.js';

export default function App() {
  return (
    <div className="app">
      <header className="site-header">
        <NavLink to="/" className="brand">Portfolio</NavLink>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/concepts">Concepts Gallery</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/concepts" element={<Gallery />} />
          {CONCEPTS.map(c => (
            <Route key={c.slug} path={`/concepts/${c.slug}`} element={<c.Component />} />
          ))}
          <Route path="*" element={<p className="page">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
