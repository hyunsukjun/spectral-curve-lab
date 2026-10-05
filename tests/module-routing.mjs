import assert from 'node:assert/strict';
import {moduleOrder,defaultEnabled,effectiveCurves,appendToChain,removeFromChain,moveInChain} from '../src/module-routing.js?v=20261005-chain-drag1';
import {SpectralEngine} from '../src/spectral-engine.js?v=20261002-harmonic-freeze1';

const flat=y=>[{x:0,y},{x:1,y}];
const curves={shift:flat(.57),stretch:flat(.7),blur:flat(.8),harmonicity:flat(.85),freeze:flat(1)};
const original=structuredClone(curves);
const neutral={shift:flat(.5),stretch:flat(.5),blur:flat(0),harmonicity:flat(.5),freeze:flat(0)};
const rate=48000;
const input=Float32Array.from({length:rate},(_,i)=>i<rate*.6?.18*Math.sin(2*Math.PI*440*i/rate):0);
function render(c){const e=new SpectralEngine([input],2048,rate,c.shift,c.stretch,0,c.blur,c.harmonicity,c.freeze),out=new Float32Array(input.length);for(let p=0;p<input.length;p+=e.hop)out.set(e.nextHop()[0].subarray(0,Math.min(e.hop,input.length-p)),p);return out;}
const reference=render(neutral);
for(const name of moduleOrder){
  const enabled=Object.fromEntries(moduleOrder.map(module=>[module,false]));enabled[name]=true;
  const routed=effectiveCurves(curves,enabled);
  assert.equal(routed[name],curves[name],`${name} on retains its curve`);
  enabled[name]=false;
  const bypassed=effectiveCurves(curves,enabled);
  assert.deepEqual(bypassed[name],neutral[name],`${name} off routes a neutral curve`);
  assert.deepEqual(curves,original,`${name} toggle does not mutate points`);
  const output=render(bypassed);
  let error=0;for(let i=0;i<output.length;i++)error=Math.max(error,Math.abs(output[i]-reference[i]));
  assert(error<1e-6,`${name} bypass differs from neutral: ${error}`);
  enabled[name]=true;
  assert.equal(effectiveCurves(curves,enabled)[name],curves[name],`${name} re-enable restores points`);
}
assert(moduleOrder.join(' → ')==='stretch → harmonicity → blur → freeze → shift');
assert(Object.values(defaultEnabled()).every(value=>!value));
let order=[];
order=appendToChain(order,'shift');
order=appendToChain(order,'blur');
order=appendToChain(order,'stretch');
assert.deepEqual(order,['shift','blur','stretch'],'all five modules follow activation order');
order=removeFromChain(order,'blur');
order=appendToChain(order,'blur');
assert.deepEqual(order,['shift','stretch','blur'],'re-enabled module joins the output end');
function permutations(items){
  if(items.length===0)return [[]];
  return items.flatMap((item,index)=>permutations(items.filter((_,i)=>i!==index)).map(rest=>[item,...rest]));
}
for(const activation of permutations(moduleOrder)){
  let chain=[];
  for(const name of activation)chain=appendToChain(chain,name);
  assert.deepEqual(chain,activation,'activation order reaches the output');
  for(const name of moduleOrder){
    const removed=removeFromChain(chain,name);
    const reactivated=appendToChain(removed,name);
    assert.deepEqual(reactivated,[...activation.filter(module=>module!==name),name],'re-enabled module joins after all remaining modules');
    assert.deepEqual(moveInChain(activation,name,null),[...activation.filter(module=>module!==name),name],'drop on Output moves the module last');
    for(const target of moduleOrder){
      const moved=moveInChain(activation,name,target);
      assert.deepEqual([...moved].sort(),[...activation].sort(),'reorder preserves each enabled module exactly once');
      if(name!==target)assert.equal(moved.indexOf(name)+1,moved.indexOf(target),'drop on a block inserts immediately before it');
    }
  }
}
assert.deepEqual(moveInChain(['shift','blur'],'stretch','blur'),['shift','blur'],'a disabled module cannot be inserted by dragging');
console.log('Five initial Off routes preserve curves; all 120 activation orders, drag destinations, and re-enable positions match the chain');
