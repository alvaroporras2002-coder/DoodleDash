import {test,expect} from '@playwright/test';
test('DoodleOnline identity uses the selected minimal dark design',async({page})=>{
 await page.goto('/');
 await expect(page).toHaveTitle('DoodleOnline — Draw. Guess. Repeat.');
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.getByRole('button',{name:'DoodleOnline home'})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Draw\. Guess\.\s*Repeat\./})).toBeVisible();
 await expect(page.locator('.home-actions').getByRole('button',{name:'Create room',exact:true})).toBeVisible();
 await expect(page.locator('.home-actions').getByRole('button',{name:'Join room',exact:true})).toBeVisible();
 await expect(page.locator('.entry-panel,.studio-art,.mode-grid,.bottom-banner')).toHaveCount(0);
 expect(await page.locator('body').innerText()).not.toMatch(/doordash|doodledash|gartic|express delivery/i);
 const styles=await page.evaluate(()=>({scheme:getComputedStyle(document.documentElement).colorScheme,font:getComputedStyle(document.body).fontFamily}));
 expect(styles.scheme).toBe('dark');expect(styles.font).not.toMatch(/Syne|Outfit/);
 await page.getByRole('button',{name:'Try the canvas',exact:true}).click();
 await page.getByRole('button',{name:'Start drawing',exact:true}).click();
 await expect(page.getByTestId('drawing-canvas')).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download drawing',exact:true}).click();
 expect((await download).suggestedFilename()).toBe('doodleonline-drawing.png');
});
for(const width of [320,390,768,1440]){
 test('DoodleOnline minimal layout fits '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.locator('.home-actions').getByRole('button',{name:'Create room',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Nickname',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'How to play',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'How to play'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });
}
test('DoodleOnline keeps mode choice inside the room and can switch entry forms',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Quick Sketch',exact:true})).toHaveCount(0);
 await page.locator('.home-actions').getByRole('button',{name:'Create room',exact:true}).click();
 await page.getByRole('textbox',{name:'Nickname',exact:true}).fill('Alex');
 await page.locator('.home-actions').getByRole('button',{name:'Join room',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Nickname',exact:true})).toHaveValue('Alex');
 await expect(page.getByRole('textbox',{name:'Room code',exact:true})).toBeVisible();
 await expect(page.locator('.entry-panel').getByRole('button',{name:'Join room',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Close room form',exact:true}).click();
 await expect(page.locator('.entry-panel')).toHaveCount(0);
});
