export const game3DKit=String.raw`
import * as THREE from './three.module.js';
import RAPIER from './rapier.mjs';
export {THREE,RAPIER};
export async function createPhysics({gravity={x:0,y:-9.81,z:0},step=1/60}={}){
 await RAPIER.init();const world=new RAPIER.World(gravity);world.timestep=step;
 return {world,step(){world.step();},box({x=0,y=0,z=0,width=1,height=1,depth=1,dynamic=false}={}){const body=world.createRigidBody((dynamic?RAPIER.RigidBodyDesc.dynamic():RAPIER.RigidBodyDesc.fixed()).setTranslation(x,y,z));const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(width/2,height/2,depth/2),body);return {body,collider};},character({x=0,y=2,z=0,radius=.3,halfHeight=.6}={}){const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,y,z)),collider=world.createCollider(RAPIER.ColliderDesc.capsule(halfHeight,radius),body),controller=world.createCharacterController(.02);controller.enableAutostep(.3,.2,true);controller.enableSnapToGround(.2);return {body,collider,controller,move(displacement){controller.computeColliderMovement(collider,displacement);const p=body.translation(),d=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});return {grounded:controller.computedGrounded()};},dispose(){world.removeCharacterController(controller);world.removeRigidBody(body);}};},dispose(){world.free();}};
}
export function createAnimations(root,clips){const mixer=new THREE.AnimationMixer(root),actions=new Map(clips.map(clip=>[clip.name,mixer.clipAction(clip)]));let active;return {names:[...actions.keys()],play(name,fade=.2){const next=actions.get(name);if(!next)throw Error('动画不存在：'+name);if(next===active)return;next.reset().play();if(active)active.crossFadeTo(next,fade,false);active=next;},update:dt=>mixer.update(dt),dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);}};}
export function followCamera(camera,target,offset,alpha=.15){const desired=new THREE.Vector3().copy(target).add(offset);camera.position.lerp(desired,Math.max(0,Math.min(1,alpha)));camera.lookAt(target);}
`;
