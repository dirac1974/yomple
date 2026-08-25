var YOMPLE_MODULE="field",YOMPLE_TABLE="field_players",YOMPLE_STORE="quiet-field-v1";
function slugName(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,18)||"player";}
var SISTER_KEYS=["presidents-palace-v2","bloom.v1","word-garden-v1","star-map-v1","quiet-field-v1"];
var AVATARS=["\ud83e\ude94","\ud83c\udf3e","\ud83e\udd85","\u2b50","\ud83d\udcd8","\ud83c\udf33","\ud83d\udd6f\ufe0f","\ud83d\uddfd"];
var store={profiles:[],activeId:null,familyCode:"",parentEmail:"",progress:{},fun:{},lastFirst:false};
var currentPhrase=null;
function loadStore(){
  try{store=Object.assign(store,JSON.parse(localStorage.getItem(YOMPLE_STORE)||"{}"));}catch(e){}
  if(!store.profiles)store.profiles=[];
  if(!store.progress)store.progress={};
  if(!store.fun)store.fun={};
  if(!store.familyCode){
    for(var i=0;i<SISTER_KEYS.length;i++){
      try{var sib=JSON.parse(localStorage.getItem(SISTER_KEYS[i])||"null");if(sib&&sib.familyCode){store.familyCode=sib.familyCode;break;}}catch(e){}
    }
  }
}
function saveStore(){localStorage.setItem(YOMPLE_STORE,JSON.stringify(store));}
function toast(msg){var el=document.getElementById("toast");if(!el)return;el.textContent=msg;el.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove("show");},2200);}
function getActiveProfile(){return (store.profiles||[]).find(function(p){return p.id===store.activeId;})||null;}
function pid(){return store.activeId;}
function migrateFlatProgress(all){
  if(!all||all.gettysburg)return;
  var has=false;Object.keys(all).forEach(function(k){if(/^p\d+$/.test(k)&&all[k]&&typeof all[k].state==="number")has=true;});
  if(!has)return;all.gettysburg={};Object.keys(all).forEach(function(k){if(/^p\d+$/.test(k)){all.gettysburg[k]=all[k];delete all[k];}});
}
function getProg(){if(!pid())return{};if(!store.progress[pid()])store.progress[pid()]={};migrateFlatProgress(store.progress[pid()]);return store.progress[pid()];}
function getFun(){if(!pid())return{stars:0,mute:false,questDay:"",questN:0,topic:"gettysburg"};if(!store.fun[pid()])store.fun[pid()]={stars:0,mute:false,questDay:"",questN:0,topic:"gettysburg"};if(!store.fun[pid()].topic)store.fun[pid()].topic="gettysburg";return store.fun[pid()];}
function topicId(){return getFun().topic||"gettysburg";}
function getTopicProg(){var all=getProg();if(!all[topicId()]||typeof all[topicId()]!=="object"||all[topicId()].state!==undefined)all[topicId()]={};return all[topicId()];}
function itemState(id){return getTopicProg()[id]||{state:0,consec:0,introduced:false,last:0};}
function setItem(id,patch){getTopicProg()[id]=Object.assign({},itemState(id),patch,{last:Date.now()});saveStore();}
function showScreen(id){
  document.querySelectorAll(".screen").forEach(function(s){s.classList.remove("on");});
  var el=document.getElementById(id);if(el)el.classList.add("on");
  var nav=document.getElementById("main-nav");
  var kid=id==="screen-home"||id==="screen-path"||id==="screen-look"||id==="screen-echo"||id==="screen-walk"||id==="screen-mix";
  if(nav)nav.style.display=kid?"flex":"none";
}
function applyLincolnArt(){
  var fieldUrl=(typeof LINCOLN_FIELD==="string"&&LINCOLN_FIELD)?LINCOLN_FIELD:"lincoln-field.svg";
  document.body.style.backgroundImage='linear-gradient(180deg,rgba(20,24,36,.28),rgba(20,24,36,.55)), url("'+fieldUrl+'")';
  document.body.style.backgroundSize="cover";
  document.body.style.backgroundPosition="center top";
  var mark=document.getElementById("field-mark");
  if(mark)mark.src=(typeof LINCOLN_MARK==="string"&&LINCOLN_MARK)?LINCOLN_MARK:"lincoln-mark.svg";
}
function showProfiles(){stopListen();stopSpeak();showScreen("screen-profiles");
  var grid=document.getElementById("profile-grid");if(!grid)return;grid.innerHTML="";
  (store.profiles||[]).forEach(function(p){var d=document.createElement("div");d.className="face";d.innerHTML="<span class='av'>"+(p.avatar||"\ud83e\ude94")+"</span>"+escapeHtml(p.name);d.onclick=function(){pickPlayer(p);};grid.appendChild(d);});
}
function pickPlayer(p){if(p.pin){var pin=window.prompt("PIN for "+p.name);if(pin!==p.pin){toast("PIN did not match");return;}}store.activeId=p.id;saveStore();showHome();}
function showCreateProfile(){showScreen("screen-create");var box=document.getElementById("avatar-choices");box.innerHTML="";box.dataset.selected=AVATARS[0];
  AVATARS.forEach(function(a,i){var s=document.createElement("span");s.textContent=a;if(i===0)s.className="on";s.onclick=function(){box.dataset.selected=a;box.querySelectorAll("span").forEach(function(x){x.className="";});s.className="on";};box.appendChild(s);});
}
function createProfile(){
  var name=document.getElementById("new-name").value.trim()||"Field walker";
  var avatar=document.getElementById("avatar-choices").dataset.selected||"\ud83e\ude94";
  var pin=(document.getElementById("new-pin")&&document.getElementById("new-pin").value.trim())||"";
  var username=slugName(name);var id="u-"+username;
  if((store.profiles||[]).some(function(p){return p.username===username;})){toast("That name is already here.");return;}
  function finish(family){if(family)store.familyCode=family;store.profiles.push({id:id,name:name,avatar:avatar,username:username,pin:pin,created:Date.now()});store.activeId=id;store.progress[id]={};store.fun[id]={stars:0,mute:false,questDay:"",questN:0,topic:"gettysburg"};seedIntroduced();if(typeof ensureFamily==="function")ensureFamily();saveStore();toast("Welcome, "+name);setTimeout(showHome,300);}
  if(typeof findAnyYomplePerson==="function"){findAnyYomplePerson(username).then(function(hit){if(hit&&hit.table===YOMPLE_TABLE){toast("That name is already saved. Use Find.");return;}if(hit&&hit.row){store.familyCode=hit.row.family_code||store.familyCode;finish(hit.row.family_code);return;}finish();});}else finish();
}
function seedIntroduced(){var topic=currentTopic();var order=(store.lastFirst&&topic.lastFirstOk)?topic.introLastFirst:topic.introDefault;var prog=getTopicProg();var n=0;order.forEach(function(id){if(n>=3)return;if(!prog[id]){prog[id]={state:0,consec:0,introduced:true,last:0};n++;}});}
function showHome(){stopListen();stopSpeak();if(!getActiveProfile()){showProfiles();return;}showScreen("screen-home");applyLincolnArt();
  var p=getActiveProfile();document.getElementById("current-kid-badge").innerHTML=(p.avatar||"\ud83e\ude94")+" "+escapeHtml(p.name);
  document.getElementById("star-count").textContent=getFun().stars||0;renderSoundChip();paintWorld();
}
function openTopic(id){getFun().topic=id;saveStore();seedIntroduced();showPath();}
function showPath(){stopListen();stopSpeak();if(!getActiveProfile()){showProfiles();return;}showScreen("screen-path");
  var p=getActiveProfile(),topic=currentTopic();
  document.getElementById("path-title").textContent=topic.title;
  document.getElementById("path-sub").textContent=topic.kicker;
  document.getElementById("path-kid-badge").innerHTML=(p.avatar||"\ud83e\ude94")+" "+escapeHtml(p.name);
  document.getElementById("path-star-count").textContent=getFun().stars||0;
  renderSoundChip();renderField();paintNext();paintQuest();
}
function paintWorld(){var box=document.getElementById("topic-grid");if(!box)return;box.innerHTML="";var all=getProg();
  TOPICS.forEach(function(t){var bag=all[t.id]||{},shine=0;t.phrases.forEach(function(ph){if(bag[ph.id]&&bag[ph.id].state===3)shine++;});
    var card=document.createElement("button");card.className="topic-card";card.onclick=function(){openTopic(t.id);};
    card.innerHTML="<div class='kicker'>"+escapeHtml(t.kicker)+"</div><h2>"+escapeHtml(t.title)+"</h2><p>"+escapeHtml(t.blurb)+"</p><div class='topic-pips'>"+t.phrases.length+" lanterns \u00b7 "+shine+" shining</div>";
    box.appendChild(card);});
}
function renderSoundChip(){var icon=getFun().mute?"\ud83d\udd07":"\ud83d\udd0a";["sound-chip","path-sound-chip"].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=icon;});}
function toggleSound(){var f=getFun();f.mute=!f.mute;saveStore();renderSoundChip();if(f.mute)stopSpeak();}
function renderField(){var box=document.getElementById("field");if(!box)return;box.innerHTML="";var shining=0;
  currentPhrases().forEach(function(ph){var st=itemState(ph.id);var d=document.createElement("div");var cls="lantern";
    if(!st.introduced&&st.state===0)cls+=" new";if(st.state===1)cls+=" s1";if(st.state===2)cls+=" s2";if(st.state===3){cls+=" s3";shining++;}
    d.className=cls;d.innerHTML="<div class='pic'>"+ph.pic+"</div><div class='no'>"+ph.n+"</div>";
    d.onclick=function(){if(!st.introduced&&st.state===0){toast("That lantern is still ahead.");return;}startLook(ph.id,true);};box.appendChild(d);});
  var mon=document.getElementById("monument");var n=currentPhrases().length;
  if(mon)mon.textContent=shining>=Math.max(n-2,3)?"The little monument is shining.":n+" lanterns on this path.";
}
function cookingIds(){return currentPhrases().map(function(ph){return ph.id;}).filter(function(id){var st=itemState(id);return st.introduced||st.state>0;});}
function nextNewId(){var topic=currentTopic();var pref=topic.introDefault.slice();topic.phrases.forEach(function(p){if(pref.indexOf(p.id)<0)pref.push(p.id);});
  for(var i=0;i<pref.length;i++){var st=itemState(pref[i]);if(!st.introduced&&st.state===0)return pref[i];}return null;}
