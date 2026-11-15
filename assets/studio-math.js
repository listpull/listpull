/* Browser-first numerical demonstrations. No private 
 * These independent educational solvers are intentionally narrower than 
 * CommonJS exports also allow dependency-free Node tests. */
(function(root){
'use strict';
const EPS=1e-7;
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

 function fitArima110(values,horizon){
  const d=values.slice(1).map((v,i)=>v-values[i]);
  const x=d.slice(0,-1),y=d.slice(1),n=x.length;
  const mx=x.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;
  const cov=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0),varx=x.reduce((s,v)=>s+(v-mx)**2,0);
  // Fallback to drift-only if the differenced observations have no variance.
  let phi=varx>1e-10?cov/varx:0;
  phi=Math.max(-.99,Math.min(.99,phi));
  const intercept=my-phi*mx;
  const residuals=y.map((v,i)=>v-intercept-phi*x[i]);
  const variance=residuals.reduce((s,v)=>s+v*v,0)/Math.max(1,n-2);
  const sigma=Math.sqrt(Math.max(variance,0));
  let level=values[values.length-1],prevD=d[d.length-1];const forecast=[];
  for(let k=1;k<=horizon;k++){
    const predictedDifference=intercept+phi*prevD;
    level+=predictedDifference;prevD=predictedDifference;
    // Deliberately rough visual teaching band, not a calibrated interval.
    const rough=1.96*sigma*Math.sqrt(k);
    forecast.push({step:k,point:level,lower:level-rough,upper:level+rough});
  }
  return {forecast,phi,intercept,sigma,model:'ARIMA(1,1,0), OLS approximation'};
 }

const api=Object.freeze({solve2x2,fitArima110});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.ListPullMath=api;
})(typeof window!=='undefined'?window:null);
