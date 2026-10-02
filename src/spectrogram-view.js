export function createSpectrogramView({getBuffer,getCurves,getOrder,isBusy}){
 const toggle=document.getElementById('spectrogramToggle'),panel=document.getElementById('spectrogramPanel'),button=document.getElementById('updateSpectrogram'),status=document.getElementById('spectrogramStatus');
 const canvases=['sourceSpectrogram','outputSpectrogram'].map(id=>document.getElementById(id));
 let worker=null,result=null,images=null,revision=0,stale=true,signature=JSON.stringify({curves:getCurves(),order:getOrder()});
 function cancel(message='Analysis cancelled · Update to refresh') {revision++;if(worker){worker.terminate();worker=null;status.textContent=message;button.textContent='Update comparison';}}
 function invalidate(sourceChanged=false){const next=JSON.stringify({curves:getCurves(),order:getOrder()});if(!sourceChanged&&next===signature)return;signature=next;revision++;stale=true;cancel();if(sourceChanged){result=null;images=null;}status.textContent=getBuffer()?'Update needed':'Load audio to compare';draw();}
 function image(item){const c=document.createElement('canvas');c.width=item.width;c.height=item.height;const cx=c.getContext('2d'),pixels=cx.createImageData(c.width,c.height);
  for(let i=0;i<item.data.length;i++){const v=(item.data[i]+90)/90,o=i*4;pixels.data[o]=Math.round(12+238*v*v);pixels.data[o+1]=Math.round(19+216*v);pixels.data[o+2]=Math.round(26+130*Math.sin(v*Math.PI));pixels.data[o+3]=255;}cx.putImageData(pixels,0,0);return c;}
 function draw(){
  if(panel.hidden)return;
  for(let index=0;index<canvases.length;index++){
   const c=canvases[index],width=Math.max(280,c.clientWidth),height=230,dpr=window.devicePixelRatio||1;c.width=Math.round(width*dpr);c.height=height*dpr;const cx=c.getContext('2d');cx.setTransform(dpr,0,0,dpr,0,0);
   const left=45,top=12,w=width-left-12,h=height-top-30;cx.fillStyle='#10191f';cx.fillRect(0,0,width,height);
   if(images){cx.globalAlpha=stale?.45:1;cx.drawImage(images[index],left,top,w,h);cx.globalAlpha=1;}
   const meta=result?.source,min=meta?.minHz||40,max=meta?.maxHz||20000;cx.font='10px system-ui';cx.textAlign='right';cx.fillStyle='#c4d1d4';
   for(const hz of [40,100,500,1000,5000,20000].filter(f=>f<=max)){const y=top+h*(1-Math.log(hz/min)/Math.log(max/min));cx.fillText(hz>=1000?`${hz/1000}k`:String(hz),left-6,Math.max(10,y+3));cx.strokeStyle='#ffffff18';cx.beginPath();cx.moveTo(left,y);cx.lineTo(left+w,y);cx.stroke();}
   cx.textAlign='center';const duration=meta?.duration||getBuffer()?.duration||0;for(let i=0;i<=4;i++)cx.fillText(`${(duration*i/4).toFixed(1)}s`,left+w*i/4,height-8);
   if(!result){cx.fillStyle='#9aaab1';cx.fillText('Update comparison to view',left+w/2,top+h/2);}else if(stale){cx.fillStyle='#edf3f2';cx.fillText('Previous result · Update needed',left+w/2,top+h/2);}
  }
 }
 function update(){
  if(worker){cancel();return;}
  const buffer=getBuffer();if(!buffer){status.textContent='Load audio to compare';return;}
  if(isBusy()){status.textContent='Pause playback or finish export before updating';return;}
  const job=revision;status.textContent='Analysing 0%';button.textContent='Cancel analysis';
  try{
   worker=new Worker(new URL('./spectrogram-worker.js?v=20261003-chain4',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{if(job!==revision)return;if(data.progress!=null){status.textContent=`Analysing ${data.progress}%`;return;}cancel();if(data.error){status.textContent=`Analysis failed: ${data.error}`;return;}result=data;images=[image(data.source),image(data.output)];stale=false;status.textContent=`Current curves · ${(data.source.rate/1000).toFixed(1)} kHz preview · ${data.source.fftSize} FFT`;draw();};
   worker.onerror=event=>{if(job!==revision)return;cancel();status.textContent=`Analysis failed: ${event.message}`;};
   const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>new Float32Array(buffer.getChannelData(i)));
   worker.postMessage({channels,rate:buffer.sampleRate,curves:structuredClone(getCurves()),order:[...getOrder()]},channels.map(c=>c.buffer));
  }catch(error){cancel();status.textContent=`Analysis failed: ${error.message}`;}
 }
 toggle.addEventListener('change',()=>{panel.hidden=!toggle.checked;if(panel.hidden)cancel();else {draw();if(!result)update();}});
 button.addEventListener('click',update);new ResizeObserver(draw).observe(panel);
 return {invalidate,cancel};
}
