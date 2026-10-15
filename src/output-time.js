// Display-only source-channel overview on the unchanged output timeline.
import {analyzeSourceColors} from "./source-colors.js";
import {summarizeChannels, paintEnvelope, peakOf, paintToneLegend} from "./source-envelope.js";
export function createOutputTime(canvas, {seek, scrubbing, formatClock}) {
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  let peaks = [], duration = 0, seconds = 0, disabled = true, dragging = false, hover = null;
  let width = 1, height = 96, ratio = 1;
  let sourceColors = null, sourceBuffer = null;
  const left = 54, right = 8;
  const plotWidth = () => Math.max(1, width - left - right);
  function paintBase() {
    const c = base.getContext('2d');
    c.setTransform(ratio,0,0,ratio,0,0);
    c.fillStyle='#191c20'; c.fillRect(0,0,width,height);
    c.font='400 11px system-ui'; c.fillStyle='#aabccc'; c.textAlign='left';
    c.fillText('Output Time',10,13);
    const hintX = Math.max(left + 100, 10 + c.measureText('Output Time').width + 16);
    const hint = 'Source guide · Click / drag to seek';
    const shortHint = 'Source guide';
    const available = width - right - hintX - (width >= 460 ? 150 : 0);
    if (c.measureText(hint).width <= available) c.fillText(hint,hintX,13);
    else if (c.measureText(shortHint).width <= available) c.fillText(shortHint,hintX,13);
    const divisions=plotWidth()<360?2:plotWidth()<680?4:10;
    c.strokeStyle='rgba(139,149,162,.18)'; c.lineWidth=1;
    for(let i=0;i<=divisions;i++){
      const x=left+plotWidth()*i/divisions;
      c.beginPath(); c.moveTo(x,21); c.lineTo(x,77); c.stroke();
      c.textAlign=i===0?'left':i===divisions?'right':'center';
      c.fillText(formatClock(duration*i/divisions),x,91);
    }
    const referencePeak = peakOf(peaks);
    peaks.forEach((channel,index)=>{
      const mid=peaks.length===1?49:index===0?35:64;
      const amp=peaks.length===1?25:12;
      c.textAlign='left'; c.fillStyle='#aabccc'; c.fillText(peaks.length===1?'MONO':index===0?'L':'R',10,mid+3);
      paintEnvelope(c,channel,sourceColors?.[index],left,plotWidth(),mid,amp,ratio,referencePeak);
    });
    paintToneLegend(c,width,12);
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
    setBuffer(buffer){
      sourceBuffer=buffer; duration=buffer?.duration||0; sourceColors=null;
      peaks=buffer?summarizeChannels(Array.from({length:buffer.numberOfChannels},(_,ch)=>buffer.getChannelData(ch))):[];
      analyzeSourceColors(buffer,colors=>{
        if(sourceBuffer!==buffer)return;
        sourceColors=colors; paintBase(); draw();
      });
      resize();
    },
    setDisabled(value){disabled=value;canvas.setAttribute('aria-disabled',String(value));if(value)clearDrag();},
    update(value){seconds=value;draw();}
  };
}
