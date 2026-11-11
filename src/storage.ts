function safeStorage(kind:'localStorage'|'sessionStorage'){
 return {
  getItem(key:string){try{return window[kind].getItem(key)}catch{return null}},
  setItem(key:string,value:string){try{window[kind].setItem(key,value)}catch{/* Storage is optional; keep the game usable. */}},
  removeItem(key:string){try{window[kind].removeItem(key)}catch{/* Storage is optional. */}}
 };
}
export const localStore=safeStorage('localStorage');
export const sessionStore=safeStorage('sessionStorage');
