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

const flagArt=[
    '..yy............................',
    '.yyyy...........................',
    '.yyyy...........................',
    '..dgddddddddddddddddddddddddd...',
    '..dgdrrrrrrrrrrrrrrrrrrrrrrrd...',
    '..dgdrrrrrrrrrrrrrrrrrrrrrrrd...',
    '..dgdrrrrwwwrrwrrwwwrwwwrrrrd...',
    '..dgdrrrrwrrrwrwrwrrrwrrrrrrd...',
    '..dgdrrrrwwwrwwwrwwrrwwrrrrrd...',
    '..dgdrrrrrrwrwrwrwrrrwrrrrrr....',
    '..dgdrrrrwwwrwrwrwrrrwwwrrrr....',
    '..dgdrrrrrrrrrrrrrrrrrrrrrrd....',
    '..dgdrrwrwrrwrrwrwrwwwrwwwrr....',
    '..dgdrrwrwrwrwrwrwrwrrrwrwrr....',
    '..dgdrrwwwrwwwrwrwrwwrrwrwrrd...',
    '..dgdrrwrwrwrwrwrwrwrrrwrwrrd...',
    '..dgdrrwrwrwrwrrwrrwwwrwrwrrd...',
    '..dgdrrrrrrrrrrrrrrrrrrrrrrrd...',
    '..dgdsssssssssssssssssssssssd...',
    '..dgddddddddddddddddddddddddd...',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    '..dg............................',
    'ddddddd.........................',
    'bbbbbbb.........................'
];
const flagCol={d:'#14142a',g:'#9aa0b4',y:'#ffd23f',r:'#eb2a3f',s:'#b4192d',w:'#fffffe',b:'#4c3533'};
const flagImg=document.createElement('canvas');
flagImg.width=32;
flagImg.height=32;
const fg=flagImg.getContext('2d');
flagArt.forEach((row,y)=>{
    for(let x=0;x<32;x++){
        if(row[x]!=='.'){
            fg.fillStyle=flagCol[row[x]];
            fg.fillRect(x,y,1,1);
        }
    }
});

let ac=null;
let muted=false;
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
    warn(){
        tone(800,500,0.1,'square',0.04);
    },
    rumble(){
        tone(70,40,0.25,'sawtooth',0.1);
    },
    crash(){
        tone(160,30,0.9,'sawtooth',0.14);
        tone(90,20,1.1,'square',0.1);
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
const QUAKE=15;

const warnBox=document.querySelector('.warn');
const warnTitle=document.querySelector('.w1');
const warnText=document.querySelector('.w2');
const overStat=document.querySelector('.o-stat');
const p={x:0,y:0,vy:0,w:48,h:48,on:false,sq:0,rot:0,face:1,spin:0,target:0};
const clouds=[
    {n:'cloud1',x:100,y:50,s:12},
    {n:'cloud2',x:500,y:90,s:8},
    {n:'cloud3',x:800,y:30,s:15}
];

let lvl=0,start,plats,bars,spikes,tramps,goal,tops,coins,score,won;
let safe,qt,ct,crashed,over,debris,lastSec,rumbleT;

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
    over=false;
    document.body.classList.remove('dead');
    crashed=false;
    qt=0;
    ct=0;
    lastSec=QUAKE;
    rumbleT=0;
    debris=[];
    safe=plats.find(r=>r.y===goal.y+96&&goal.x+36>r.x&&goal.x<r.x+r.w)||plats[plats.length-1];
    reset();
}

function reset(){
    p.x=start.x;
    p.y=start.y;
    p.vy=0;
    p.rot=0;
    p.spin=0;
}

function die(){
    sfx.hurt();
    if(crashed){
        over=true;
        overStat.textContent='LEVEL '+(lvl+1)+'  SAVED '+score+'/'+coins.length;
        document.body.classList.add('dead');
        return;
    }
    reset();
}

function chunk(im,sx,sy,sw,sh,x,y,w,h,col){
    debris.push({
        x:x+w/2,y:y+h/2,
        vx:(Math.random()-0.5)*300,
        vy:-Math.random()*250,
        rot:0,
        vr:(Math.random()-0.5)*10,
        wait:Math.random()*0.4,
        w:w,h:h,im:im,sx:sx,sy:sy,sw:sw,sh:sh,col:col
    });
}

