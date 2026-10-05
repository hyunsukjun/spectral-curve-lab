// Source-channel overview on the unchanged output timeline; no DSP or analysis.
export function createOutputTime(canvas, {seek, scrubbing, formatClock}) {
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  let peaks = [], duration = 0, seconds = 0, disabled = true, dragging = false, hover = null;
  let width = 1, height = 96, ratio = 1;
  const left = 54, right = 8;
  const plotWidth = () => Math.max(1, width - left - right);
  function paintBase() {
    const c = base.getContext('2d');
    c.setTransform(ratio,0,0,ratio,0,0);
    c.fillStyle='#0c1f31'; c.fillRect(0,0,width,height);
    c.font='10px system-ui'; c.fillStyle='#aabccc'; c.textAlign='left';
    c.fillText('OUTPUT TIME',10,13);
    if(width>480)c.fillText('SOURCE GUIDE · CLICK / DRAG TO SEEK',left+100,13);
    const divisions=plotWidth()<360?2:plotWidth()<680?4:10;
    c.strokeStyle='rgba(79,121,155,.28)'; c.lineWidth=1;
    for(let i=0;i<=divisions;i++){
      const x=left+plotWidth()*i/divisions;
      c.beginPath(); c.moveTo(x,21); c.lineTo(x,77); c.stroke();
      c.textAlign=i===0?'left':i===divisions?'right':'center';
      c.fillText(formatClock(duration*i/divisions),x,91);
    }
    peaks.forEach((channel,index)=>{
      const mid=peaks.length===1?49:index===0?35:64;
      const amp=peaks.length===1?25:12;
      c.textAlign='left'; c.fillStyle='#aabccc'; c.fillText(peaks.length===1?'MONO':index===0?'L':'R',10,mid+3);
      c.fillStyle='rgba(146,171,190,.8)';
      for(let x=0;x<plotWidth();x++){
        const value=channel[Math.min(channel.length-1,Math.floor(x/plotWidth()*channel.length))]||0;
        const a=Math.min(amp,value*45);
        c.fillRect(left+x,mid-a,1,Math.max(1,a*2));
      }
    });
    canvas.dataset.sourceChannels=String(peaks.length);
  }
  function draw() {
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(base,0,0);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const line=x=>{ctx.beginPath();ctx.moveTo(x,21);ctx.lineTo(x,77);ctx.stroke();};
    ctx.strokeStyle=ctx.fillStyle='#e2ecf4';ctx.lineWidth=1.5;
    if(!disabled&&!dragging&&hover!==null){ctx.setLineDash([3,4]);line(left+hover*plotWidth());ctx.setLineDash([]);}
    if(duration){const x=left+Math.max(0,Math.min(1,seconds/duration))*plotWidth();line(x);
      ctx.beginPath();ctx.moveTo(x-5,21);ctx.lineTo(x+5,21);ctx.lineTo(x,28);ctx.closePath();
      ctx.moveTo(x-5,77);ctx.lineTo(x+5,77);ctx.lineTo(x,70);ctx.closePath();ctx.fill();}
    canvas.setAttribute('aria-valuemax',String(duration));canvas.setAttribute('aria-valuenow',String(seconds));
    canvas.setAttribute('aria-valuetext',`${formatClock(seconds)} of ${formatClock(duration)}. Source waveform guide, not rendered output.`);
  }
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;ratio=devicePixelRatio||1;
    canvas.width=base.width=Math.max(1,Math.floor(width*ratio));canvas.height=base.height=Math.max(1,Math.floor(height*ratio));paintBase();draw();}
  function progress(event){return Math.max(0,Math.min(1,(event.clientX-canvas.getBoundingClientRect().left-left)/plotWidth()));}
  function clearDrag(){dragging=false;hover=null;scrubbing(false);draw();}
  canvas.addEventListener('pointerdown',event=>{if(disabled||event.button!==0)return;event.preventDefault();canvas.focus({preventScroll:true});dragging=true;hover=null;scrubbing(true);canvas.setPointerCapture(event.pointerId);seek(progress(event));});
  canvas.addEventListener('pointermove',event=>{if(disabled)return;if(dragging){seek(progress(event));return;}const r=canvas.getBoundingClientRect();hover=event.pointerType!=='touch'&&event.clientX>=r.left+left&&event.clientX<=r.right-right?progress(event):null;draw();});
  canvas.addEventListener('pointerleave',()=>{hover=null;draw();});
  canvas.addEventListener('pointerup',event=>{if(dragging&&!disabled)seek(progress(event));clearDrag();if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);});
  canvas.addEventListener('pointercancel',clearDrag);canvas.addEventListener('lostpointercapture',clearDrag);window.addEventListener('blur',clearDrag);
  canvas.addEventListener('keydown',event=>{if(disabled)return;let next=seconds;
    if(event.key==='ArrowLeft')next-=event.shiftKey ? 0.1 : 1;else if(event.key==='ArrowRight')next+=event.shiftKey ? 0.1 : 1;
    else if(event.key==='Home')next=0;else if(event.key==='End')next=duration;else return;
    event.preventDefault();hover=null;seek(Math.max(0,Math.min(1,next/duration)));});
  new ResizeObserver(resize).observe(canvas);
  return {
    setBuffer(buffer){duration=buffer?.duration||0;peaks=[];
      for(let ch=0;ch<(buffer?.numberOfChannels||0);ch++){const data=buffer.getChannelData(ch),n=Math.min(4000,data.length),bins=new Float32Array(n);
        for(let i=0;i<n;i++){let peak=0;for(let j=Math.floor(i*data.length/n);j<Math.floor((i+1)*data.length/n);j++)peak=Math.max(peak,Math.abs(data[j]));bins[i]=peak;}peaks.push(bins);}
      resize();},
    setDisabled(value){disabled=value;canvas.setAttribute('aria-disabled',String(value));if(value)clearDrag();},
    update(value){seconds=value;draw();}
  };
}
