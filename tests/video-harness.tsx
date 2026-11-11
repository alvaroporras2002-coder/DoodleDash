// Development test fixture only; not an entry in the production Vite build.
import ReactDOM from 'react-dom/client';
import VideoCall from '../src/components/VideoCall';
import '../src/styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<main><VideoCall code="ABC123"/><label>Tu frase<textarea aria-label="Tu frase"/></label></main>);
