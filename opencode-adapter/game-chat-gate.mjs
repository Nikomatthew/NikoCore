export function botRoomForPlayer(rooms,user){return Object.values(rooms||{}).find(r=>['waiting','dealing','playing'].includes(r.status)&&r.members?.includes(String(user)))||null;}
export function blocksOrdinaryChat(rooms,user){return Boolean(botRoomForPlayer(rooms,user));}
