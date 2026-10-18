import json, re, subprocess, os
W=json.load(open('rea_words.json'))['words']
L=[("g1","Four score and seven years ago our fathers brought forth on this continent, a new nation,"),
("g2","conceived in Liberty, and dedicated to the proposition that all men are created equal."),
("g3","Now we are engaged in a great civil war, testing whether that nation,"),
("g4","or any nation so conceived and so dedicated, can long endure."),
("g5","We are met on a great battle-field of that war."),
("g6","We have come to dedicate a portion of that field, as a final resting place"),
("g7","for those who here gave their lives that that nation might live."),
("g8","It is altogether fitting and proper that we should do this."),
("g9","But, in a larger sense, we can not dedicate—we can not consecrate—we can not hallow—this ground."),
("g10","The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract."),
("g11","The world will little note, nor long remember what we say here, but it can never forget what they did here."),
("g12","It is for us the living, rather, to be dedicated here to the unfinished work"),
("g13","which they who fought here have thus far so nobly advanced."),
("g14","It is rather for us to be here dedicated to the great task remaining before us—"),
("g15","that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—"),
("g16","that we here highly resolve that these dead shall not have died in vain—"),
("g17","that this nation, under God, shall have a new birth of freedom—"),
("g18","and that government of the people, by the people, for the people, shall not perish from the earth.")]
i=0; lan={}
for gid,t in L:
    n=len([x for x in re.split(r"[\s—]+",t) if x])
    assert all(W[i+k]['w'].strip('.,—') .lower().startswith(re.split(r"[\s—]+",t)[k].strip('.,—').lower()[:3]) for k in range(n)), gid
    lan[gid]={'w0':i,'w1':i+n-1}; i+=n
assert i==len(W), (i,len(W))
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','rea.mp3']).decode())
ids=[g for g,_ in L]
gaps=[]
for k,g in enumerate(ids):
    a=lan[g]; ws=W[a['w0']]['s']; we=W[a['w1']]['e']
    prev_e = W[a['w0']-1]['e'] if a['w0']>0 else 0.0
    next_s = W[a['w1']+1]['s'] if a['w1']+1<len(W) else dur
    s=max(prev_e+0.02, ws-0.15) if a['w0']>0 else max(0, ws-0.15)
    e=min(next_s-0.02, we+0.30)
    lan[g].update({'s':round(s,3),'e':round(e,3)})
    gaps.append((g, round(next_s-we,2)))
print('gaps after each lantern (s):', gaps)
os.makedirs('out/rea',exist_ok=True)
for g in ids:
    a=lan[g]; d=a['e']-a['s']
    subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(a['s']),'-t',str(d),'-i','rea.mp3','-af',f'afade=t=in:d=0.015,afade=t=out:st={max(0,d-0.04)}:d=0.04','-ac','1','-b:a','96k',f'out/rea/{g}.mp3'],check=True)
subprocess.run(['ffmpeg','-loglevel','error','-y','-i','rea.mp3','-ac','1','-b:a','96k','out/rea/full.mp3'],check=True)
words=[{'i':w['i'],'w':w['w'],'s':w['s'],'e':w['e']} for w in W]
json.dump({'v':1,'voice':'rea','label':'Britton Rea (public-domain reading)','duration':round(dur,3),'words':words,'lanterns':lan},open('out/rea/timing.json','w'))
print('ok', len(ids), 'clips;', sum(os.path.getsize('out/rea/'+f) for f in os.listdir('out/rea'))//1024, 'KB')
