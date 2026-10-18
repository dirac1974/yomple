import json, wave, re, sys, difflib
sys.path.insert(0,'../pyshim')
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
TEXT="""Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this. But, in a larger sense, we can not dedicate—we can not consecrate—we can not hallow—this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom—and that government of the people, by the people, for the people, shall not perish from the earth."""
toks=[t for t in re.split(r"[\s—]+", TEXT) if t]
def norm(t):
    t=t.lower().replace('battle-field','battlefield')
    return re.sub(r"[^a-z']","",t)
canon=[norm(t) for t in toks]
vocab=sorted(set(canon))+["[unk]"]
m=Model('vosk-model-en-us-0.22-lgraph')
wf=wave.open('rea16.wav','rb')
rec=KaldiRecognizer(m, wf.getframerate(), json.dumps(vocab)); rec.SetWords(True)
out=[]
while True:
    d=wf.readframes(4000)
    if not d: break
    if rec.AcceptWaveform(d): out+=json.loads(rec.Result()).get('result',[])
out+=json.loads(rec.FinalResult()).get('result',[])
heard=[w['word'] for w in out]
sm=difflib.SequenceMatcher(a=canon,b=heard,autojunk=False)
times=[None]*len(canon)
for tag,i1,i2,j1,j2 in sm.get_opcodes():
    if tag=='equal' or (tag=='replace' and i2-i1==j2-j1):
        for k in range(i2-i1): times[i1+k]=(out[j1+k]['start'],out[j1+k]['end'],out[j1+k].get('conf',0))
missing=[i for i,t in enumerate(times) if t is None]
# interpolate missing
for i in missing:
    prev=next((times[j] for j in range(i-1,-1,-1) if times[j]),None)
    nxt=next((times[j] for j in range(i+1,len(times)) if times[j]),None)
    s=prev[1] if prev else 0.0; e=nxt[0] if nxt else s+0.3
    times[i]=(s,e,0.0)
words=[{'i':i,'w':toks[i],'s':round(t[0],3),'e':round(t[1],3),'c':round(t[2],2)} for i,t in enumerate(times)]
json.dump({'words':words,'missing':missing,'heard':len(heard),'canon':len(canon)},open('rea_words.json','w'),indent=0)
print('canon',len(canon),'heard',len(heard),'missing',len(missing),[toks[i] for i in missing][:20])
low=[(w['w'],w['c']) for w in words if w['c']<0.6]
print('lowconf',len(low),low[:15])