function crumble(){
    for(const r of plats){
        if(r===safe)continue;
        for(let x=r.x;x<r.x+r.w;x+=24){
            const w=Math.min(24,r.x+r.w-x);
            chunk(img.ground,((x-r.x)%96)/3,0,w/3,16,x,r.y,w,48);
            for(let y=r.y+48;y<540;y+=48){
                chunk(null,0,0,0,0,x,y,w,48,(x+y)%48===0?'#4c3533':'#3d2a28');
            }
        }
    }

    for(const b of bars){
        const iw=img.bar.width;
        for(let k=0;k<3;k++){
            chunk(img.bar,k*iw/3,0,iw/3,img.bar.height,b.x+k*25,b.y,25,24);
        }
    }

    for(const tp of tramps){
        const iw=img.trampoline.width;
        const ih=img.trampoline.height;
        for(let i=0;i<4;i++){
            for(let j=0;j<3;j++){
                chunk(img.trampoline,i*iw/4,j*ih/3,iw/4,ih/3,tp.x+i*36,tp.y+j*32,36,32);
            }
        }
    }

    for(const c of coins){
        if(!c.got){
            chunk(img.coin,0,0,32,21,c.x-32,c.y-21,64,42);
        }
    }

    plats=[safe];
    bars=[];
    tramps=[];
    tops=[safe];
}

function quakeStep(dt){
    if(!document.body.classList.contains('play'))return;

    if(crashed){
        ct+=dt;
    }else{
        qt+=dt;

        const left=Math.ceil(QUAKE-qt);
        if(left!==lastSec){
            lastSec=left;
            if(left>0)sfx.warn();
        }

        if(qt>=QUAKE){
            crashed=true;
            ct=0;
            crumble();
            sfx.crash();
        }else if(qt>=QUAKE-7){
            rumbleT-=dt;
            if(rumbleT<=0){
                rumbleT=0.25;
                sfx.rumble();
            }
        }
    }

    for(const d of debris){
        if(!crashed||d.wait>0){
            d.wait-=dt;
            continue;
        }
        d.vy+=1400*dt;
        d.x+=d.vx*dt;
        d.y+=d.vy*dt;
        d.rot+=d.vr*dt;
    }
    debris=debris.filter(d=>d.y<760);
}

newGame(0);

function update(dt){
    const dir=((keys.ArrowRight||keys.KeyD)?1:0)-((keys.ArrowLeft||keys.KeyA)?1:0);
    p.x=Math.max(0,Math.min(912,p.x+dir*SPEED*dt));

    if(dir)p.face=dir;

    if(p.spin){
        p.rot+=p.spin*dt;
        if((p.spin>0&&p.rot>=p.target)||(p.spin<0&&p.rot<=p.target)){
            p.rot=p.target;
            p.spin=0;
        }
    }else if(dir&&p.on){
        p.rot+=dir*SPEED*dt/(p.w/2);
    }else if(!dir){
        const turn=Math.PI*2;
        const home=Math.round(p.rot/turn)*turn;
        p.rot+=(home-p.rot)*Math.min(1,12*dt);
    }

    if(dir){
        for(const r of plats){
            if(p.y+p.h>r.y+2&&p.x+p.w>r.x&&p.x<r.x+r.w){
                p.x=dir>0?r.x-p.w:r.x+r.w;
            }
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
            const air=2*Math.abs(p.vy)/GRAV;
            const turns=Math.max(1,Math.round(air/0.7));
            p.target=p.rot-p.face*Math.PI*2*turns;
            p.spin=-p.face*Math.PI*2*turns/air;
        }
    }

    if(p.on&&p.spin){
        p.rot=p.target;
        p.spin=0;
    }

    for(const s of spikes){
        if(!crashed&&p.x+8<s.x+36&&p.x+40>s.x+10&&p.y+8<s.y+38&&p.y+40>s.y+14){
            die();
        }
    }

    for(const c of coins){
        if(!c.got&&!crashed&&Math.hypot(p.x+24-c.x,p.y+24-c.y)<40){
            c.got=true;
            score++;
            sfx.coin();
        }
    }

    const goalHit=p.x+p.w>goal.x&&
        p.x<goal.x+36&&
        p.y+p.h>goal.y&&
        p.y<goal.y+96;

    if(goalHit){
        won=true;
        sfx.win();
        onWin(score);
    }

    if(p.y>700)die();
}

