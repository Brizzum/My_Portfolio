import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page">
      <h1>Portfolio</h1>
      <p>
        A personal collection of work and learnings. The{' '}
        <Link to="/concepts">Concepts Gallery</Link> contains short interactive
        examples, each paired with a summary of the underlying theory and the
        references used.
      </p>
    </div>
  );
}
