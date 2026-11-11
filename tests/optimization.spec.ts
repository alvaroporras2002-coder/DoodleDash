import {test,expect} from '@playwright/test';
test('studio optimization keeps the selected avatar when collapsing the picker',async({page})=>{
 await page.goto('/');await page.locator('.home-actions').getByRole('button',{name:'Create room',exact:true}).click();const picker=page.getByRole('group',{name:'Choose an avatar'});
 await expect(picker.getByRole('button',{name:'Avatar ⭐',exact:true})).toHaveCount(0);
 await picker.getByRole('button',{name:'More',exact:true}).click();
 await picker.getByRole('button',{name:'Avatar ⭐',exact:true}).click();
 await picker.getByRole('button',{name:'Less',exact:true}).click();
 await expect(picker.getByRole('button',{name:'Avatar ⭐',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.entry-panel').getByRole('button',{name:'Create room',exact:true})).toBeDisabled();
});
test('studio optimization traps dialog focus and restores the invoking button',async({page})=>{
 await page.goto('/');const trigger=page.getByRole('button',{name:'How to play',exact:true}).first();
 await trigger.click();const close=page.getByRole('button',{name:'Close instructions',exact:true});
 await expect(close).toBeFocused();await page.keyboard.press('Shift+Tab');
 await expect(page.getByRole('button',{name:'Got it!',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(close).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
});
test('studio optimization still opens with browser storage disabled',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Storage blocked')};Storage.prototype.setItem=()=>{throw Error('Storage blocked')}});
 await page.goto('/');await expect(page.getByRole('heading',{name:/Draw\. Guess\./})).toBeVisible();
 await page.getByRole('button',{name:/Try the canvas/}).click();await page.getByRole('button',{name:'Start drawing',exact:true}).click();
 await expect(page.getByTestId('drawing-canvas')).toBeVisible();
});
test('studio optimization avoids repeated PNG encoding on an unchanged drawing',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.toDataURL;window.pngEncodes=0;HTMLCanvasElement.prototype.toDataURL=function(...args){window.pngEncodes++;return original.apply(this,args)}});
 await page.goto('/tests/autosave-harness.html');const canvas=page.getByTestId('drawing-canvas');await expect(canvas).toBeVisible();
 const b=(await canvas.boundingBox())!;await page.mouse.move(b.x+b.width*.2,b.y+b.height*.2);await page.mouse.down();await page.mouse.move(b.x+b.width*.6,b.y+b.height*.6,{steps:12});await page.mouse.up();
 await expect(page.getByRole('img',{name:'Latest automatic drawing'})).toBeVisible();
 await page.waitForTimeout(1400);const count=await page.evaluate(()=>window.pngEncodes);
 await page.waitForTimeout(1500);expect(await page.evaluate(()=>window.pngEncodes)).toBe(count);
 await page.keyboard.press('e');await expect(page.getByRole('button',{name:'Eraser',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('p');await expect(page.getByRole('button',{name:'Pencil',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('studio optimization shows and clears offline feedback',async({page,context})=>{
 await page.goto('/');await context.setOffline(true);await expect(page.getByText('You are offline. Reconnect to sync your work and continue with the team.')).toBeVisible();
 await context.setOffline(false);await expect(page.getByText('You are offline. Reconnect to sync your work and continue with the team.')).toHaveCount(0);
});
