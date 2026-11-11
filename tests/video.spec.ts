import {test,expect} from '@playwright/test';
test('optional call never requests devices on load and failure does not interrupt drawing inputs',async({page})=>{
 await page.addInitScript(()=>{(window as unknown as {mediaRequests:number}).mediaRequests=0;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>{(window as unknown as {mediaRequests:number}).mediaRequests++;return Promise.reject(new Error('Unexpected device request'));}});});
 await page.goto('/tests/video-harness.html');
 await expect(page.getByTestId('optional-call')).toContainText('OPTIONAL · UP TO 20 PEOPLE');
 await expect(page.getByRole('button',{name:'Join the call'})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {mediaRequests:number}).mediaRequests)).toBe(0);
 await page.getByRole('button',{name:'Join the call'}).click();
 await expect(page.getByRole('alert')).toContainText('Connect Supabase');
 expect(await page.evaluate(()=>(window as unknown as {mediaRequests:number}).mediaRequests)).toBe(0);
 await page.getByRole('textbox',{name:'Your phrase'}).fill('I can keep playing without the call');
 await expect(page.getByRole('textbox',{name:'Your phrase'})).toHaveValue('I can keep playing without the call');
});
