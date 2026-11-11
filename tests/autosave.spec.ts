import {test,expect} from '@playwright/test';
test('autosave captures the drawing without Submit and updates after Undo',async({page})=>{
 await page.goto('/tests/autosave-harness.html');
 const canvas=page.getByTestId('drawing-canvas');await expect(canvas).toBeVisible();
 const box=(await canvas.boundingBox())!;
 await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:12});await page.mouse.up();
 const image=page.getByRole('img',{name:'Latest automatic drawing'});await expect(image).toHaveAttribute('src',/^data:image\/png;base64,/);
 await expect(page.getByLabel('Submitted')).toHaveText('false');
 const drawn=await image.getAttribute('src');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect.poll(()=>image.getAttribute('src')).not.toBe(drawn);
 await expect(page.getByLabel('Submitted')).toHaveText('false');
});
