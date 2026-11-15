(() => {
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('editor-canvas'), context=canvas.getContext('2d',{willReadFrequently:false});
const status=$('editor-status'), dims=$('image-dimensions'), empty=$('empty-state'), exportButton=$('export-png');
const drop=$('drop-area'), upload=$('image-file');
const defaults={brightness:100,contrast:100,saturation:100,grayscale:0,'text-size':6};
let image=null, rotation=0, flipped=false, originalName='listpull-image', pendingLook=null;
const setters={};
const controls=['brightness','contrast','saturation','grayscale','text-size'];
const message=text=>{status.textContent=text};
function render(showOriginal=false){
 if(!image)return;
 const original=showOriginal===true;
 const swap=rotation%180!==0;
 const w=image.naturalWidth, h=image.naturalHeight;
 canvas.width=swap?h:w;canvas.height=swap?w:h;
 context.clearRect(0,0,canvas.width,canvas.height);
 context.save();context.translate(canvas.width/2,canvas.height/2);
 context.rotate(rotation*Math.PI/180);context.scale(flipped?-1:1,1);
 context.filter=original?'none':'brightness('+ $('brightness').value +'%) contrast('+ $('contrast').value +'%) saturate('+ $('saturation').value +'%) grayscale('+ $('grayscale').value +'%)';
 context.drawImage(image,-w/2,-h/2,w,h);context.restore();
 const caption=$('caption-text').value.trim();
 if(caption&&!original){
  const size=Math.max(12,Math.round(Math.min(canvas.width,canvas.height)*Number($('text-size').value)/100));
  const padding=Math.max(12,Math.round(size*.7));
  context.font='700 '+size+'px system-ui, Arial, sans-serif';context.textAlign='center';context.textBaseline='bottom';
  context.shadowColor='rgba(0,0,0,.8)';context.shadowBlur=Math.max(4,size*.35);
  context.fillStyle=$('text-color').value;
  const words=caption.split(' ');let line='', lines=[];
  for(const word of words){
   const next=line?line+' '+word:word;
   if(context.measureText(next).width>canvas.width-padding*2 && line){lines.push(line);line=word;}else{line=next;}
  }
  if(line)lines.push(line);
  lines=lines.slice(-4);
  const lineHeight=size*1.2;
  lines.forEach((item,i)=>context.fillText(item,canvas.width/2,canvas.height-padding-(lines.length-1-i)*lineHeight));
  context.shadowBlur=0;
 }
 dims.textContent=canvas.width+' × '+canvas.height+' px';
}
function reset(shouldRender=true){
 rotation=0;flipped=false;
 for(const [key,val] of Object.entries(defaults)){$(key).value=String(val);$(key+'-out').value=val+'%';}
 $('caption-text').value='';$('text-color').value='#ffffff';
 if(shouldRender)render();
 message(image?'Adjustments reset.':'Ready for an image.');
}
function loadImageFromURL(src,name){
 const loaded=new Image();
 loaded.onload=()=>{
  if(loaded.naturalWidth*loaded.naturalHeight>40000000){message('Image too large. Use an image below 40 megapixels.');if(src.startsWith('blob:'))URL.revokeObjectURL(src);return;}
  image=loaded;originalName=name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,64)||'listpull-image';
  reset(false);canvas.hidden=false;empty.hidden=true;exportButton.disabled=false;render();message('Image loaded. All edits stay in your browser.');
  if(src.startsWith('blob:'))URL.revokeObjectURL(src);
  if(pendingLook){const choice=pendingLook;pendingLook=null;applyLook(choice);}
 };
 loaded.onerror=()=>{message('Image could not be opened. Try PNG, JPEG, or WebP.');if(src.startsWith('blob:'))URL.revokeObjectURL(src)};
 loaded.src=src;
}
function loadFile(file){
 if(!file)return;
 const valid=['image/jpeg','image/png','image/webp','image/gif','image/bmp'];
 if(!valid.includes(file.type)){message('Unsupported format. Please choose PNG, JPEG, WebP, GIF, or BMP.');return}
 if(file.size>30*1024*1024){message('Choose an image smaller than 30 MB.');return}
 loadImageFromURL(URL.createObjectURL(file),file.name);
}
upload.addEventListener('change',()=>loadFile(upload.files?.[0]));
for(const key of controls){
 $(key).addEventListener('input',()=>{$(key+'-out').value=$(key).value+'%';render()});
}
$('caption-text').addEventListener('input',render);
$('text-color').addEventListener('input',render);
$('rotate-left').addEventListener('click',()=>{if(!image)return;rotation=(rotation+270)%360;render()});
$('rotate-right').addEventListener('click',()=>{if(!image)return;rotation=(rotation+90)%360;render()});
$('flip-horizontal').addEventListener('click',()=>{if(!image)return;flipped=!flipped;render()});
$('reset-all').addEventListener('click',()=>reset());
$('demo-image').addEventListener('click',()=>{
 const art=document.createElement('canvas');art.width=1280;art.height=780;
 const g=art.getContext('2d');const gradient=g.createLinearGradient(0,0,1280,780);
 gradient.addColorStop(0,'#182b58');gradient.addColorStop(.55,'#426a98');gradient.addColorStop(1,'#f2a17f');g.fillStyle=gradient;g.fillRect(0,0,1280,780);
 for(let i=0;i<8;i++){g.fillStyle='rgba(255,255,255,'+(0.07+i*.018)+')';g.beginPath();g.arc(100+i*160,120+i*52,65+i*4,0,Math.PI*2);g.fill()}
 g.fillStyle='#fbe5c2';g.beginPath();g.arc(930,235,115,0,Math.PI*2);g.fill();
 g.fillStyle='#123f50';g.beginPath();g.moveTo(0,670);g.lineTo(250,330);g.lineTo(490,670);g.lineTo(720,400);g.lineTo(1050,780);g.lineTo(0,780);g.fill();
 g.fillStyle='#1d5763';g.beginPath();g.moveTo(470,780);g.lineTo(900,410);g.lineTo(1280,670);g.lineTo(1280,780);g.fill();
 g.fillStyle='#fff';g.font='bold 46px system-ui';g.fillText('ListPull Studio',60,100);g.font='26px system-ui';g.fillText('A place to make something.',60,145);
 loadImageFromURL(art.toDataURL('image/png'),'listpull-demo');
});
const looks={
 social:{brightness:107,contrast:117,saturation:135,grayscale:0},
 product:{brightness:115,contrast:106,saturation:102,grayscale:0},
 nature:{brightness:103,contrast:110,saturation:118,grayscale:0}
};
function applyLook(name){
 const adjustments=looks[name];if(!adjustments)return;
 if(!image){pendingLook=name;$('demo-image').click();return;}
 for(const [key,value] of Object.entries(adjustments)){$(key).value=value;$(key+'-out').value=value+'%';}
 render();
 message('Applied a '+name+' look. Fine-tune the sliders or hold Compare to see the original.');
}
document.querySelectorAll('[data-image-look]').forEach(button=>button.addEventListener('click',()=>{
 applyLook(button.dataset.imageLook);
 document.getElementById('image-editor').scrollIntoView({behavior:'smooth',block:'start'});
}));
const compare=$('image-compare');
if(compare){
 const start=event=>{if(!image)return;if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;if(event.type==='keydown')event.preventDefault();render(true);};
 const end=()=>{if(image)render();};
 compare.addEventListener('pointerdown',start);
 compare.addEventListener('pointerup',end);
 compare.addEventListener('pointercancel',end);
 compare.addEventListener('pointerleave',end);
 compare.addEventListener('keydown',start);
 compare.addEventListener('keyup',end);
 compare.addEventListener('blur',end);
}
exportButton.addEventListener('click',()=>{
 if(!image)return;
 try{
  const destinations={square:[1080,1080],web:[1200,630],video:[1280,720],portrait:[1080,1350]};
  const target=$('image-export-size').value;
  const [w,h]=destinations[target]||[canvas.width,canvas.height];
  const output=document.createElement('canvas');output.width=w;output.height=h;
  const cx=output.getContext('2d');
  const fit=$('image-export-fit').value;
  const scale=fit==='cover'?Math.max(w/canvas.width,h/canvas.height):Math.min(w/canvas.width,h/canvas.height);
  const dw=canvas.width*scale,dh=canvas.height*scale;
  cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
  cx.drawImage(canvas,(w-dw)/2,(h-dh)/2,dw,dh);
  const link=document.createElement('a');
  link.download=originalName+'-'+target+'-'+w+'x'+h+'.png';
  link.href=output.toDataURL('image/png');
  document.body.append(link);link.click();link.remove();
  message('Downloaded '+w+'×'+h+' PNG ('+(fit==='cover'?'crop-to-fill':'fit whole image')+').');
 }catch(error){message('Export failed. Try a smaller image.')}
});
drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('dragover')});
drop.addEventListener('dragleave',event=>{if(!drop.contains(event.relatedTarget))drop.classList.remove('dragover')});
drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('dragover');loadFile(event.dataTransfer?.files?.[0])});
})();