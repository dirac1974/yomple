import json, wave, struct, subprocess, numpy as np
T=json.load(open('out/rea/timing.json')); W=T['words']; L=T['lanterns']; ids=list(L.keys())
wf=wave.open('rea16.wav'); sr=wf.getframerate(); x=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)
fr=int(0.01*sr); rms=np.sqrt(np.convolve(x**2,np.ones(fr)/fr,mode='same'))
def quietest(a,b):
    a=max(0,int(a*sr)); b=min(len(x)-1,int(b*sr))
    if b<=a: return a/sr
    k=a+int(np.argmin(rms[a:b])); return k/sr
report=[]
for n in range(len(ids)-1):
    g,h=ids[n],ids[n+1]
    we=W[L[g]['w1']]['e']; ns=W[L[h]['w0']]['s']
    lo,hi=(we-0.08, ns+0.08) if ns-we<0.12 else (we, ns)
    c=quietest(lo,hi)
    if ns-we>=0.12:
        L[g]['e']=round(min(c+0.06, ns-0.01),3); L[h]['s']=round(max(c-0.06, we+0.01),3)
    else:
        L[g]['e']=round(c,3); L[h]['s']=round(c,3)
    report.append((g, round(ns-we,2), round(c,2), round(float(rms[int(c*sr)]),0)))
print(report)
for g in ids:
    a=L[g]; d=a['e']-a['s']
    subprocess.run(['ffmpeg','-loglevel','quiet','-y','-ss',str(a['s']),'-t',str(round(d,3)),'-i','rea.mp3','-af',f'afade=t=in:d=0.012,afade=t=out:st={max(0,d-0.03):.3f}:d=0.03','-ac','1','-b:a','96k',f'out/rea/{g}.mp3'],check=True)
json.dump(T,open('out/rea/timing.json','w'))
print('median rms', float(np.median(rms)))
