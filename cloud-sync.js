import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getDatabase, ref, get, set, onValue } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js';
import { firebaseConfig, firebaseConfigured } from './firebase-config.js';

const $ = (s) => document.querySelector(s);
let auth, database, activeUid = null, applyingRemote = false, timer = null, stopListener = null;
const status = (msg, good=false) => { const el=$('#cloudStatus'); if(el){el.textContent=msg;el.dataset.good=good?'1':'0';} };
function injectPanel(){
  const style=document.createElement('style'); style.textContent=`#cloudPanel{margin:14px 24px 0;padding:14px;background:var(--card,#fff);border:1px solid var(--line,#ddd);border-radius:14px;color:var(--ink,#222)}#cloudPanel .cloudrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:9px}#cloudPanel input{min-width:0;flex:1;padding:10px;border:1px solid var(--line,#ddd);border-radius:9px;background:var(--bg,#fff);color:var(--ink,#222)}#cloudPanel button{padding:9px 12px}#cloudStatus{font-size:13px;color:var(--muted,#666)}#cloudStatus[data-good="1"]{color:#25805a}`;document.head.appendChild(style);
  const panel=document.createElement('section');panel.id='cloudPanel';panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><strong>حساب حضيرتي والمزامنة</strong><span id="cloudStatus">التحقق من إعدادات الربط…</span></div><div class="cloudrow" id="cloudAuthForm"><input id="cloudEmail" type="email" autocomplete="email" placeholder="البريد الإلكتروني" aria-label="البريد الإلكتروني"><input id="cloudPassword" type="password" autocomplete="current-password" placeholder="كلمة المرور (6 أحرف على الأقل)" aria-label="كلمة المرور"><button id="cloudLogin">دخول</button><button id="cloudRegister" class="secondary">إنشاء حساب</button></div><div class="cloudrow"><span id="cloudUser" style="font-size:13px"></span><button id="cloudLogout" class="ghost" hidden>تسجيل الخروج</button></div><p class="muted" style="margin:8px 0 0">قبل تفعيل المزامنة، تأكد من نشر قواعد الأمان المرفقة بالمشروع. بيانات كل حساب محفوظة في مساره الخاص.</p>`;
  const main=document.querySelector('.main'); if(main) main.insertBefore(panel,main.firstChild);
  $('#cloudLogin').onclick=()=>authAction('login'); $('#cloudRegister').onclick=()=>authAction('register'); $('#cloudLogout').onclick=()=>signOut(auth);
}
function errorText(e){const map={'auth/invalid-email':'صيغة البريد غير صحيحة.','auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة.','auth/email-already-in-use':'البريد مسجل من قبل؛ جرّب الدخول.','auth/weak-password':'كلمة المرور لازم تكون 6 أحرف على الأقل.','auth/operation-not-allowed':'فعّل Email/Password من Firebase Authentication.','auth/network-request-failed':'تعذر الاتصال؛ تحقق من الإنترنت.','PERMISSION_DENIED':'قواعد قاعدة البيانات لا تسمح بالعملية بعد.'};return map[e?.code]||e?.message||'حدث خطأ غير معروف.'}
async function authAction(which){const email=$('#cloudEmail').value.trim(),password=$('#cloudPassword').value;if(!email||!password){status('اكتب البريد الإلكتروني وكلمة المرور.');return;}$('#cloudLogin').disabled=$('#cloudRegister').disabled=true;try{if(which==='register')await createUserWithEmailAndPassword(auth,email,password);else await signInWithEmailAndPassword(auth,email,password);}catch(e){status(errorText(e));}finally{$('#cloudLogin').disabled=$('#cloudRegister').disabled=false;}}
function normalize(d){if(!d||typeof d!=='object')return null;for(const k of ['birds','cages','pairs','eggs','production','inventory','transactions','debts','archive','auditLog'])if(!Array.isArray(d[k]))d[k]=[];return d;}
function localData(){try{return JSON.parse(localStorage.getItem('hadheerti_data')||'null')}catch{return null}}
async function loadAndWatch(uid){
  activeUid=uid;
  if(stopListener){stopListener();stopListener=null;}
  const userRef=ref(database,`users/${uid}/data`);
  status('جارٍ جلب بيانات الحساب…');
  try {
    const snap=await get(userRef);
    if(activeUid!==uid)return;
    const cloud=normalize(snap.val());
    const local=normalize(localData());
    if(cloud){
      // Avoid silently overwriting newer local records on first sign-in.
      const localHasRecords=!!(local && Object.values(local).some(v=>Array.isArray(v)&&v.length));
      const remoteAt=Date.parse(cloud.meta?.lastSavedAt||'')||0;
      const localAt=Date.parse(local?.meta?.lastSavedAt||'')||0;
      if(localHasRecords && JSON.stringify(localData())!==JSON.stringify(cloud) && localAt>remoteAt+1000){
        const ok=window.confirm('بيانات هذا الجهاز أحدث من بيانات السحابة. هل تريد رفع بيانات الجهاز واستبدال نسخة السحابة لهذا الحساب؟');
        if(ok){
          local.meta={...(local.meta||{}),lastSavedAt:new Date().toISOString()};
          await set(userRef,local);
          status('تم رفع بيانات الجهاز الأحدث إلى السحابة.',true);
        } else {
          applyingRemote=true;localStorage.setItem('hadheerti_data',JSON.stringify(cloud));applyingRemote=false;
          status('تم تحميل نسخة السحابة؛ لم نرفع بيانات الجهاز.',true);
          window.dispatchEvent(new CustomEvent('hadheerti:remote-updated'));
        }
      } else if(JSON.stringify(localData())!==JSON.stringify(cloud)){
        applyingRemote=true;
        localStorage.setItem('hadheerti_data',JSON.stringify(cloud));
        applyingRemote=false;
        status('تم تحميل بيانات حسابك من السحابة.',true);
        window.dispatchEvent(new CustomEvent('hadheerti:remote-updated'));
      } else status('بيانات الحساب متزامنة مع السحابة.',true);
    } else if(local && Object.values(local).some(v=>Array.isArray(v)&&v.length)){
      const ok=window.confirm('هذا الحساب لا يحتوي بيانات سحابية بعد. هل تريد رفع بيانات هذا الجهاز لأول مرة؟');
      if(!ok){status('لم نرفع البيانات. بيانات الجهاز محفوظة محليًا.');return;}
      await set(userRef,local);
      status('تم رفع بيانات هذا الجهاز للحساب.',true);
    } else {
      const empty={birds:[],cages:[],pairs:[],eggs:[],production:[],inventory:[],transactions:[],debts:[],archive:[],auditLog:[],settings:{theme:'light',currency:'LYD',species:['بادجي','كوكتيل','روز'],ownerName:'صاحب الحضيرة'},meta:{schemaVersion:2,lastSavedAt:new Date().toISOString()}};
      await set(userRef,empty);
      localStorage.setItem('hadheerti_data',JSON.stringify(empty));
      status('تم إنشاء مساحة بيانات سحابية للحساب.',true);
      window.dispatchEvent(new CustomEvent('hadheerti:remote-updated'));
    }
    // Always listen after successful initial load/upload, including when local data was declined.
    stopListener=onValue(userRef,s=>{
      if(!activeUid||activeUid!==uid||!s.exists())return;
      const data=normalize(s.val());if(!data)return;
      const current=localData();
      const remoteAt=Date.parse(data.meta?.lastSavedAt||'');
      const localAt=Date.parse(current?.meta?.lastSavedAt||'');
      if(remoteAt>localAt+1000){
        applyingRemote=true;localStorage.setItem('hadheerti_data',JSON.stringify(data));applyingRemote=false;
        window.dispatchEvent(new CustomEvent('hadheerti:remote-updated'));
      }
    },e=>status('تعذر الاستماع للتحديثات: '+errorText(e)));
  } catch(e){ applyingRemote=false; status('تعذر تحميل بيانات الحساب: '+errorText(e)); }
}
window.addEventListener('hadheerti:local-save',()=>{if(!activeUid||applyingRemote)return;clearTimeout(timer);timer=setTimeout(async()=>{try{const data=localData();if(data){data.meta={...(data.meta||{}),lastSavedAt:new Date().toISOString()};await set(ref(database,`users/${activeUid}/data`),data);status('تمت مزامنة آخر التغييرات.',true);}}catch(e){status('الحفظ المحلي مستمر؛ تعذرت المزامنة: '+errorText(e));}},800);});
window.addEventListener('hadheerti:remote-updated',()=>{status('وصل تحديث من جهاز آخر؛ جاري تحديث الشاشة.',true);window.location.reload();});
injectPanel();
if(!firebaseConfigured){status('ينقصنا إعداد تطبيق Firebase العام؛ لم يتم الاتصال بالسحابة بعد.');$('#cloudAuthForm').hidden=true;return;}
const app=initializeApp(firebaseConfig);auth=getAuth(app);database=getDatabase(app);setPersistence(auth,browserLocalPersistence).catch(()=>{});
onAuthStateChanged(auth,async user=>{if(!user){activeUid=null;if(stopListener){stopListener();stopListener=null;}$('#cloudUser').textContent='لم يتم تسجيل الدخول — البيانات الحالية محلية على هذا الجهاز.';$('#cloudLogout').hidden=true;$('#cloudAuthForm').hidden=false;status('سجّل الدخول لتفعيل المزامنة بين أجهزتك.');return;}$('#cloudUser').textContent='الحساب: '+user.email;$('#cloudLogout').hidden=false;$('#cloudAuthForm').hidden=true;try{await loadAndWatch(user.uid);}catch(e){status('تعذر تحميل بيانات الحساب: '+errorText(e));}});
