/* ListPull AI Agent: user-initiated, on-device language model integration.
   The same loaded model powers chat, code explanations and suggested IDE edits. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const start=$('ai-local-start'),jump=$('ai-local-ask'),select=$('ai-local-model'),progress=$('ai-local-progress');
  if(!start||!jump||!select)return;
  let library=null,engine=null,modelId='',loading=false,generating=false;
  const ready=()=>!!engine&&modelId===select.value&&!loading;
  const emit=()=>window.dispatchEvent(new CustomEvent('listpull-agent-state',{detail:{ready:ready(),loading,generating,model:modelId}}));
  const status=message=>{$('ai-local-status').textContent=message;};
  const progressOptions=()=>({initProgressCallback:report=>{
    const fraction=Number(report.progress);
    progress.hidden=false;
    progress.value=Number.isFinite(fraction)?Math.max(0,Math.min(100,Math.round(fraction*100))):0;
    if(report.text)status(String(report.text).slice(0,260));
  }});
  async function load(){
    if(loading||generating)return;
    loading=true;start.disabled=true;select.disabled=true;emit();
    try{
      if(!navigator.gpu)throw Error('This browser does not support on-device AI. Try a compatible WebGPU browser.');
      const adapter=await navigator.gpu.requestAdapter();
      if(!adapter)throw Error('No compatible graphics adapter was found on this device.');
      status('Preparing your AI Agent…');
      if(!library)library=await import('https://esm.run/@mlc-ai/web-llm@0.2.88');
      const available=library.prebuiltAppConfig?.model_list||[];
      const small=available.filter(x=>/0[.]5B|0[.]6B|1B|1[.]5B|2B|360M|135M|1[.]1B/i.test(x.model_id||''));
      if(!small.length)throw Error('No compact model is available for this device.');
      if(!select.dataset.loaded){
        select.replaceChildren();
        for(const item of small){
          const option=document.createElement('option');
          option.value=item.model_id;
          option.textContent=item.model_id.replace(/-q\d+f\d+_\d+-MLC$/,'').replace(/-MLC$/,'').slice(0,85);
          select.append(option);
        }
        const prefer=small.find(x=>/Qwen.*0[.]5B.*q4/i.test(x.model_id))||
          small.find(x=>/SmolLM.*360M/i.test(x.model_id))||
          small.find(x=>/1B.*q4/i.test(x.model_id))||small[0];
        select.value=prefer.model_id;
        select.dataset.loaded='true';
      }
      const next=select.value;
      if(!engine||modelId!==next){
        if(engine&&typeof engine.unload==='function')await engine.unload();
        engine=null;modelId='';
        status('Downloading and starting the AI Agent. The first download can be large.');
        engine=await library.CreateMLCEngine(next,progressOptions());
        modelId=next;
      }
      progress.hidden=true;
      status('AI Agent ready. Ask questions or request code changes in the chat below.');
    }catch(error){
      progress.hidden=true;engine=null;modelId='';
      status('AI Agent could not start: '+String(error?.message||error).slice(0,230));
    }finally{
      loading=false;start.disabled=false;select.disabled=!select.dataset.loaded;
      start.textContent=ready()?'AI Agent enabled ✓':'Enable AI Agent';emit();
    }
  }
  async function complete(messages){
    if(!ready())throw Error('Enable the AI Agent above before sending a message.');
    if(generating)throw Error('The AI Agent is still answering your previous message.');
    generating=true;start.disabled=true;emit();
    try{
      const clean=(Array.isArray(messages)?messages:[]).filter(x=>['system','user','assistant'].includes(x.role))
        .slice(-12).map(x=>({role:x.role,content:String(x.content||'').slice(0,x.role==='system'?3600:6100)}));
      const response=await engine.chat.completions.create({
        messages:clean,temperature:0.25,max_tokens:1300
      });
      const text=response?.choices?.[0]?.message?.content;
      if(typeof text!=='string'||!text.trim())throw Error('The model returned an empty response.');
      return text.trim();
    }finally{generating=false;start.disabled=false;emit();}
  }
  window.ListPullAgent=Object.freeze({isReady:ready,isBusy:()=>loading||generating,complete});
  start.addEventListener('click',load);
  select.addEventListener('change',()=>{
    start.textContent='Enable AI Agent';
    status('Select Enable AI Agent to load the chosen model.');
    emit();
  });
  jump.addEventListener('click',()=>{
    const chat=$('assistant'),field=$('ai-question');
    chat?.scrollIntoView({behavior:'smooth',block:'center'});
    field?.focus({preventScroll:true});
    if(!ready())status('Enable the AI Agent above to start a live conversation.');
  });
  emit();
})();