function draw(t){
    g.clearRect(0,0,960,540);

    let shake=0;
    if(crashed){
        shake=Math.max(0,1-ct/1.5)*12;
    }else if(qt>=QUAKE-7){
        shake=1+(qt-(QUAKE-7))/7*8;
    }

    g.save();
    g.translate(Math.round((Math.random()-0.5)*2*shake),Math.round((Math.random()-0.5)*2*shake));

    for(const c of clouds){
        c.x=(c.x+c.s/60)%1100;
        const im=img[c.n];
        g.drawImage(im,c.x-100,c.y,im.width*3,im.height*3);
    }

    for(const tp of tramps){
        g.drawImage(img.trampoline,tp.x,tp.y,144,96);
    }

    for(const r of plats){
        g.fillStyle='#4c3533';
        g.fillRect(r.x,r.y+48,r.w,540-r.y-48);

        for(let x=r.x;x<r.x+r.w;x+=96){
            const w=Math.min(96,r.x+r.w-x);
            g.drawImage(img.ground,0,0,w/3,16,x,r.y,w,48);
        }
    }

    for(const b of bars){
        g.drawImage(img.bar,b.x,b.y,75,24);
    }

    for(const d of debris){
        g.save();
        g.translate(d.x,d.y);
        g.rotate(d.rot);
        if(d.im){
            g.drawImage(d.im,d.sx,d.sy,d.sw,d.sh,-d.w/2,-d.h/2,d.w,d.h);
        }else{
            g.fillStyle=d.col;
            g.fillRect(-d.w/2,-d.h/2,d.w,d.h);
        }
        g.restore();
    }

    for(const s of spikes){
        if(crashed&&ct>2.5)continue;

        if(crashed){
            g.globalAlpha=1-ct/2.5;
        }
        g.drawImage(img.kanta,s.x,s.y,46,38);
        g.globalAlpha=1;

        if(crashed){
            for(let i=0;i<7;i++){
                const rise=(ct*70+i*17)%46;
                g.fillStyle=['#ffd23f','#ff8c1a','#eb2a3f'][i%3];
                g.fillRect(s.x+8+i*5+Math.sin(ct*12+i)*3,s.y+38-rise,8,8);
            }
        }
    }

    const f=Math.floor(t/100)%8;

    for(const c of coins){
        if(!c.got&&!crashed){
            g.drawImage(img.coin,f*32,0,32,21,c.x-32,c.y-21,64,42);
        }
    }

    g.drawImage(flagImg,goal.x-42,goal.y,96,96);

    const face=p.sq>0?img.ball_squash:p.on?img.ball_calm:p.vy>0?img.ball_fall:img.ball_up;
    g.save();
    g.translate(p.x+p.w/2,p.y+p.h/2);
    g.rotate(p.rot);
    g.drawImage(face,-p.w/2,-p.h/2,p.w,p.h);
    g.restore();

    g.textAlign='center';
    g.font='8px "Press Start 2P"';
    g.fillStyle='#10121c';
    g.fillText('JAIMIN',p.x+p.w/2,p.y-8);
    g.textAlign='left';

    g.restore();

    if(!crashed){
        let a=0;
        if(qt>=QUAKE-5){
            a=Math.sin(qt*28)>0?0.38:0.12;
        }else if(qt>=6){
            a=0.03+0.07*(0.5+0.5*Math.sin(qt*5));
        }
        g.fillStyle='rgba(255,120,0,'+a.toFixed(2)+')';
        g.fillRect(0,0,960,540);
    }else if(ct<1.5){
        g.fillStyle='rgba(255,120,0,'+(0.3*(1-ct/1.5)).toFixed(2)+')';
        g.fillRect(0,0,960,540);
    }

    g.font='16px "Press Start 2P"';
    g.fillStyle='#10121c';
    g.fillText('LEVEL '+(lvl+1)+'  SAVED '+score+'/'+coins.length,16,36);

    if(muted){
        g.fillText('MUTED',16,64);
    }

    warnBox.classList.toggle('on',!won&&!over);
    warnBox.classList.toggle('hot',!crashed&&qt>=QUAKE-5);
    warnTitle.textContent=crashed?'GET TO THE HAVEN!':'WARNING!';
    warnText.textContent=crashed?'':'EARTHQUAKE IN '+Math.ceil(QUAKE-qt)+' SEC';

    if(won){
        g.fillStyle='rgba(0,0,0,0.6)';
        g.fillRect(0,0,960,540);

        g.fillStyle='#fffffe';
        g.textAlign='center';
        g.font='32px "Press Start 2P"';
        g.fillText(lvl+1<levels.length?'YOU ESCAPED!':'HAVEN IS SAFE!',480,250);

        g.font='16px "Press Start 2P"';
        g.fillText('STUDENTS SAVED '+score+'/'+coins.length,480,300);
        g.fillText(lvl+1<levels.length?'N = NEXT   R = AGAIN   ESC = MENU':'R = AGAIN   ESC = MENU',480,340);

        g.textAlign='left';
    }
}

let last=0;

function loop(t){
    const dt=Math.min((t-last)/1000,0.05);
    last=t;

    p.sq=Math.max(0,p.sq-dt);

    if((won||over)&&keys.KeyR)newGame(lvl);
    if(won&&keys.KeyN&&lvl+1<levels.length)newGame(lvl+1);

    if(!won&&!over)update(dt);
    quakeStep(dt);

    draw(t);
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);