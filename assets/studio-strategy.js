/* ListPull Studio - educational 2x2 Nash equilibrium calculator.
   Independent browser adaptation of Neubra's best-response and regret concepts.
   No financial data, credentials, server calls or shared app state. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const EPS=1e-7;
const examples={
 collaboration:{description:'Two technology teams decide whether to coordinate a shared integration. Alignment can help both teams, but pursuing separate approaches is also stable.',players:['Platform team','Integration team'],a:['Coordinate','Go solo'],b:['Coordinate','Go solo'],A:[[5,0],[3,2]],B:[[5,3],[0,2]]},
 pricing:{description:'Two competing products choose premium pricing or a discount. Incentives in these invented scores illustrate a price competition dilemma.',players:['Product Alpha','Product Beta'],a:['Premium','Discount'],b:['Premium','Discount'],A:[[3,0],[5,1]],B:[[3,5],[0,1]]},
 security:{description:'A defender chooses a hardened system or targeted monitoring while an attacker chooses their method. A zero-sum toy model can produce randomized strategies.',players:['Defender','Attacker'],a:['Harden','Monitor'],b:['Method 1','Method 2'],A:[[3,-2],[-1,2]],B:[[-3,2],[1,-2]]},
 conservation:{description:'Two neighboring regions can cooperate to protect wildlife habitat or prioritize short-term individual gains. Hypothetical payoffs illustrate a cooperation dilemma.',players:['Region North','Region South'],a:['Protect','Exploit'],b:['Protect','Exploit'],A:[[4,0],[5,2]],B:[[4,5],[0,2]]}
};
let latest=null;
const text=(id,value)=>{$(id).textContent=value};
function setScenario(name){
 const ex=examples[name];if(!ex)return;
 text('scenario-description',ex.description);
 ['player-a','player-b'].forEach((id,i)=>$(id).value=ex.players[i]);
 ['a0','a1'].forEach((id,i)=>$(id).value=ex.a[i]);
 ['b0','b1'].forEach((id,i)=>$(id).value=ex.b[i]);
 for(let i=0;i<2;i++)for(let j=0;j<2;j++){
  $('pay-a'+i+j).value=ex.A[i][j];
  $('pay-b'+i+j).value=ex.B[i][j];
 }
 solveAndRender();
}
function numberAt(id){
 const input=$(id);const raw=input.value.trim();
 if(raw==='')throw Error('Every payoff must be a number.');
 const v=Number(raw);
 if(!Number.isFinite(v)||v>100||v< -100)throw Error('Payoffs must be between −100 and 100.');
 return v;
}
function inputGame(){
 const A=[[],[]],B=[[],[]];
 for(let i=0;i<2;i++)for(let j=0;j<2;j++){A[i][j]=numberAt('pay-a'+i+j);B[i][j]=numberAt('pay-b'+i+j);}
 const names=[[$('a0').value.trim(),$('a1').value.trim()],[$('b0').value.trim(),$('b1').value.trim()]];
 if(names.some(arr=>arr.some(s=>!s)))throw Error('Enter names for all four actions.');
 return {players:[$('player-a').value.trim()||'Player A',$('player-b').value.trim()||'Player B'],actions:names,A,B};
}
function expected(A,x,y){
 let sum=0;for(let i=0;i<2;i++)for(let j=0;j<2;j++)sum+=x[i]*y[j]*A[i][j];
 return sum;
}
function regrets(A,B,x,y){
 const u=expected(A,x,y),v=expected(B,x,y);
 const rowUtilities=[0,1].map(i=>A[i][0]*y[0]+A[i][1]*y[1]);
 const colUtilities=[0,1].map(j=>B[0][j]*x[0]+B[1][j]*x[1]);
 return {u,v,regretA:Math.max(0,...rowUtilities.map(z=>z-u)),regretB:Math.max(0,...colUtilities.map(z=>z-v))};
}
function solve2x2(A,B){
 const found=[],near=(a,b)=>Math.abs(a-b)<=EPS;
 function add(x,y,kind){
  const metrics=regrets(A,B,x,y);
  if(Math.max(metrics.regretA,metrics.regretB)>EPS)return;
  if(found.some(z=>z.x.every((v,i)=>near(v,x[i]))&&z.y.every((v,i)=>near(v,y[i]))))return;
  found.push({kind,x,y,...metrics});
 }
 // Enumerate pure best-response intersections.
 for(let i=0;i<2;i++)for(let j=0;j<2;j++){
  const x=[0,0],y=[0,0];x[i]=1;y[j]=1;add(x,y,'Pure');
 }
 // Interior mixed equilibrium: each opponent is indifferent over own actions.
 const denA=A[0][0]-A[0][1]-A[1][0]+A[1][1];
 const denB=B[0][0]-B[1][0]-B[0][1]+B[1][1];
 let degenerate=false;
 if(Math.abs(denA)>EPS&&Math.abs(denB)>EPS){
  const q=(A[1][1]-A[0][1])/denA; // probability B uses first action
  const p=(B[1][1]-B[1][0])/denB; // probability A uses first action
  if(p>=-EPS&&p<=1+EPS&&q>=-EPS&&q<=1+EPS){
   const x=[Math.max(0,Math.min(1,p)),Math.max(0,Math.min(1,1-p))];
   const y=[Math.max(0,Math.min(1,q)),Math.max(0,Math.min(1,1-q))];
   add(x,y,'Mixed');
  }
 }else degenerate=true;
 return {equilibria:found,degenerate,method:'Pure best-response enumeration + 2x2 interior mixed indifference'};
}
function node(tag,cls,value){
 const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;
}
const score=n=>Number(n).toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
function bar(container,label,share){
 const cap=node('div','strategy-bar-label'),a=node('span','',label),b=node('strong','',Math.round(share*1000)/10+'%');
 cap.append(a,b);
 const track=node('div','strategy-bar'),fill=node('div');fill.style.width=(share*100)+'%';track.append(fill);
 container.append(cap,track);
}
function renderResult(game,solution){
 const target=$('strategy-outcomes');target.replaceChildren();
 if(!solution.equilibria.length){
  const box=node('article','result-card');box.append(node('h3','','No isolated equilibrium found by this solver.'),node('p','result-detail','This can occur in degenerate games. Try different payoffs or consult a more general solver.'));
  target.append(box);
 }else{
  const intro=node('p','strategy-description',solution.equilibria.length+' representative equilibrium'+(solution.equilibria.length===1?'':'s')+' found.');
  target.append(intro);
 }
 solution.equilibria.forEach((entry,index)=>{
  const card=node('article','result-card');
  const head=node('h3');head.append(document.createTextNode('Equilibrium '+(index+1)),node('span','',entry.kind+' strategy'));
  card.append(head);
  card.append(node('p','strategy-label',game.players[0]+' strategy'));
  bar(card,game.actions[0][0],entry.x[0]);bar(card,game.actions[0][1],entry.x[1]);
  card.append(node('p','strategy-label',game.players[1]+' strategy'));
  bar(card,game.actions[1][0],entry.y[0]);bar(card,game.actions[1][1],entry.y[1]);
  const metrics=node('div','result-metrics');
  for(const [label,val] of [[game.players[0]+' expected payoff',entry.u],[game.players[1]+' expected payoff',entry.v],['A unilateral regret',entry.regretA],['B unilateral regret',entry.regretB]]){
    const tile=node('div');tile.append(node('strong','',score(val)),node('small','',label));metrics.append(tile);
  }
  card.append(metrics);
  card.append(node('p','result-detail','No profitable one-sided deviation at this strategy pair (within numerical tolerance).'));
  target.append(card);
 });
 if(solution.degenerate)target.append(node('p','strategy-caveat','Degenerate payoff relationships detected; continuous or boundary mixed equilibria may not be enumerated.'));
}
function solveAndRender(){
 try{
  const game=inputGame(),solution=solve2x2(game.A,game.B);
  latest={game,solution,generatedAt:new Date().toISOString(),note:'Synthetic scenario and educational 2×2 Nash solver; not a prediction or consulting recommendation.'};
  renderResult(game,solution);
  text('strategy-status','Solved locally. Edit the matrix to test another assumption.');
  $('download-strategy').disabled=false;
 }catch(error){text('strategy-status',error.message);$('download-strategy').disabled=true;}
}
$('scenario-choice').addEventListener('change',event=>setScenario(event.target.value));
$('solve-game').addEventListener('click',solveAndRender);
$('reset-game').addEventListener('click',()=>setScenario($('scenario-choice').value));
$('download-strategy').addEventListener('click',()=>{
 if(!latest)return;
 const blob=new Blob([JSON.stringify(latest,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='listpull-nash-scenario.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
for(const id of ['a0','a1','b0','b1']){
 $(id).addEventListener('input',()=>{});
}
for(let j=0;j<2;j++){
 const suffix=j===0?'0':'1';
 for(const [rowClass,inputId] of [['a-row-', 'a'+suffix],['b-col-','b'+suffix]]){
  $(inputId).addEventListener('input',event=>{document.querySelectorAll('.'+rowClass+suffix).forEach(n=>n.textContent=event.target.value||'Action');});
 }
}
setScenario('collaboration');
})();