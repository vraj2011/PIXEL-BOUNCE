document.fonts.load('16px "Press Start 2P"');
document.fonts.load('32px "Press Start 2P"');

const g=document.getElementById('c').getContext('2d');
g.imageSmoothingEnabled=false;

const img={};
['ball_calm','ball_fall','ball_up','ball_squash','ground','bar','kanta','trampoline','coin','cloud1','cloud2','cloud3'].forEach(n=>{
    img[n]=new Image();
    img[n].onerror=()=>console.log('MISSING',img[n].src);
    img[n].src='art/'+n+'.png';
});

let ac=null;
let muted=false;

function tone(f1,f2,dur,type,vol){
    if(muted)return;
    if(!ac)ac=new AudioContext();
    if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator();
    const v=ac.createGain();
    o.type=type;
    o.frequency.setValueAtTime(f1,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(f2,ac.currentTime+dur);
    v.gain.setValueAtTime(vol,ac.currentTime);
    v.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
    o.connect(v);
    v.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime+dur);
}

const sfx={
    jump(){
        tone(300,600,0.12,'square',0.06);
    },
    bounce(){
        tone(150,700,0.25,'square',0.08);
    },
    coin(){
        tone(900,1400,0.1,'square',0.05);
        setTimeout(()=>tone(1400,1800,0.12,'square',0.05),80);
    },
    hurt(){
        tone(300,60,0.3,'sawtooth',0.08);
    },
    win(){
        [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,f,0.18,'square',0.06),i*130));
    }
};

const keys={};
addEventListener('keydown',e=>{
    keys[e.code]=true;
    if(e.code==='Space')e.preventDefault();
    if(e.code==='KeyM')muted=!muted;
});
addEventListener('keyup',e=>keys[e.code]=false);

const GRAV=1200,SPEED=250,JUMP=-450;
const p={x:0,y:0,vy:0,w:48,h:48,on:false,sq:0};
const clouds=[{n:'cloud1',x:100,y:50,s:12},{n:'cloud2',x:500,y:90,s:8},{n:'cloud3',x:800,y:30,s:15}];

const levels=[
    {
        name:'FALL UP',
        start:{x:100,y:240},
        plats:[{x:0,y:300,w:480},{x:720,y:150,w:288}],
        bars:[{x:300,y:230,w:75},{x:560,y:120,w:75}],
        spikes:[{x:330,y:262},{x:800,y:112}],
        tramps:[{x:528,y:444}],
        goal:{x:900,y:54},
        coins:[{x:337,y:206},{x:597,y:96},{x:823,y:75}]
    },
    {
        name:'NARROW ESCAPE',
        start:{x:60,y:252},
        plats:[{x:0,y:300,w:432},{x:672,y:120,w:336}],
        bars:[{x:180,y:225,w:75},{x:530,y:105,w:75}],
        spikes:[{x:250,y:262},{x:350,y:262},{x:800,y:82}],
        tramps:[{x:480,y:444}],
        goal:{x:900,y:24},
        coins:[{x:217,y:201},{x:567,y:81},{x:823,y:45}]
    }
];

let lvl=0,start,plats,bars,spikes,tramps,goal,tops,coins,score,won;

function newGame(n){
    lvl=n;
    const L=levels[n];
    start=L.start;
    plats=L.plats;
    bars=L.bars;
    spikes=L.spikes;
    tramps=L.tramps;
    goal=L.goal;
    tops=plats.concat(bars);
    coins=L.coins.map(c=>({...c,got:false}));
    score=0;
    won=false;
    reset();
}

function reset(){
    p.x=start.x;
    p.y=start.y;
    p.vy=0;
}

function die(){
    sfx.hurt();
    reset();
}

newGame(0);

