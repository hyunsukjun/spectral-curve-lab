export const moduleOrder = Object.freeze(['stretch','harmonicity','blur','freeze','shift']);

export const defaultEnabled = () => ({shift:false,stretch:false,blur:false,harmonicity:false,freeze:false});

// Re-enabling an effect adds it to the output end of the active chain.
export function appendToChain(order,name){
  if (!moduleOrder.includes(name)) throw new Error(`Unknown spectral module: ${name}`);
  return [...order.filter(module=>module!==name),name];
}

export function removeFromChain(order,name){return order.filter(module=>module!==name);}

const neutral = {
  shift: .5,
  stretch: .5,
  blur: 0,
  harmonicity: .5,
  freeze: 0
};

// Routing only: bypass never overwrites the user's editable curve.
export function effectiveCurves(curves,enabled){
  return Object.fromEntries(moduleOrder.map(name=>[
    name,
    enabled[name] ? curves[name] : [{x:0,y:neutral[name]},{x:1,y:neutral[name]}]
  ]));
}
