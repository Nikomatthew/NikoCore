export const gameStatusClient=String.raw`
function renderGameStats(game,values,container){
 container.replaceChildren();
 for(const stat of game.design?.stats||[]){const value=values?.[stat.field]??game.flow?.values?.[stat.field];if(!Number.isFinite(value))continue;const row=document.createElement('div'),label=document.createElement('span');label.textContent=stat.label+'：'+value;row.append(label);if(stat.max>stat.min){const meter=document.createElement('progress');meter.max=stat.max-stat.min;meter.value=Math.max(0,Math.min(meter.max,value-stat.min));meter.setAttribute('aria-label',stat.label);row.append(meter);}container.append(row);}
}
`;
