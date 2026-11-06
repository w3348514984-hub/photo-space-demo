"use strict";
(() => {
  const scene = document.getElementById("scene");
  const world = document.getElementById("world");
  const loading = document.getElementById("scene-loading");
  const photoCount = document.getElementById("photo-count");
  const modeName = document.getElementById("mode-name");
  const hint = document.getElementById("scene-hint");
  const input = document.getElementById("photo-input");
  const dropZone = document.getElementById("drop-zone");
  const viewer = document.getElementById("viewer");
  const viewerPhoto = document.getElementById("viewer-photo");
  const viewerCaption = document.getElementById("viewer-caption");
  const names = {cloud:"照片云 Cloud",orbit:"环形年轮 Orbit",arc:"弧形长廊 Arc",stack:"记忆长卷 Stack",wall:"回忆墙 Wall"};
  const pal = [
    ["#284d59","#c2a079","#e6b96d","#a0c5bd"],
    ["#243847","#e2ae7c","#c7784b","#d2d8c5"],
    ["#315d52","#a3bc90","#f7d7a0","#456974"],
    ["#3a4356","#bacad8","#d79e8c","#f3dabe"],
    ["#304d6f","#e7d0ba","#c6a27d","#718f8d"],
    ["#634b57","#d0bd9f","#e7c897","#617c7d"],
    ["#38464b","#a9c4c8","#bb795c","#e7c9a5"],
    ["#456c62","#ccd4aa","#d68c73","#eee0bf"]
  ];
  const state = {mode:"cloud",photos:[],cards:[],yaw:-11,pitch:6,zoom:1,index:0,drag:false,moved:false,lastX:0,lastY:0,startX:0,startY:0,ownedUrls:[],lastInteraction:Date.now()};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Keep DOM/GPU layers bounded, but retain all imported images for the lightbox.
  const MAX_VISIBLE_CARDS = 110;
  const LOW_VISIBLE_CARDS = 60;
  let renderBudget = MAX_VISIBLE_CARDS;
  let cameraFrame = 0;
  let layoutTimeout = 0;
  let hasShownFirstLayout = false;
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const rnd = n => {const x = Math.sin(n*78.233+16.8)*43758.5453;return x-Math.floor(x);};
  function sampleArt(i) {
    const p = pal[i%pal.length];
    const w = i%3===0?350:280, h = i%3===0?260:370, sunX = 48+Math.round(rnd(i+2)*225);
    const y1 = Math.round(h*(.53+rnd(i+4)*.1)), y2 = Math.round(h*(.68+rnd(i+7)*.08));
    const skyline = i%9===0 ? '<path d="M0 '+y1+' H45 V'+(y1-50)+' H75 V'+(y1-90)+' H98 V'+(y1-35)+' H120 V'+(y1-70)+' H145 V'+y1+' H'+w+' V'+h+' H0Z" fill="'+p[3]+'" opacity=".84"/>' : '';
    const paths = i%7===0 ? '<path d="M0 '+y2+' Q'+(w*.29)+' '+(y1-80)+' '+(w*.55)+' '+y2+' T'+w+' '+(y1-30)+' V'+h+' H0Z" fill="'+p[2]+'" opacity=".45"/>' : '';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="'+p[0]+'"/><stop offset=".72" stop-color="'+p[1]+'"/><stop offset="1" stop-color="'+p[3]+'"/></linearGradient></defs><rect width="'+w+'" height="'+h+'" fill="url(#g)"/><circle cx="'+sunX+'" cy="'+Math.round(h*.28)+'" r="'+(20+Math.round(rnd(i+10)*36))+'" fill="'+p[2]+'" opacity=".9"/><path d="M0 '+y1+' Q'+(w*.2)+' '+(y1-80)+' '+(w*.49)+' '+(y1+25)+' T'+w+' '+(y1-15)+' V'+h+' H0Z" fill="'+p[3]+'"/><path d="M0 '+y2+' Q'+(w*.32)+' '+(y1+20)+' '+(w*.65)+' '+y2+' T'+w+' '+(y2+10)+' V'+h+' H0Z" fill="'+p[0]+'" opacity=".8"/>'+skyline+paths+'<path d="M0 '+(h-24)+' H'+w+'" stroke="#f5e8ce" stroke-opacity=".12" stroke-width="2"/></svg>';
    return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
  }
  function createSamples() {
    return Array.from({length:MAX_VISIBLE_CARDS},(_,i)=>{
      const artwork=sampleArt(i);
      return {name:"片段 "+String(i+1).padStart(3,"0"),thumb:artwork,full:artwork,landscape:i%3===0};
    });
  }
  function discardOwned() {
    state.ownedUrls.forEach(url=>URL.revokeObjectURL(url));
    state.ownedUrls.length=0;
  }
  function makeCard(photo,i,fragment) {
    const button=document.createElement("button");
    button.type="button"; button.className="photo";button.setAttribute("aria-label","查看 "+photo.name);
    button.style.setProperty("--w",photo.landscape?"111px":"82px");
    button.style.setProperty("--h",photo.landscape?"83px":"108px");
    const img=document.createElement("img");img.src=photo.thumb;img.alt="";img.draggable=false;
    button.append(img);button.addEventListener("click",e=>{
      if(state.moved){e.preventDefault();return;}
      openViewer(i);
    });
    fragment.appendChild(button);
    return button;
  }
  function initializePhotos(photos) {
    world.replaceChildren();
    state.photos=photos;
    const fragment=document.createDocumentFragment();
    state.cards=photos.slice(0,renderBudget).map((photo,i)=>makeCard(photo,i,fragment));
    world.appendChild(fragment);
    photoCount.textContent=photos.length;
    requestAnimationFrame(()=>{renderLayout();loading.classList.add("done");});
  }
  function position(mode,i,n) {
    const t=(i+.5)/n, angle=i*2.39996323;
    let x=0,y=0,z=0,s=1,rx=0,ry=0,opacity=1;
    if(mode==="cloud") {
      const radius=170+Math.pow(rnd(i+31),.65)*340;
      const v=1-2*t, horiz=Math.sqrt(Math.max(0,1-v*v));
      x=Math.cos(angle)*horiz*radius*1.35; y=v*radius*.94;z=Math.sin(angle)*horiz*radius*1.35;
      rx=(rnd(i+40)-.5)*18;ry=(rnd(i+65)-.5)*30;s=.47+rnd(i+22)*.28;
    } else if(mode==="orbit") {
      if(i>=Math.min(n,90))opacity=0;
      const total=Math.min(n,90),a=i/total*Math.PI*2;
      x=Math.cos(a)*345;y=Math.sin(a)*232;z=Math.sin(a*.98)*210;
      rx=Math.sin(a)*9;ry=-Math.cos(a)*15;s=.85;
    } else if(mode==="arc") {
      if(i>=Math.min(n,35))opacity=0;
      const total=Math.min(n,35),k=i-(total-1)/2;
      x=k*77;y=Math.pow(k/17,2)*59+Math.sin(i*.6)*15;z=-Math.pow(k,2)*1.7;
      ry=-k*2.05;s=1.07;
    } else if(mode==="stack") {
      if(i>=Math.min(n,48))opacity=0;
      const total=Math.min(n,48),k=i-(total-1)/2;
      x=k*24;y=Math.sin(i*.4)*20;z=-Math.abs(k)*11;
      ry=-13+k*.65;s=1.05;
    } else {
      if(i>=Math.min(n,126))opacity=0;
      const col=i%14,row=Math.floor(i/14);
      x=(col-6.5)*82;y=(row-4)*117;z=0;rx=0;ry=0;s=.72;
    }
    return {x,y,z,s,rx,ry,opacity};
  }
  function renderLayout() {
    const n=state.cards.length;
    state.cards.forEach((el,i)=>{
      const a=position(state.mode,i,n);
      el.style.transform="translate3d("+a.x.toFixed(1)+"px,"+a.y.toFixed(1)+"px,"+a.z.toFixed(1)+"px) rotateX("+a.rx.toFixed(1)+"deg) rotateY("+a.ry.toFixed(1)+"deg) scale("+a.s.toFixed(3)+")";
      el.style.opacity=String(a.opacity);
      el.style.pointerEvents=a.opacity?"auto":"none";
      el.tabIndex=a.opacity?0:-1;
    });
    modeName.textContent=names[state.mode];
    updateCamera();
  }
  function updateCamera(){
    // Collapse bursts of pointer/wheel events into one compositor transform per frame.
    if(cameraFrame)return;
    cameraFrame=requestAnimationFrame(()=>{
      cameraFrame=0;
      const viewportFactor=clamp((scene.clientWidth||900)/950,.52,1.22);
      const fac=state.zoom*viewportFactor;
      world.style.transform="rotateX("+state.pitch.toFixed(2)+"deg) rotateY("+state.yaw.toFixed(2)+"deg) scale("+fac.toFixed(3)+")";
    });
  }
  function setMode(mode) {
    if(!names[mode])return;
    const animate=hasShownFirstLayout&&!reduceMotion&&state.mode!==mode;
    clearTimeout(layoutTimeout);
    scene.classList.toggle("layout-changing",animate);
    state.mode=mode;state.yaw=mode==="cloud"?-11:0;state.pitch=mode==="orbit"?9:0;state.zoom=mode==="cloud"?.83:1;
    document.querySelectorAll(".mode").forEach(el=>{
      const active=el.dataset.mode===mode;el.classList.toggle("active",active);el.setAttribute("aria-pressed",String(active));
    });
    state.lastInteraction=Date.now();
    renderLayout();
    hasShownFirstLayout=true;
    if(animate)layoutTimeout=setTimeout(()=>scene.classList.remove("layout-changing"),710);
    hint.textContent=mode==="cloud"?"拖动旋转 · 滚轮缩放 · 点击照片查看":"拖动探索 · 点击照片查看 · 可随时切换布局";
  }
  const modeButtons=document.querySelectorAll(".mode");
  modeButtons.forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
  document.getElementById("zoom-in").addEventListener("click",()=>{state.zoom=clamp(state.zoom*1.17,.36,2.7);updateCamera();});
  document.getElementById("zoom-out").addEventListener("click",()=>{state.zoom=clamp(state.zoom/1.17,.36,2.7);updateCamera();});
  document.getElementById("reset-view").addEventListener("click",()=>setMode(state.mode));
  document.getElementById("quality-toggle").addEventListener("click",e=>{
    renderBudget=renderBudget===MAX_VISIBLE_CARDS?LOW_VISIBLE_CARDS:MAX_VISIBLE_CARDS;
    const low=renderBudget===LOW_VISIBLE_CARDS;
    e.currentTarget.textContent=low?"标准模式":"轻量模式";
    e.currentTarget.setAttribute("aria-pressed",String(low));
    scene.classList.remove("layout-changing");
    initializePhotos(state.photos);
    hint.textContent=low?"轻量模式 · 最多展示 60 张 · 点击可切回标准模式":"标准模式 · 最多展示 110 张";
  });
  scene.addEventListener("wheel",e=>{e.preventDefault();state.zoom=clamp(state.zoom*Math.exp(-e.deltaY*.0012),.36,2.7);state.lastInteraction=Date.now();updateCamera();},{passive:false});
  scene.addEventListener("pointerdown",e=>{
    if(e.button!==0)return;
    state.drag=true;state.moved=false;state.startX=e.clientX;state.startY=e.clientY;state.lastX=e.clientX;state.lastY=e.clientY;
    // Capture only once a drag is confirmed; normal clicks must reach photo cards.
  });
  scene.addEventListener("pointermove",e=>{
    if(!state.drag)return;
    const dx=e.clientX-state.lastX,dy=e.clientY-state.lastY;
    if(Math.hypot(e.clientX-state.startX,e.clientY-state.startY)>5)state.moved=true;
    if(state.moved){if(!scene.hasPointerCapture(e.pointerId))scene.setPointerCapture(e.pointerId);state.yaw+=dx*.18;state.pitch=clamp(state.pitch-dy*.15,-67,67);updateCamera();}
    state.lastX=e.clientX;state.lastY=e.clientY;state.lastInteraction=Date.now();
  });
  function endDrag(){state.drag=false;setTimeout(()=>{state.moved=false;},60);}
  scene.addEventListener("pointerup",endDrag);
  scene.addEventListener("pointercancel",endDrag);
  function openViewer(i){
    state.index=i;const photo=state.photos[i];if(!photo)return;
    viewerPhoto.src=photo.full||photo.thumb;viewerPhoto.alt=photo.name;
    viewerCaption.textContent=photo.name+"  ·  "+(i+1)+" / "+state.photos.length;
    viewer.hidden=false;document.body.style.overflow="hidden";
    document.getElementById("viewer-close").focus();
  }
  function closeViewer(){viewer.hidden=true;document.body.style.overflow="";}
  function stepViewer(step){openViewer((state.index+step+state.photos.length)%state.photos.length);}
  document.getElementById("viewer-close").addEventListener("click",closeViewer);
  document.getElementById("viewer-prev").addEventListener("click",()=>stepViewer(-1));
  document.getElementById("viewer-next").addEventListener("click",()=>stepViewer(1));
  viewer.addEventListener("click",e=>{if(e.target===viewer)closeViewer();});
  window.addEventListener("keydown",e=>{
    if(!viewer.hidden){
      if(e.key==="Escape")closeViewer();
      if(e.key==="ArrowRight")stepViewer(1);
      if(e.key==="ArrowLeft")stepViewer(-1);
      return;
    }
    if(e.key==="ArrowRight"){state.yaw+=7;updateCamera();}
    if(e.key==="ArrowLeft"){state.yaw-=7;updateCamera();}
    if(e.key==="ArrowUp"){state.pitch=clamp(state.pitch+7,-67,67);updateCamera();}
    if(e.key==="ArrowDown"){state.pitch=clamp(state.pitch-7,-67,67);updateCamera();}
    if(e.key==="Home"){setMode(state.mode);}
  });
  function thumbnail(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const im=new Image();
      im.onload=()=>{
        try{
          const f=Math.min(1,400/Math.max(im.naturalWidth,im.naturalHeight));
          const c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.naturalWidth*f));c.height=Math.max(1,Math.round(im.naturalHeight*f));
          c.getContext("2d").drawImage(im,0,0,c.width,c.height);
          const thumb=c.toDataURL("image/jpeg",.78);
          resolve({name:file.name,thumb,full:url,landscape:im.naturalWidth>=im.naturalHeight});
        }catch(e){URL.revokeObjectURL(url);reject(e);}
      };
      im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("无法读取 "+file.name));};
      im.src=url;
    });
  }
  async function importFiles(files){
    const chosen=Array.from(files).filter(f=>f.type.startsWith("image/")).slice(0,250);
    if(!chosen.length){alert("请选择图片文件（JPG、PNG、WebP 等）。");return;}
    hint.textContent="正在生成浏览用缩略图…";
    const results=await Promise.allSettled(chosen.slice(0,MAX_VISIBLE_CARDS).map(thumbnail));
    const visible=results.filter(r=>r.status==="fulfilled").map(r=>r.value);
    if(!visible.length){alert("照片无法读取，请改用 JPG、PNG 或 WebP。");return;}
    // Files outside the rendering budget stay available when browsing full-screen.
    const remaining=chosen.slice(MAX_VISIBLE_CARDS).map(file=>({
      name:file.name,thumb:"",full:URL.createObjectURL(file),landscape:false
    }));
    discardOwned();
    const photos=[...visible,...remaining];
    state.ownedUrls=photos.map(p=>p.full);
    initializePhotos(photos);setMode("cloud");
    hint.textContent="已载入 "+photos.length+" 张 · 空间展示前 "+Math.min(photos.length,MAX_VISIBLE_CARDS)+" 张 · 大图可浏览全部";
  }
  input.addEventListener("change",e=>{importFiles(e.target.files);input.value="";});
  let dragDepth=0;
  window.addEventListener("dragenter",e=>{if(!e.dataTransfer?.types.includes("Files"))return;e.preventDefault();dragDepth++;dropZone.hidden=false;});
  window.addEventListener("dragover",e=>{if(e.dataTransfer?.types.includes("Files"))e.preventDefault();});
  window.addEventListener("dragleave",e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)dropZone.hidden=true;});
  window.addEventListener("drop",e=>{e.preventDefault();dragDepth=0;dropZone.hidden=true;if(e.dataTransfer?.files.length)importFiles(e.dataTransfer.files);});
  window.addEventListener("resize",updateCamera);
  document.addEventListener("visibilitychange",()=>{state.lastInteraction=Date.now();});
  // Deliberately no idle auto-rotation: it continuously re-rastered dozens of
  // CSS 3D elements and was the main source of idle CPU/GPU usage.
  initializePhotos(createSamples());
  setMode("cloud");
})();
