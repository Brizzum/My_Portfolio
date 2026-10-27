import { Link } from 'react-router-dom';
import { CONCEPTS } from '../concepts/index.js';

export default function Gallery() {
  return (
    <div className="page">
      <h1>Concepts Gallery</h1>
      <p>Interactive examples for understanding concepts.</p>
      <div className="card-grid">
        {CONCEPTS.map(c => (
          <Link key={c.slug} to={`/concepts/${c.slug}`} className="concept-card">
            <h2>{c.title}</h2>
            <p>{c.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