function pickDue(){var now=Date.now();var due=cookingIds().filter(function(id){var st=itemState(id);if(st.state>=3)return(now-(st.last||0))>1000*60*60*20;if(st.state===2)return(now-(st.last||0))>1000*60*30;return true;});
  if(!due.length)due=cookingIds();due.sort(function(a,b){return(itemState(a).last||0)-(itemState(b).last||0);});return due[0]||nextNewId();}
function paintNext(){var why=document.getElementById("next-why"),btn=document.getElementById("next-btn");if(!why||!btn)return;
  var cooking=cookingIds();var fresh=cooking.filter(function(id){return itemState(id).state===0&&itemState(id).introduced;});
  if(fresh.length){why.textContent="Look at this lantern. Hear it. Then hide the words.";btn.textContent="Look";btn.onclick=function(){startLook(fresh[0],false);};return;}
  if(cooking.length<3&&nextNewId()){why.textContent="A new lantern is ready on the path.";btn.textContent="Light the next lantern";btn.onclick=function(){startLook(nextNewId(),false);};return;}
  var due=pickDue();if(due){why.textContent="Hide the words and say this lantern.";btn.textContent="Echo";btn.onclick=function(){startEcho(due);};return;}
  why.textContent="Walk this path in order.";btn.textContent="Walk";btn.onclick=startWalk;
}
function paintQuest(){var el=document.getElementById("daily-quest");if(!el)return;var f=getFun();var day=new Date().toISOString().slice(0,10);if(f.questDay!==day){f.questDay=day;f.questN=0;saveStore();}el.textContent="Today: light "+Math.min(f.questN,3)+" of 3 lanterns.";}
function startLook(id,review){currentPhrase=phraseById(id);if(!currentPhrase)return;var st=itemState(id);if(!st.introduced)setItem(id,{introduced:true,state:Math.max(st.state,0)});showScreen("screen-look");
  document.getElementById("look-card").innerHTML="<div class='kicker'>"+escapeHtml(currentTopic().short)+" \u00b7 lantern "+currentPhrase.n+"</div><div class='pic-hero'>"+currentPhrase.pic+"</div><p class='scene'>"+currentPhrase.scene+"</p><p class='phrase'>"+escapeHtml(currentPhrase.text)+"</p><p class='why'><strong>Why this line.</strong> "+currentPhrase.why+"</p><p class='gesture'><strong>A small gesture.</strong> "+currentPhrase.gesture+"</p>";
  document.getElementById("btn-hear").onclick=function(){speakText(currentPhrase.text);};
  document.getElementById("btn-got-it").onclick=function(){if(itemState(id).state===0)setItem(id,{state:1,consec:0,introduced:true});startEcho(id);};
  if(!review)speakText(currentPhrase.text);
}
function startEcho(id){currentPhrase=phraseById(id)||currentPhrase;if(!currentPhrase)return;showScreen("screen-echo");var hide=true,card=document.getElementById("echo-card");
  function paint(hidden){card.innerHTML="<div class='kicker'>Echo \u00b7 lantern "+currentPhrase.n+"</div><div class='pic-hero'>"+currentPhrase.pic+"</div><p class='hint'>"+currentPhrase.hook+"</p><p class='phrase "+(hidden?"hidden":"")+"'>"+escapeHtml(currentPhrase.text)+"</p><div id='heard-box' class='heard'>Mic is optional. You can also tap I said it.</div>";}
  paint(true);
  document.getElementById("btn-peek").onclick=function(){hide=!hide;paint(hide);};
  document.getElementById("btn-hear-echo").onclick=function(){speakText(currentPhrase.text);};
  document.getElementById("btn-said").onclick=function(){markHit(currentPhrase.id,true);};
  var speakBtn=document.getElementById("btn-speak");
  if(!voiceSupported)speakBtn.style.display="none";
  else{speakBtn.style.display="";speakBtn.onclick=function(){document.getElementById("heard-box").innerHTML="<span class='mic-dot'></span>Listening\u2026";listenOnce(currentPhrase.text,function(sc){var box=document.getElementById("heard-box");if(!sc.heard){box.textContent="Did not catch that. Tap I said it.";return;}box.textContent="Heard: "+sc.heard;markHit(currentPhrase.id,!!sc.ok);});};}
}
function startWalk(){stopListen();var known=currentPhrases().filter(function(ph){return itemState(ph.id).introduced||itemState(ph.id).state>0;});if(!known.length){toast("Light a lantern first.");return;}var i=0;
  function step(){currentPhrase=known[i];showScreen("screen-walk");document.getElementById("walk-card").innerHTML="<div class='kicker'>Walk \u00b7 "+(i+1)+" of "+known.length+"</div><div class='pic-hero'>"+currentPhrase.pic+"</div><p class='hint'>What does this lantern say?</p><p class='phrase hidden' id='walk-text'>"+escapeHtml(currentPhrase.text)+"</p><div class='btn-row'><button class='btn' id='w-peek'>Peek</button><button class='btn sage' id='w-said'>I said it</button></div>";
    document.getElementById("w-peek").onclick=function(){document.getElementById("walk-text").classList.toggle("hidden");};
    document.getElementById("w-said").onclick=function(){markHit(currentPhrase.id,true);i++;if(i>=known.length){toast("The path is walked.");showPath();}else step();};}
  step();
}
function startMix(){var known=currentPhrases().filter(function(ph){return itemState(ph.id).state>=1;});if(known.length<2){toast("Echo a couple of lanterns first.");startEcho(pickDue());return;}
  var a=known[Math.floor(Math.random()*known.length)],b=known[Math.floor(Math.random()*known.length)],g=0;while(b.id===a.id&&g++<8)b=known[Math.floor(Math.random()*known.length)];
  if(b.id===a.id){startEcho(a.id);return;}var first=a.n<b.n?a:b;showScreen("screen-mix");
  document.getElementById("mix-card").innerHTML="<div class='kicker'>Which lantern comes first?</div><div class='stones'></div>";
  var stones=document.querySelector("#mix-card .stones");[a,b].sort(function(){return Math.random()-0.5;}).forEach(function(ph){var s=document.createElement("button");s.className="stone";s.textContent=ph.pic+"  "+ph.hook;s.onclick=function(){if(ph.id===first.id){s.classList.add("good");markHit(ph.id,true);toast("That one is earlier on the path.");setTimeout(showPath,700);}else{toast("Try the other way.");markHit(ph.id,false);}};stones.appendChild(s);});
}
function markHit(id,ok){var st=itemState(id),f=getFun();if(ok){var consec=(st.consec||0)+1,state=st.state||0;if(state===0)state=1;if(consec>=2&&state<2)state=2;if(consec>=3&&state<3)state=3;setItem(id,{state:state,consec:consec,introduced:true});f.stars=(f.stars||0)+1;var day=new Date().toISOString().slice(0,10);if(f.questDay!==day){f.questDay=day;f.questN=0;}f.questN=(f.questN||0)+1;saveStore();if(state===3&&consec===3)toast("That lantern is shining.");}else setItem(id,{consec:0,introduced:true,state:Math.max(st.state||0,1)});}
function showHowTo(){showScreen("screen-howto");}
function showParent(){showScreen("screen-parent");var all=getProg();var lines=TOPICS.map(function(t){var bag=all[t.id]||{},shine=0;t.phrases.forEach(function(ph){if(bag[ph.id]&&bag[ph.id].state===3)shine++;});return t.title+": "+shine+" of "+t.phrases.length+" shining";}).join("<br>");
  var el=document.getElementById("stats-text");if(el)el.innerHTML="<p><strong>"+(getActiveProfile()&&getActiveProfile().name||"")+"</strong></p><p>"+lines+"</p>";
  var tog=document.getElementById("last-first");if(tog)tog.checked=!!store.lastFirst;if(typeof paintFamilyPanel==="function")paintFamilyPanel();
}
function toggleLastFirst(){store.lastFirst=!!(document.getElementById("last-first")&&document.getElementById("last-first").checked);saveStore();}
function resetProgress(){if(!pid())return;getProg()[topicId()]={};seedIntroduced();saveStore();}
function navHome(){var path=document.getElementById("screen-path");if(path&&path.classList.contains("on"))showHome();else if(document.querySelector("#screen-look.on,#screen-echo.on,#screen-walk.on,#screen-mix.on"))showPath();else showHome();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return({"&":"&","<":"<",">":">","\"":""","'":"&#39;"})[c];});}
try{loadStore();applyLincolnArt();if(store.activeId&&getActiveProfile())showHome();else showProfiles();}catch(e){try{showProfiles();}catch(e2){}}
