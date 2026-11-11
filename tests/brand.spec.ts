import {test,expect} from '@playwright/test';
test('DoodleOnline identity is independent and consistent across home and practice',async({page})=>{
 await page.goto('/');
 await expect(page).toHaveTitle('DoodleOnline — Your creative playground');
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.getByRole('button',{name:'DoodleOnline home'})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Less perfect\.\s*More playful\./})).toBeVisible();
 await expect(page.getByRole('img',{name:'A playful violet flower on a shared artist canvas'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Quick Sketch',exact:true})).toBeVisible();
 const body=await page.locator('body').innerText();
 expect(body).not.toMatch(/doordash|doodledash|gartic|express delivery/i);
 const colors=await page.evaluate(()=>({accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),bg:getComputedStyle(document.body).backgroundColor}));
 expect(colors).toEqual({accent:'#7041d6',bg:'rgb(246, 244, 250)'});
 await page.getByRole('button',{name:/Try the canvas/}).click();
 await expect(page.getByTestId('drawing-canvas')).toBeVisible();
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download drawing',exact:true}).click();
 expect((await download).suggestedFilename()).toBe('doodleonline-drawing.png');
});
for(const width of [320,390,768,1440]){
 test('DoodleOnline layout fits '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await expect(page.getByRole('button',{name:'Enter the studio',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'How to play',exact:true}).first().click();
  await expect(page.getByRole('dialog',{name:'How to play'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });
}
test('DoodleOnline explains optional calls and private room capacity',async({page})=>{
 await page.goto('/');
 await page.getByText('How many people can play?',{exact:true}).click();
 await expect(page.getByText(/Private rooms support 2 to 20 players/)).toBeVisible();
 await page.getByText('Is the video call required?',{exact:true}).click();
 await expect(page.getByText(/Camera and microphone start off/)).toBeVisible();
});
