export function newGomoku(players){if(!Array.isArray(players)||players.length!==2||new Set(players).size!==2)throw Error('五子棋需要两位不同玩家');return {players:[...players],board:Array(225).fill(0),turn:0,winner:null,draw:false,moves:0};}
export function moveGomoku(state,player,x,y){
 const next=structuredClone(state);if(next.winner||next.draw)throw Error('本局已结束');if(next.players[next.turn]!==player)throw Error('尚未轮到你');
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=15||y<0||y>=15||next.board[y*15+x])throw Error('落子位置无效');
 const stone=next.turn+1;next.board[y*15+x]=stone;next.moves++;
 for(const [dx,dy]of [[1,0],[0,1],[1,1],[1,-1]]){let count=1;for(const sign of [-1,1])for(let i=1;i<5;i++){const a=x+dx*i*sign,b=y+dy*i*sign;if(a<0||a>=15||b<0||b>=15||next.board[b*15+a]!==stone)break;count++;}if(count>=5)next.winner=player;}
 if(!next.winner&&next.moves===225)next.draw=true;next.turn=1-next.turn;return next;
}
