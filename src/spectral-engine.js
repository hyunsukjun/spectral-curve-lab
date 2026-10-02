import {SpectralBlur,neutralBlurCurve} from './spectral-blur.js?v=20260929-transport1';
import {SpectralShift,neutralShiftCurve} from './spectral-shift.js?v=20261003-chain4';
import {SpectralStretch,neutralStretchCurve} from './spectral-stretch.js?v=20261002-harmonic-freeze1';
import {SpectralHarmonicity,neutralHarmonicityCurve} from './spectral-harmonicity.js?v=20261002-harmonic-freeze1';
import {SpectralFreeze,neutralFreezeCurve} from './spectral-freeze.js?v=20261002-harmonic-freeze1';
import {moduleOrder} from './module-routing.js?v=20261003-chain4';
import {NeutralSTFT} from './spectral-core.js?v=20261003-chain4';

// When Shift has successors, those processors need a second analysis pass over
// Shift's actual output. A small rolling buffer keeps loaded-file memory bounded.
class PostShiftSTFT extends NeutralSTFT {
  constructor(channels,size,provider,processors,order){
    super(channels,size,0);
    this.provider=provider;this.processors=processors;this.order=[...order];
  }
  readWindowedFrame(channel,start){
    for(let i=0;i<this.size;i++){
      this.re[i]=this.provider.postShiftSample(channel,start+i)*this.window[i];
      this.im[i]=0;
    }
  }
  transformSpectrum(re,im,frameStart,channel){
    for(const name of this.order)this.processors[name].process(re,im,frameStart,channel);
  }
}

export class SpectralEngine extends SpectralShift {
  constructor(channels,size=2048,rate=48000,shiftCurve=neutralShiftCurve(),stretchCurve=neutralStretchCurve(),start=0,blurCurve=neutralBlurCurve(),harmonicityCurve=neutralHarmonicityCurve(),freezeCurve=neutralFreezeCurve(),order=moduleOrder){
    super(channels,size,rate,shiftCurve,start);
    this.stretchProcessor=new SpectralStretch(channels.length,size,rate,this.length,stretchCurve);
    this.stretchProcessor.reset(start);
    this.harmonicityProcessor=new SpectralHarmonicity(channels.length,size,rate,this.length,harmonicityCurve);
    this.harmonicityProcessor.reset(start);
    this.blurProcessor=new SpectralBlur(channels.length,size,rate,this.length,blurCurve);this.blurProcessor.reset(start);
    this.freezeProcessor=new SpectralFreeze(channels.length,size,rate,this.length,freezeCurve);this.freezeProcessor.reset(start);
    this.processors={stretch:this.stretchProcessor,harmonicity:this.harmonicityProcessor,blur:this.blurProcessor,freeze:this.freezeProcessor};
    this.setOrder(order);
  }
  setOrder(order){
    if(!Array.isArray(order)||new Set(order).size!==order.length||order.some(name=>!moduleOrder.includes(name)))throw new Error('Invalid spectral chain order');
    const position=this.outputPosition;
    const shiftIndex=order.indexOf('shift');
    const postNames=shiftIndex<0?[]:order.slice(shiftIndex+1);
    const requiresNewPass=postNames.length>0;
    const oldPostNames=this.postNames || [];
    const topologyChanged=requiresNewPass!==!!this.postEngine || postNames.join(',')!==oldPostNames.join(',');
    this.order=[...order];
    this.postNames=postNames;
    const preNames=shiftIndex<0?order:order.slice(0,shiftIndex);
    this.spectrumOrder=[...preNames,...moduleOrder.filter(name=>name!=='shift'&&!order.includes(name))];
    if(requiresNewPass){
      if(topologyChanged){
        this.ringLength=this.size*2;
        this.postShiftRing=this.channels.map(()=>new Float32Array(this.ringLength));
        this.postEngine=new PostShiftSTFT(this.channels,this.size,this,this.processors,postNames);
      }else this.postEngine.order=[...postNames];
    }else this.postEngine=null;
    if(topologyChanged)this.seek(position);
  }
  get outputPosition(){return this.postEngine?.position ?? this.position;}
  needsPreparation(){const output=this.postEngine || this;return output.nextFrame<=output.position;}
  atFrameBoundary(){return (this.postEngine || this).frameChannel===0;}
  postShiftSample(channel,index){
    if(index<0||index>=this.length)return 0;
    if(index>=this.preGenerated||index<this.preGenerated-this.ringLength)throw new Error('Post-Shift input window unavailable');
    return this.postShiftRing[channel][index%this.ringLength];
  }
  ensurePostShiftInput(end){
    const target=Math.max(0,Math.min(this.length,end));
    while(this.preGenerated<target){
      this.preparingPreShift=true;
      let block;
      try{block=super.nextHop();}finally{this.preparingPreShift=false;}
      const count=Math.min(this.hop,this.length-this.preGenerated);
      for(let channel=0;channel<block.length;channel++)for(let i=0;i<count;i++){
        this.postShiftRing[channel][(this.preGenerated+i)%this.ringLength]=block[channel][i];
      }
      this.preGenerated+=count;
    }
  }
  accumulateNextChannel(){
    if(!this.postEngine||this.preparingPreShift)return super.accumulateNextChannel();
    this.ensurePostShiftInput(this.postEngine.nextFrame+this.size);
    this.postEngine.accumulateNextChannel();
  }
  nextHop(){
    if(!this.postEngine)return super.nextHop();
    while(this.needsPreparation())this.accumulateNextChannel();
    return this.postEngine.nextHop();
  }
  setBlurCurve(curve){this.blurProcessor.setCurve(curve);}
  setStretchCurve(curve){this.stretchProcessor.setCurve(curve);}
  setHarmonicityCurve(curve){this.harmonicityProcessor.setCurve(curve);}
  setFreezeCurve(curve){this.freezeProcessor.setCurve(curve);}
  seek(position){
    const target=Math.max(0,Math.min(this.length,Math.floor(Number.isFinite(position)?position:0)));
    const preStart=this.postEngine?Math.max(0,target-this.size):target;
    super.seek(preStart);
    if(!this.processors)return;
    for(const name of moduleOrder){
      if(name==='shift')continue;
      const post=this.postNames?.includes(name);
      this.processors[name].reset(post?Math.max(0,target-this.size+this.hop):preStart);
    }
    if(this.postEngine){
      this.postShiftRing.forEach(ring=>ring.fill(0));
      this.preGenerated=preStart;
      this.postEngine.seek(target);
    }
  }
  transformSpectrum(re,im,frameStart,channel){
    for(const name of this.spectrumOrder)this.processors[name].process(re,im,frameStart,channel);
    super.transformSpectrum(re,im,frameStart,channel);
  }
}
