import {test,expect} from '@playwright/test';
test('room clarity explains ready blockers and updates submission progress',async({page})=>{
 await page.goto('/tests/clarity-harness.html');
 const ready=page.getByRole('region',{name:'Ready check'});
 await expect(page.getByRole('button',{name:'Start game',exact:true})).toBeDisabled();
 await expect(page.locator('#start-reason')).toHaveText('Waiting for Sam to get ready.');
 await page.getByRole('button',{name:'Teammate ready',exact:true}).click();
 await expect(page.getByRole('progressbar',{name:'Players ready'})).toHaveAttribute('aria-valuenow','2');
 await page.getByRole('button',{name:'Start game',exact:true}).click();
 await expect(page.getByText('Game started',{exact:true})).toBeVisible();
 await page.getByText('Quick tip',{exact:true}).click();
 await expect(page.getByText('The reference disappears after 7 seconds. Recreate what you remember.')).toBeVisible();
 await expect(page.getByRole('progressbar',{name:'Players finished'})).toHaveAttribute('aria-valuenow','1');
 await page.getByRole('button',{name:'Teammate finished',exact:true}).click();
 await expect(page.getByRole('progressbar',{name:'Players finished'})).toHaveAttribute('aria-valuenow','2');
});
test('room clarity preserves reveal secrecy and offers replay modes',async({page})=>{
 await page.goto('/tests/clarity-harness.html');
 await expect(page.getByText('A secret silly interpretation',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Reveal next',exact:true}).click();
 await expect(page.getByText('A secret silly interpretation',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Finish reveal',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Next game',exact:true}).first()).toBeVisible();
 const replay=page.locator('.replay-menu').last();
 await replay.getByRole('button',{name:'Try another mode',exact:true}).click();
 await replay.getByRole('combobox',{name:'Next game mode'}).selectOption('memory');
 await replay.getByRole('button',{name:'Back to lobby',exact:true}).click();
 await expect(page.getByLabel('Next mode')).toHaveText('memory');
});
test('room clarity microphone meter reflects input without requesting a new device',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>{throw Error('Unexpected device request')}})});
 await page.goto('/tests/clarity-harness.html');
 const meter=page.getByRole('meter',{name:'Microphone input level'});
 await expect(meter).toHaveAttribute('aria-valuenow','0');
 await page.getByRole('button',{name:'Toggle test microphone'}).click();
 await expect(meter).toHaveAttribute('aria-valuenow','60');
 await page.getByRole('button',{name:'Toggle test microphone'}).click();
 await expect(meter).toHaveAttribute('aria-valuenow','0');
});
test('room clarity fits mobile and respects reduced motion',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/tests/clarity-harness.html');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 expect(await page.locator('.round-guide').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});
