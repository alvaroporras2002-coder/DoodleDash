import {useState} from 'react';
import ReactDOM from 'react-dom/client';
import DrawingCanvas from '../src/components/DrawingCanvas';
import '../src/styles.css';
function Harness(){const [image,setImage]=useState(''),[submitted,setSubmitted]=useState(false);return <main className="page-width"><DrawingCanvas draftKey="autosave-test" onDraftChange={setImage} onSubmit={()=>setSubmitted(true)}/><output aria-label="Submitted">{String(submitted)}</output>{image&&<img alt="Latest automatic drawing" src={image}/>}</main>}
ReactDOM.createRoot(document.getElementById('root')!).render(<Harness/>);
