import {test,expect} from '@playwright/test';
test('optional call never requests devices on load and failure does not interrupt drawing inputs',async({page})=>{
 await page.addInitScript(()=>{(window as unknown as {mediaRequests:number}).mediaRequests=0;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>{(window as unknown as {mediaRequests:number}).mediaRequests++;return Promise.reject(new Error('Unexpected device request'));}});});
 await page.goto('/tests/video-harness.html');
 await expect(page.getByTestId('optional-call')).toContainText('OPCIONAL · HASTA 20 PERSONAS');
 await expect(page.getByRole('button',{name:'Entrar a la llamada'})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {mediaRequests:number}).mediaRequests)).toBe(0);
 await page.getByRole('button',{name:'Entrar a la llamada'}).click();
 await expect(page.getByRole('alert')).toContainText('Conecta Supabase');
 expect(await page.evaluate(()=>(window as unknown as {mediaRequests:number}).mediaRequests)).toBe(0);
 await page.getByRole('textbox',{name:'Tu frase'}).fill('Sigo jugando sin llamada');
 await expect(page.getByRole('textbox',{name:'Tu frase'})).toHaveValue('Sigo jugando sin llamada');
});
