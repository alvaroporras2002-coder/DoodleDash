/** The open ink loop is shared with public/brand-mark.svg and the favicon. */
export function Brand(){
 return <span className="brand">
  <svg className="brand-mark" viewBox="0 0 88 56" aria-hidden="true" fill="none">
   <path d="M8 40C17 49 33 46 43 39C52 33 59 20 51 15C43 8 31 19 31 29C30 43 40 48 50 45C59 44 67 33 74 34C81 34 81 41 78 45" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="M66 16L72 4M73 19L83 10" stroke="var(--green)" strokeWidth="4.2" strokeLinecap="round"/>
  </svg>
  <span className="brand-name">doodleonline</span>
 </span>;
}
