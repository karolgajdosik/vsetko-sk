export function annuity(principal,annualRate,years){if(!Number.isFinite(principal)||!Number.isFinite(annualRate)||!Number.isFinite(years)||principal<0||years<=0||annualRate<0)return NaN;const n=years*12,r=annualRate/1200;return r===0?principal/n:principal*r/(1-(1+r)**(-n));}
export function calculate(kind,v){const x=k=>Math.max(0,Number(v[k])||0);const a=x('amount'),m=x('monthly'),r=x('rate'),y=x('years'),km=x('km'),c=x('cons'),p=x('price');switch(kind){
case 'loan':{const payment=annuity(a,r,y);return [payment,payment*y*12-a];}
case 'refi':{const old=annuity(a,r,y),next=annuity(a,x('rate2'),y);return [old-next,(old-next)*y*12];}
case 'savings':{const n=y*12,q=r/1200;return [q===0?m*n:m*((1+q)**n-1)/q,m*n];}
case 'compound':return [a*(1+r/100)**y,a*((1+r/100)**y-1)];
case 'inflation':return [a*(1+r/100)**y,a/(1+r/100)**y];
case 'reserve':return [m>0?a/m:NaN,a];
case 'downpayment':return [Math.max(0,a-m),a>0?100*m/a:NaN];
case 'travel':return [a+m+r*y,(a+m+r*y)/Math.max(1,y)];
case 'trip':return [km/100*c*p,km>0?c*p:0];
case 'charging':return [a*p,a];
case 'compare':{const petrol=km/100*c*p,ev=km/100*x('cons2')*x('price2');return [petrol-ev,ev];}
case 'lease':{const payment=annuity(Math.max(0,a-m),r,y);return [payment,payment*y*12+m-a];}
case 'depreciation':return [a*(1-Math.min(100,r)/100)**y,a-a*(1-Math.min(100,r)/100)**y];
case 'service':return [(a+m+p)/12,a+m+p];
case 'mileage':return [km*y,km*y/12];
default:return [NaN,NaN];}}
