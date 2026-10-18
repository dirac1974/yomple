import json, subprocess, sys, re, io, wave
sys.path.insert(0,'../pyshim')
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
m=Model('vosk-model-en-us-0.22-lgraph')
T=json.load(open('out/rea/timing.json')); W=T['words']; L=T['lanterns']
bad=0
for g,a in L.items():
    raw=subprocess.check_output(['ffmpeg','-loglevel','quiet','-i',f'out/rea/{g}.mp3','-ar','16000','-ac','1','-f','s16le','-'])
    r=KaldiRecognizer(m,16000); r.SetWords(True)
    for k in range(0,len(raw),8000): r.AcceptWaveform(raw[k:k+8000])
    got=json.loads(r.FinalResult()).get('text','').split()
    exp=[re.sub(r"[^a-z']","",w['w'].lower().replace('battle-field','battlefield')) for w in W[a['w0']:a['w1']+1]]
    exp=[e for e in exp if e]
    ok_first = bool(got) and got[0]==exp[0]; ok_last = bool(got) and got[-1]==exp[-1]
    flag='' if ok_first and ok_last else '  <-- CHECK'
    if flag: bad+=1
    print(f"{g:4} {a['e']-a['s']:5.2f}s first {exp[0]}/{got[0] if got else '-'}  last {exp[-1]}/{got[-1] if got else '-'}{flag}")
print('flags', bad)
