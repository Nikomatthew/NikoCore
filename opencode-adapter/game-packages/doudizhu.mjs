import crypto from 'node:crypto';

export function cardRank(card){if(!Number.isInteger(card)||card<0||card>53)throw Error('牌编号无效');return card<52?Math.floor(card/4)+3:card-36;}
export function cardLabel(card){const rank=cardRank(card);return rank<=10?String(rank):({11:'J',12:'Q',13:'K',14:'A',15:'2',16:'小王',17:'大王'})[rank];}
function consecutive(values){return values.every((rank,index)=>index===0||rank===values[index-1]+1)&&values.at(-1)<15;}
export function classifyCards(cards){
 if(!Array.isArray(cards)||!cards.length||cards.length>20||new Set(cards).size!==cards.length)throw Error('出牌无效');
 const counts=new Map();for(const card of cards){const rank=cardRank(card);counts.set(rank,(counts.get(rank)||0)+1);}const ranks=[...counts.keys()].sort((a,b)=>a-b),n=cards.length;
 const result=(type,high,length=1)=>({type,high,length,count:n});
 if(n===2&&counts.has(16)&&counts.has(17))return result('rocket',17);
 if(ranks.length===1){const types={1:'single',2:'pair',3:'triple',4:'bomb'};return result(types[n],ranks[0]);}
 const triple=ranks.find(r=>counts.get(r)===3),four=ranks.find(r=>counts.get(r)===4);
 if(n===4&&triple)return result('triple-single',triple);
 if(n===5&&triple&&ranks.length===2)return result('triple-pair',triple);
 if(n>=5&&ranks.length===n&&consecutive(ranks))return result('straight',ranks.at(-1),n);
 if(n>=6&&n%2===0&&ranks.length===n/2&&ranks.every(r=>counts.get(r)===2)&&consecutive(ranks))return result('pair-straight',ranks.at(-1),n/2);
 if(four&&n===6)return result('four-singles',four);
 if(four&&n===8&&ranks.length===3&&ranks.filter(r=>r!==four).every(r=>counts.get(r)===2))return result('four-pairs',four);
 for(const wing of [0,1,2]){
  const size=3+wing;if(n%size!==0)continue;const length=n/size;if(length<2)continue;
  for(let start=3;start+length-1<=14;start++){
   const body=Array.from({length},(_,i)=>start+i);if(!body.every(r=>counts.get(r)===3))continue;
   const rest=ranks.filter(r=>!body.includes(r)),restCount=rest.reduce((sum,r)=>sum+counts.get(r),0);
   if(wing===0&&restCount===0)return result('airplane',body.at(-1),length);
   if(wing===1&&restCount===length&&rest.every(r=>counts.get(r)<=2))return result('airplane-singles',body.at(-1),length);
   if(wing===2&&rest.length===length&&rest.every(r=>counts.get(r)===2))return result('airplane-pairs',body.at(-1),length);
  }
 }
 throw Error('不支持的牌型，请重新选择');
}
export function beatsCards(next,previous){if(!previous)return true;if(next.type==='rocket')return previous.type!=='rocket';if(previous.type==='rocket')return false;if(next.type==='bomb'&&previous.type!=='bomb')return true;return next.type===previous.type&&next.count===previous.count&&next.length===previous.length&&next.high>previous.high;}
export function shuffledDeck(randomInt=crypto.randomInt){const deck=Array.from({length:54},(_,i)=>i);for(let i=53;i>0;i--){const j=randomInt(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;}
export function newDoudizhu(players,deck=shuffledDeck()){
 if(!Array.isArray(players)||players.length!==3||new Set(players).size!==3||!Array.isArray(deck)||deck.length!==54||new Set(deck).size!==54)throw Error('斗地主需要三位不同玩家和完整牌组');deck.forEach(cardRank);
 return {players:[...players],hands:Object.fromEntries(players.map((p,i)=>[p,deck.slice(i*17,(i+1)*17).sort((a,b)=>cardRank(a)-cardRank(b)||a-b)])),bottom:deck.slice(51),phase:'bidding',turn:0,bids:{},highestBid:0,landlord:null,table:null,passes:0,winners:[],history:[]};
}
export function bidDoudizhu(state,player,bid){
 const next=structuredClone(state);if(next.phase!=='bidding'||next.players[next.turn]!==player||Object.hasOwn(next.bids,player))throw Error('尚未轮到你叫分');if(!Number.isInteger(bid)||bid<0||bid>3||bid>0&&bid<=next.highestBid)throw Error('叫分须为不叫(0)或高于当前的1–3分');
 next.bids[player]=bid;if(bid>0){next.highestBid=bid;next.landlord=player;}
 if(bid===3||Object.keys(next.bids).length===3){if(!next.landlord){next.phase='finished';next.reason='no-bid';return next;}next.hands[next.landlord].push(...next.bottom);next.hands[next.landlord].sort((a,b)=>cardRank(a)-cardRank(b)||a-b);next.turn=next.players.indexOf(next.landlord);next.phase='playing';}else next.turn=(next.turn+1)%3;
 return next;
}
export function playDoudizhu(state,player,cards){
 const next=structuredClone(state);if(next.phase!=='playing'||next.players[next.turn]!==player)throw Error('尚未轮到你出牌');if(!Array.isArray(cards)||cards.some(card=>!next.hands[player].includes(card))||new Set(cards).size!==cards.length)throw Error('只能出自己的牌，不能重复选择');
 if(cards.length===0){if(!next.table||next.table.player===player)throw Error('本轮首家不能不出');next.passes++;next.history.push({player,pass:true});if(next.passes===2){const lead=next.table.player;next.table=null;next.passes=0;next.turn=next.players.indexOf(lead);return next;}}
 else{const pattern=classifyCards(cards);if(!beatsCards(pattern,next.table?.pattern))throw Error('所选牌无法压过当前牌');next.hands[player]=next.hands[player].filter(card=>!cards.includes(card));next.table={player,cards:[...cards],pattern};next.passes=0;next.history.push({player,cards:[...cards]});if(!next.hands[player].length){next.phase='finished';next.reason='hand-empty';next.winners=player===next.landlord?[player]:next.players.filter(p=>p!==next.landlord);return next;}}
 next.history=next.history.slice(-200);next.turn=(next.turn+1)%3;return next;
}
export function doudizhuView(state,player){if(!state.players.includes(player))throw Error('不是本局玩家');return {phase:state.phase,turn:state.turn,landlord:state.landlord,highestBid:state.highestBid,bids:{...state.bids},hand:[...state.hands[player]],counts:Object.fromEntries(state.players.map(p=>[p,state.hands[p].length])),bottom:state.landlord?[...state.bottom]:[],table:structuredClone(state.table),winners:[...state.winners],reason:state.reason||null};}