function update(dt){
    const dir=((keys.ArrowRight||keys.KeyD)?1:0)-((keys.ArrowLeft||keys.KeyA)?1:0);
    p.x=Math.max(0,Math.min(912,p.x+dir*SPEED*dt));
    if(dir){
        for(const r of plats){
            if(p.y+p.h>r.y+2&&p.x+p.w>r.x&&p.x<r.x+r.w)p.x=dir>0?r.x-p.w:r.x+r.w;
        }
    }

    if((keys.Space||keys.KeyW||keys.ArrowUp)&&p.on){
        p.vy=JUMP;
        sfx.jump();
    }
    p.vy+=GRAV*dt;
    const prev=p.y+p.h;
    p.y+=p.vy*dt;
    const bot=p.y+p.h;

    p.on=false;
    for(const r of tops){
        if(p.vy>=0&&prev<=r.y&&bot>=r.y&&p.x+p.w>r.x&&p.x<r.x+r.w){
            p.y=r.y-p.h;
            p.vy=0;
            p.on=true;
        }
    }

    for(const tp of tramps){
        const my=tp.y+24;
        if(p.vy>0&&prev<=my&&bot>=my&&p.x+p.w>tp.x+24&&p.x<tp.x+117){
            p.vy=-Math.min(Math.max(p.vy*1.5,600),1100);
            p.sq=0.12;
            sfx.bounce();
        }
    }

    for(const s of spikes){
        if(p.x+8<s.x+36&&p.x+40>s.x+10&&p.y+8<s.y+38&&p.y+40>s.y+14)die();
    }
    for(const c of coins){
        if(!c.got&&Math.hypot(p.x+24-c.x,p.y+24-c.y)<40){
            c.got=true;
            score++;
            sfx.coin();
        }
    }
    if(p.x+p.w>890&&p.y+p.h>goal.y){
        won=true;
        sfx.win();
        onWin(score);
    }
    if(p.y>700)die();
}

function draw(t){
    g.clearRect(0,0,960,540);
    for(const c of clouds){
        c.x=(c.x+c.s/60)%1100;
        const im=img[c.n];
        g.drawImage(im,c.x-100,c.y,im.width*3,im.height*3);
    }
    for(const tp of tramps)g.drawImage(img.trampoline,tp.x,tp.y,144,96);
    for(const r of plats){
        g.fillStyle='#4c3533';
        g.fillRect(r.x,r.y+48,r.w,540-r.y-48);
        for(let x=r.x;x<r.x+r.w;x+=96)g.drawImage(img.ground,x,r.y,96,48);
    }
    for(const b of bars)g.drawImage(img.bar,b.x,b.y,75,24);
    for(const s of spikes)g.drawImage(img.kanta,s.x,s.y,46,38);
    const f=Math.floor(t/100)%8;
    for(const c of coins){
        if(!c.got)g.drawImage(img.coin,f*32,0,32,21,c.x-32,c.y-21,64,42);
    }
    g.fillStyle='#14142a';
    g.fillRect(goal.x,goal.y,6,96);
    g.fillStyle='#ffd23f';
    g.beginPath();
    g.moveTo(goal.x+6,goal.y);
    g.lineTo(goal.x+6,goal.y+28);
    g.lineTo(goal.x+36,goal.y+14);
    g.fill();

    const face=p.sq>0?img.ball_squash:p.on?img.ball_calm:p.vy>0?img.ball_fall:img.ball_up;
    g.drawImage(face,p.x,p.y,p.w,p.h);

    g.font='16px "Press Start 2P"';
    g.fillStyle='#10121c';
    g.fillText('COINS '+score+'/'+coins.length,16,36);
    if(muted)g.fillText('MUTED',16,64);
    if(won){
        g.fillStyle='rgba(0,0,0,0.6)';
        g.fillRect(0,0,960,540);
        g.fillStyle='#fffffe';
        g.textAlign='center';
        g.font='32px "Press Start 2P"';
        g.fillText('YOU BOUNCED BACK!',480,250);
        g.font='16px "Press Start 2P"';
        g.fillText('COINS '+score+'/'+coins.length,480,300);
        g.fillText(lvl+1<levels.length?'N = NEXT   R = AGAIN   ESC = MENU':'R = AGAIN   ESC = MENU',480,340);
        g.textAlign='left';
    }
}

const VOL=5;

function tone(f1,f2,dur,type,vol){
    if(muted)return;
    if(!ac)ac=new AudioContext();
    if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator();
    const v=ac.createGain();
    o.type=type;
    o.frequency.setValueAtTime(f1,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(f2,ac.currentTime+dur);
    v.gain.setValueAtTime(Math.min(vol*VOL,1),ac.currentTime);
    v.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
    o.connect(v);
    v.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime+dur);
}

let last=0;
function loop(t){
    const dt=Math.min((t-last)/1000,0.05);
    last=t;
    p.sq=Math.max(0,p.sq-dt);
    if(won&&keys.KeyR)newGame(lvl);
    if(won&&keys.KeyN&&lvl+1<levels.length)newGame(lvl+1);
    if(!won)update(dt);
    draw(t);
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);