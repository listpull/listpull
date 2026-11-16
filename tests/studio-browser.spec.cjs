'use strict';
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173'});
test.setTimeout(60000);

test('original consumer homepage and Labs dropdown are reachable',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#game')).toBeVisible();
 await expect(page.locator('#wildlife')).toBeAttached();
 const dropdown=page.locator('[data-labs-trigger]');
 await dropdown.click();
 await expect(page.locator('#labs-options a[href="/studio.html"]')).toBeVisible();
 await expect(page.locator('#labs-options a[href="/labs.html"]')).toBeVisible();
 await expect(page.locator('a[href="/solutions.html"]').first()).toBeAttached();
});
test('business visitors find team contact page rather than a mailto action',async({page})=>{
 await page.goto('/contact/');
 await expect(page.locator('#engineering')).toBeVisible();
 await expect(page.locator('#labs')).toBeAttached();
 await expect(page.locator('#support')).toBeAttached();
 expect(await page.locator('a[href^="mailto:"]').count()).toBe(0);
});
test('Strategy Lab runs examples and discovered observed rates',async({page})=>{
 await page.goto('/studio/strategy.html');
 const result=page.locator('#discovery-insights');
 await expect(result).toContainText('Which items may need replenishment');
 await page.locator('[data-demo="customers"]').click();
 await expect(result).toContainText('Where does the outcome differ');
 await page.locator('#discovery-outcome').selectOption('repeat_purchase');
 await expect(page.locator('#discovery-positive')).toBeVisible();
 await page.locator('#discovery-positive').selectOption('Yes');
 await page.locator('#discovery-analyze').click();
 await expect(result).toContainText('observed rate');
 await page.locator('[data-demo="strategic"]').click();
 await expect(result).toContainText('observed decisions suggest');
 await expect(page.locator('#solve-game')).toBeAttached();
});
test('Strategy Lab accepts new CSV with auto-schema',async({page})=>{
 await page.goto('/studio/strategy.html');
 const content='segment,orders,spend\nNew,1,30\nReturning,3,90\nNew,2,50\nReturning,5,155\nReturning,2,80\nNew,4,75\n';
 await page.locator('#discovery-upload').setInputFiles({name:'customers.csv',mimeType:'text/csv',buffer:Buffer.from(content)});
 await expect(page.locator('#discovery-dataset-name')).toContainText('customers.csv');
 await expect(page.locator('#discovery-schema-body')).toContainText('spend');
 await page.locator('#discovery-goal').selectOption('groups');
 await page.locator('#discovery-group').selectOption('segment');
 await page.locator('#discovery-outcome').selectOption('spend');
 await page.locator('#discovery-analyze').click();
 await expect(page.locator('#discovery-insights')).toContainText('Valid records analyzed');
});
test('Forecast Lab imports CSV and shows validation against a baseline',async({page})=>{
 await page.goto('/studio/forecast.html');
 const values=Array.from({length:26},(_,i)=>'2026-09-'+String(i+1).padStart(2,'0')+','+(80+i*3)).join('\n');
 await page.locator('#forecast-upload').setInputFiles({name:'weekly-visits.csv',mimeType:'text/csv',buffer:Buffer.from('date,visits\n'+values)});
 await expect(page.locator('#forecast-import-message')).toContainText('Imported 26 observations');
 await expect(page.locator('#forecast-business-summary')).toContainText('next value is estimated');
 await expect(page.locator('#forecast-backtest')).toContainText('average miss');
});
test('one Creative Studio edits SVG shapes and photos with real dimensions, gradients, Z and export',async({page})=>{
 await page.goto('/studio/image-editor.html');
 await expect(page.locator('#creative-canvas')).toBeVisible();
 await page.locator('[data-template="badge"]').click();
 await expect(page.locator('#creative-layers li')).toHaveCount(5);
 await page.locator('#creative-layers li').first().click();
 await page.locator('#creative-w').fill('420');await page.locator('#creative-w').press('Tab');
 await expect(page.locator('#creative-w')).toHaveValue('420');
 await page.locator('#creative-z').fill('0');await page.locator('#creative-z').press('Tab');
 await page.locator('#creative-fill-mode').selectOption('linear');
 await page.locator('#creative-color1').fill('#ff6644');
 await page.locator('#creative-color1').dispatchEvent('change');
 await page.locator('#creative-shadow-blur').fill('20');await page.locator('#creative-shadow-blur').press('Tab');
 await page.locator('#creative-depth').fill('18');await page.locator('#creative-depth').press('Tab');
 await page.locator('[data-creative="extrude"]').click();
 await expect(page.locator('#creative-layers li')).toHaveCount(11);
 await page.locator('[data-creative-tab="document"]').click();
 await page.locator('#creative-document-width').fill('2000');
 await page.locator('#creative-document-height').fill('1200');
 await page.locator('[data-creative="resize"]').click();
 await expect(page.locator('#creative-size-label')).toContainText('2,000 × 1,200');
 await page.locator('#creative-export-format').selectOption('svg');
 const download=page.waitForEvent('download');
 await page.locator('[data-creative="export"]').click();
 expect((await download).suggestedFilename()).toContain('.svg');
});
test('Unified Creative Studio imports uploaded raster and editable SVG shapes',async({page})=>{
 await page.goto('/studio/image-editor.html');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect x="10" y="10" width="170" height="80" fill="#ffae77"/></svg>';
 await page.locator('#creative-upload').setInputFiles({name:'client-icon.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
 await expect(page.locator('#creative-layers')).toContainText('client-icon');
 const project=page.waitForEvent('download');
 await page.locator('[data-creative="save"]').click();
 expect((await project).suggestedFilename()).toContain('.listpull.json');
});
test('Creative Studio edits typography and crops an imported photo with editable values',async({page})=>{
 await page.goto('/studio/image-editor.html');
 await page.locator('[data-template="badge"]').click();
 await page.locator('#creative-layers li').first().click();
 await expect(page.locator('#creative-text-fields')).toBeVisible();
 await page.locator('#creative-text-content').fill('LISTPULL MAKES ART');
 await page.locator('#creative-text-content').dispatchEvent('change');
 await page.locator('#creative-font').selectOption('Georgia');
 await expect(page.locator('#creative-status')).toContainText('Typography updated');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8n+L2nwEJMDGgAcICAK9fArDZr6mIAAAAAElFTkSuQmCC','base64');
 await page.locator('#creative-upload').setInputFiles({name:'tiny-artwork.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#creative-layers')).toContainText('tiny-artwork.png');
 await page.locator('#creative-layers li').first().click();
 await expect(page.locator('#creative-crop-fields')).toBeVisible();
 await page.locator('#creative-crop-w').fill('2');
 await page.locator('#creative-crop-h').fill('3');
 await page.locator('[data-creative="apply-crop"]').click();
 await expect(page.locator('#creative-crop-w')).toHaveValue('2');
 await page.locator('[data-creative="reset-crop"]').click();
 await expect(page.locator('#creative-crop-w')).toHaveValue('4');
});
test('legacy vector route opens the unified Creative Studio',async({page})=>{
 await page.goto('/studio/vector.html');
 await expect(page).toHaveURL(/\/studio\/image-editor.html/);
 await expect(page.locator('#creative-canvas')).toBeVisible();
});
test('full-screen controls expand both editor workspaces and the video monitor',async({page})=>{
 await page.goto('/studio/image-editor.html');
 await page.locator('[data-fullscreen-target=".creative-main"]').click();
 await expect(page.locator('[data-fullscreen-target=".creative-main"]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');
 await expect(page.locator('[data-fullscreen-target=".creative-main"]')).toHaveAttribute('aria-pressed','false');
 await page.goto('/studio/video-editor.html');
 await page.locator('[data-fullscreen-target=".video-main"]').click();
 await expect(page.locator('[data-fullscreen-target=".video-main"]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');
 await page.locator('[data-fullscreen-target=".video-monitor"]').click();
 await expect(page.locator('[data-fullscreen-target=".video-monitor"]')).toHaveAttribute('aria-pressed','true');
 await page.goto('/studio/ai.html');
 await page.locator('[data-fullscreen-target=".ai-workbench"]').click();
 await expect(page.locator('[data-fullscreen-target=".ai-workbench"]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');
 await expect(page.locator('[data-fullscreen-target=".ai-workbench"]')).toHaveAttribute('aria-pressed','false');
});
test('Video Studio demo can play, trim, split, add title and capture a still',async({page})=>{
 await page.goto('/studio/video-editor.html');
 await page.locator('[data-video="demo"]').click();
 await expect(page.locator('#video-clip-track button')).toHaveCount(3);
 await expect(page.locator('#video-title-track button')).toHaveCount(3);
 await page.locator('#video-scrub').fill('2');
 await page.locator('[data-video="split"]').click();
 await expect(page.locator('#video-clip-track button')).toHaveCount(4);
 await page.locator('[data-video="add-title"]').click();
 await expect(page.locator('#video-title-track button')).toHaveCount(4);
 const still=page.waitForEvent('download');
 await page.locator('[data-video="snapshot"]').click();
 expect((await still).suggestedFilename()).toContain('still.png');
});
test('An imported video immediately previews its first frame and adopts its dimensions',async({page})=>{
 await page.goto('/studio/video-editor.html');
 const data=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=320;c.height=180;
  const g=c.getContext('2d');g.fillStyle='#37bfa2';g.fillRect(0,0,320,180);
  const stream=c.captureStream(24),r=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
  const chunks=[];r.ondataavailable=e=>chunks.push(e.data);
  const done=new Promise(resolve=>r.onstop=resolve);
  r.start(100);
  const paint=setInterval(()=>{
   g.fillStyle='#37bfa2';g.fillRect(0,0,320,180);
   g.fillStyle='#246bfa';g.fillRect(0,0,14,14);
  },36);
  await new Promise(resolve=>setTimeout(resolve,900));
  clearInterval(paint);r.stop();await done;stream.getTracks().forEach(t=>t.stop());
  const buffer=await new Blob(chunks).arrayBuffer(),bytes=new Uint8Array(buffer);
  let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(str);
 });
 await page.locator('#video-upload').setInputFiles({name:'portrait-test.webm',mimeType:'video/webm',buffer:Buffer.from(data,'base64')});
 await expect(page.locator('#video-library')).toContainText('portrait-test.webm');
 await page.locator('[data-video="add-media"]').click();
 await expect(page.locator('#video-frame-size')).toContainText('320 × 180');
 await expect(page.locator('#video-quick-width')).toHaveValue('320');
 await expect(page.locator('#video-quick-height')).toHaveValue('180');
 await expect(page.locator('#video-play')).toContainText('Play');
 await page.waitForTimeout(700);
 console.log('VIDEO DECODE DIAGNOSTICS:',JSON.stringify(await page.evaluate(()=>{
   const p=document.getElementById('video-source'),c=document.getElementById('video-canvas');
   const pixel=c.getContext('2d').getImageData(Math.round(c.width/2),Math.round(c.height/2),1,1).data;
   const copy=document.createElement('canvas');copy.width=320;copy.height=180;
   let sourcePixel=null,paintError=null;
   try{copy.getContext('2d').drawImage(p,0,0,320,180);
    sourcePixel=[...copy.getContext('2d').getImageData(160,90,1,1).data];}
   catch(error){paintError=String(error);}
   return {sourcePixel,paintError,readyState:p.readyState,networkState:p.networkState,currentTime:p.currentTime,
     duration:p.duration,videoWidth:p.videoWidth,videoHeight:p.videoHeight,paused:p.paused,
     src:p.currentSrc.slice(0,65),error:p.error?.message,
     pixel:[...pixel],status:document.getElementById('video-status').textContent};
 })));
 await expect.poll(async()=>page.evaluate(()=>{
  const c=document.getElementById('video-canvas'),g=c.getContext('2d');
  const pixel=g.getImageData(Math.round(c.width/2),Math.round(c.height/2),1,1).data;
  return pixel[1]-pixel[0];
 }),{timeout:15000}).toBeGreaterThan(35);
 await page.locator('#video-quick-width').fill('720');
 await page.locator('#video-quick-height').fill('1280');
 await page.locator('[data-video="apply-quick-size"]').click();
 await expect(page.locator('#video-frame-size')).toContainText('720 × 1280');
 await page.locator('[data-video="match-source"]').click();
 await expect(page.locator('#video-frame-size')).toContainText('320 × 180');
 await page.locator('#video-fit').selectOption('cover');
 await page.locator('#video-scale').fill('80');
 await page.locator('#video-crop-left').fill('6');
 await page.locator('#video-apply').click();
 await expect(page.locator('#video-status')).toContainText('Edits applied');
 await page.locator('[data-video="keyframe"]').first().click();
 await expect(page.locator('#video-keyframe-list')).toContainText('00:00');
});
test('Creative artboard takes imported image dimensions and allows immediate custom resize',async({page})=>{
 await page.goto('/studio/image-editor.html');
 const png=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=640;c.height=360;
  const g=c.getContext('2d');g.fillStyle='#72c9a8';g.fillRect(0,0,640,360);
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#creative-upload').setInputFiles({name:'client-banner.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(page.locator('#creative-size-label')).toContainText('640 × 360');
 await expect(page.locator('#creative-quick-width')).toHaveValue('640');
 await page.locator('#creative-quick-width').fill('1500');
 await page.locator('#creative-quick-height').fill('900');
 await page.locator('[data-creative="quick-resize"]').click();
 await expect(page.locator('#creative-size-label')).toContainText('1,500 × 900');
 await page.locator('[data-creative="match-import"]').click();
 await expect(page.locator('#creative-size-label')).toContainText('640 × 360');
 await expect(page.locator('#creative-layers')).toContainText('client-banner.png');
});
test('Video Studio allows moving footage directly and adding editable picture-in-picture layers',async({page})=>{
 await page.goto('/studio/video-editor.html');
 await page.locator('[data-video="demo"]').click();
 await page.locator('#video-clip-track button').first().click();
 const stage=await page.locator('#video-canvas').boundingBox();
 const x=stage.x+stage.width*.5,y=stage.y+stage.height*.5;
 console.log('PROGRAM MONITOR HIT:',JSON.stringify(await page.evaluate(({x,y})=>({
  target:document.elementFromPoint(x,y)?.tagName,
  rect:document.getElementById('video-canvas').getBoundingClientRect().toJSON(),
  duration:document.getElementById('video-project-duration').textContent
 }),{x,y})));
 await page.mouse.move(x,y);await page.mouse.down();
 console.log('PROGRAM MONITOR DOWN:',await page.locator('#video-status').textContent());
 await page.mouse.move(x+48,y+13,{steps:5});await page.mouse.up();
 console.log('PROGRAM MONITOR UP:',await page.locator('#video-status').textContent(),await page.locator('#video-x').inputValue());
 await expect.poll(async()=>Number(await page.locator('#video-x').inputValue())).toBeGreaterThan(50);
 await page.locator('#video-library li').first().click();
 await page.locator('[data-video="add-overlay"]').click();
 await expect(page.locator('#video-overlay-track button')).toHaveCount(1);
 await page.locator('#video-scrub').fill('1');
 await page.locator('#video-overlay-track button').first().click();
 await page.locator('#video-scale').fill('60');
 await page.locator('#video-scale').dispatchEvent('change');
 await expect(page.locator('#video-scale')).toHaveValue('60');
 await page.locator('[data-video="keyframe"]').first().click();
 await expect(page.locator('#video-keyframe-list')).toContainText('00:01');
 const save=page.waitForEvent('download');
 await page.locator('[data-video="save"]').click();
 expect((await save).suggestedFilename()).toContain('video-project.json');
});
test('Still images can be extended and timed overlays can be repositioned without a fixed duration',async({page})=>{
 await page.goto('/studio/video-editor.html');
 await page.locator('[data-video="demo"]').click();
 await page.locator('#video-clip-track button').first().click();
 await page.locator('#video-out').fill('9');
 await page.locator('#video-out').dispatchEvent('change');
 await expect(page.locator('#video-project-duration')).toContainText('00:17');
 await page.locator('#video-library li').first().click();
 await page.locator('#video-scrub').fill('2');
 await page.locator('[data-video="add-overlay"]').click();
 await expect(page.locator('#video-overlay-track button')).toHaveCount(1);
 await page.locator('#video-timeline-start').fill('4');
 await page.locator('#video-timeline-start').dispatchEvent('change');
 await page.locator('#video-timeline-duration').fill('8');
 await page.locator('#video-timeline-duration').dispatchEvent('change');
 await expect(page.locator('#video-timeline-start')).toHaveValue('4');
 await expect(page.locator('#video-timeline-duration')).toHaveValue('8');
 const rect=await page.locator('#video-overlay-track button').first().evaluate(el=>({left:el.style.left,width:el.style.minWidth}));
 expect(parseFloat(rect.left)).toBeGreaterThan(100);
});
test('Video Studio exports a real encoded WebM from a trimmed local timeline',async({page})=>{
 await page.goto('/studio/video-editor.html');
 await page.locator('[data-video="demo"]').click();
 while(await page.locator('#video-clip-track button').count()>1){
   await page.locator('#video-clip-track button').last().click();
   await page.locator('[data-video="remove"]').click();
 }
 await page.locator('#video-clip-track button').first().click();
 await page.locator('#video-out').fill('1.2');
 await page.locator('#video-apply').click();
 await page.locator('[data-video-tab="project"]').click();
 await page.locator('#video-width').fill('320');
 await page.locator('#video-height').fill('180');
 await page.locator('[data-video="apply-project"]').click();
 await page.locator('#video-export-type').selectOption('webm');
 const download=page.waitForEvent('download',{timeout:45000});
 await page.locator('[data-video="export"]').click();
 const file=await download;
 expect(file.suggestedFilename()).toMatch(/\.webm$/);
 await expect(page.locator('#video-export-progress')).toHaveJSProperty('value',100);
});
test('Visual business explorer shows tracking scenario',async({page})=>{
 await page.goto('/studio/strategy.html');
 await page.locator('[data-demo="movement"]').click();
 await expect(page.locator('#discovery-insights')).toContainText('Where could');
 await expect(page.locator('#discovery-insights svg[role="img"]')).toBeVisible();
 await expect(page.locator('#discovery-insights')).toContainText('Scenario location');
});
test('Studio hub launches separate full editors',async({page})=>{
 await page.goto('/studio.html');
 await expect(page.locator('#creative-canvas')).toHaveCount(0);
 await expect(page.locator('a[href="/studio/image-editor.html"]').first()).toBeVisible();
 await page.locator('a[href="/studio/image-editor.html"]').first().click();
 await expect(page).toHaveURL(/\/studio\/image-editor.html/);
 await expect(page.locator('#creative-canvas')).toBeAttached();
});
test('IDE has working isolated preview and friendly sample',async({page})=>{
 await page.goto('/studio/ai.html#fiddle');
 await page.locator('[data-fiddle-preset="poster"]').click();
 await expect(page.frameLocator('#fiddle-preview').locator('h1')).toContainText('MAKE');
 await page.locator('#fiddle-tab-js').click();
 await expect(page.locator('#fiddle-js')).toBeVisible();
 await expect(page.locator('#ai-local-start')).toBeVisible();
 await page.locator('#fiddle-tab-html').click();
 await expect(page.locator('#fiddle-html')).toBeVisible();
});
test('AI Agent chat uses the loaded model to answer about the active IDE app',async({page})=>{
 await page.goto('/studio/ai.html');
 await page.locator('#ai-question').fill('What does the inventory app do?');
 await page.locator('#ai-send').click();
 await expect(page.locator('#ai-compose-status')).toContainText('Enable the AI Agent');
 await page.evaluate(()=>{
   window.__agentRequests=[];
   window.ListPullAgent={isReady:()=>true,complete:async messages=>{
     window.__agentRequests.push(messages);
     return 'The inventory app compares current stock with demand and highlights shortages.';
   }};
   window.dispatchEvent(new Event('listpull-agent-state'));
 });
 await expect(page.locator('#ai-agent-indicator')).toContainText('online');
 await page.locator('#ai-question').fill('Explain the inventory app');
 await page.locator('#ai-send').click();
 await expect(page.locator('#ai-messages')).toContainText('compares current stock with demand');
 const requests=await page.evaluate(()=>window.__agentRequests);
 expect(requests.length).toBe(1);
 expect(requests[0].at(-1).content).toContain('Which products need attention?');
 expect(requests[0].at(-1).content).toContain('Explain the inventory app');
 await page.locator('#ai-local-ask').click();
 await expect(page.locator('#ai-question')).toBeFocused();
});

test('AI Agent proposes a reviewed IDE edit, applies it to preview and supports undo',async({page})=>{
 await page.goto('/studio/ai.html?app=poster');
 await expect(page.frameLocator('#fiddle-preview').locator('h1')).toContainText('MAKE');
 const initial=await page.locator('#fiddle-html').inputValue();
 await page.evaluate(()=>{
   window.ListPullAgent={isReady:()=>true,complete:async messages=>{
     if(messages[0].content.includes('editing assistant'))
       return '```html\n<main><h1>AI AGENT UPDATED THIS APP</h1></main>\n```';
     return 'The poster is a creative layout.';
   }};
   window.dispatchEvent(new Event('listpull-agent-state'));
 });
 await page.locator('#ai-agent-mode').selectOption('edit');
 await page.locator('#ai-edit-target').selectOption('html');
 await page.locator('#ai-question').fill('Replace the poster title');
 await page.locator('#ai-send').click();
 await expect(page.locator('#ai-edit-proposal')).toBeVisible();
 await expect(page.locator('#ai-edit-draft')).toHaveValue(/AI AGENT UPDATED/);
 await expect(page.locator('#fiddle-html')).toHaveValue(initial);
 await page.locator('#ai-apply-code').click();
 await expect(page.locator('#fiddle-html')).toHaveValue(/AI AGENT UPDATED/);
 await expect(page.frameLocator('#fiddle-preview').locator('h1')).toHaveText('AI AGENT UPDATED THIS APP');
 await page.locator('#fiddle-undo-agent').click();
 await expect(page.locator('#fiddle-html')).toHaveValue(initial);
 await expect(page.frameLocator('#fiddle-preview').locator('h1')).toContainText('MAKE');
});

test('IDE panel widths and AI chat height are adjustable',async({page})=>{
 await page.setViewportSize({width:1400,height:900});
 await page.goto('/studio/ai.html');
 const grip=page.locator('#ai-resize-preview');
 const original=await page.locator('.ai-preview-pane').evaluate(node=>node.getBoundingClientRect().width);
 const b=await grip.boundingBox();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
 await page.mouse.move(b.x+b.width/2-65,b.y+b.height/2,{steps:5});await page.mouse.up();
 const wider=await page.locator('.ai-preview-pane').evaluate(node=>node.getBoundingClientRect().width);
 expect(wider).toBeGreaterThan(original+20);
 const handle=page.locator('#ai-resize-chat'),chat=page.locator('#assistant');
 const before=await chat.evaluate(node=>node.getBoundingClientRect().height);
 const h=await handle.boundingBox();
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2-65,{steps:5});await page.mouse.up();
 const after=await chat.evaluate(node=>node.getBoundingClientRect().height);
 expect(after).toBeGreaterThan(before+20);
});

test('Engineering capabilities each link to a relevant live application',async({page})=>{
 await page.goto('/engineering.html');
 const articles=page.locator('article.tile');
 expect(await articles.count()).toBe(7);
 for(let i=0;i<7;i++){
   await expect(articles.nth(i).locator('a.engineering-demo-link')).toHaveCount(1);
 }
 await expect(page.locator('a[href="/studio/ai.html#assistant"]').first()).toBeVisible();
 await page.goto('/studio/strategy.html?scenario=government');
 await expect(page.locator('#discovery-dataset-name')).toContainText('Public');
 await page.goto('/studio/ai.html?app=service');
 await expect(page.frameLocator('#fiddle-preview').locator('h1')).toContainText('Service delivery');
});

test('mobile visitor can open Labs menu without losing Blobby',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('[data-labs-trigger]').click();
 await expect(page.locator('#labs-options a[href="/studio.html"]')).toBeVisible();
 await context.close();
});
