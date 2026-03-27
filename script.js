// --- 1. CONFIG & MAP ---
const map = L.map('map', {zoomControl: false}).setView([9.01, 38.76], 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

// Track the route line globally so it can be cleared
let routeLine = null;

const hubs = {
    "Megenagna": [9.023, 38.802], "Bole": [8.995, 38.775], "Piazza": [9.034, 38.747], 
    "Mexico": [9.012, 38.756], "CMC": [9.022, 38.865], "Sarbet": [8.998, 38.745],
    "4 Kilo": [9.033, 38.763], "Lideta": [9.013, 38.741], "Gerji": [9.002, 38.805],
    "Ayat": [9.035, 38.895], "Kality": [8.925, 38.785], "Jemo": [8.975, 38.705]
};

const providersRaw = [
    { base: 130, perKm: 18, icon: "🚕" }, { base: 130, perKm: 17, icon: "🐎" },
    { base: 92, perKm: 14, icon: "🔴" }, { base: 125, perKm: 17, icon: "👸" },
    { base: 105, perKm: 16, icon: "🚕" }, { base: 10, perKm: 3, icon: "🚐" }
];

let currentLang = 'en';
let viewDate = new Date(); 

const translations = {
    en: {
        toggle: "አማርኛ", title: "AddisGo", sub: "AI Ride Comparison", hRoute: "Global Route Finder",
        btnCompare: "Compare All Rides", hMarket: "Market Essentials", hFuel: "Fuel Rates", hCurr: "Forex Board",
        back: "← Back", est: "Est. Total", viewHol: "VIEW HOLIDAYS →",
        providers: ["RIDE", "Feres", "Yango Economy", "Seregela", "TaxiYE", "Blue Minibus"],
        items: ["Teff (Magna)", "Bread", "Oil"],
        ethMonths: ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yakatit", "Megabit", "Miazia", "Genbot", "Sene", "Hamle", "Nehasse", "Pagume"]
    },
    am: {
        toggle: "English", title: "አዲስ ጎ", sub: "AI የጉዞ ንፅፅር", hRoute: "የጉዞ መፈለጊያ",
        btnCompare: "ታሪፎችን አወዳድር", hMarket: "መሰረታዊ የገበያ ዋጋ", hFuel: "የነዳጅ ዋጋ", hCurr: "የውጭ ምንዛሬ",
        back: "← ተመለስ", est: "ግምታዊ ዋጋ", viewHol: "በዓላትን ይመልከቱ →",
        providers: ["ራይድ", "ፈረስ", "ያንጎ", "ሰረገላ", "ታክሲዬ", "ሰማያዊ ሚኒባስ"],
        items: ["ጤፍ (ማግና)", "ዳቦ", "ዘይት"],
        ethMonths: ["መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"]
    }
};

// --- 2. THE HOLIDAY ORACLE ---
function getHolidaysForYear(ethYear) {
    let h = {
        '1-1': { en: "Enkutatash (New Year)", am: "እንቁጣጣሽ" },
        '1-17': { en: "Meskel", am: "መስቀል" },
        '4-29': { en: "Genna (Christmas)", am: "ገና" },
        '5-11': { en: "Timket (Epiphany)", am: "ጥምቀት" },
        '6-23': { en: "Adwa Victory Day", am: "የዓድዋ ድል" },
        '8-27': { en: "Patriots' Day", am: "የአርበኞች ቀን" },
        '9-18': { en: "Eid al-Adha", am: "ኢድ አል-አድሃ" },
        '9-20': { en: "Downfall of Derg", am: "የደርግ ውድቀት" },
        '12-12': { en: "Mawlid", am: "መውሊድ" }
    };
    if (ethYear === 2018) {
        h['7-11'] = { en: "Eid al-Fitr", am: "ኢድ አል-ፈጥር" };
        h['8-4'] = { en: "Fasika (Easter)", am: "ፋሲካ" };
    }
    return h;
}

// --- 3. THE CALENDAR ENGINE ---
function getEthioDate(date) {
    const ecNewYear = new Date(2025, 8, 11); 
    const diff = date - ecNewYear;
    const daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));

    let year = 2018; 
    let month = Math.floor(daysSince / 30) + 1;
    let day = (daysSince % 30) + 1;

    if (month > 13) { month = 13; day = daysSince - 360 + 1; }
    return { day, month, year };
}

function renderFullCalendar() {
    const modal = document.getElementById('calendar-modal');
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('cal-month-year');
    const lang = currentLang;
    
    modal.style.display = "flex";
    const eth = getEthioDate(viewDate);
    title.innerText = `${translations[lang].ethMonths[eth.month - 1]} ${eth.year}`;

    let html = "";
    const weekDays = lang === 'en' ? ['S','M','T','W','T','F','S'] : ['እ','ሰ','ማ','ረ','ሐ','ዓ','ቅ'];
    weekDays.forEach(d => html += `<div style="color:#94a3b8; font-size:11px; padding-bottom:10px;">${d}</div>`);

    const totalDays = eth.month === 13 ? 5 : 30;
    const todayEth = getEthioDate(new Date());
    const holidays = getHolidaysForYear(eth.year);

    for (let i = 1; i <= totalDays; i++) {
        const key = `${eth.month}-${i}`;
        let isHoliday = holidays[key] ? true : false;
        let isWeekend = (i % 7 === 1 || i % 7 === 0);
        let statusColor = (isHoliday || isWeekend) ? "#ef4444" : "#22c55e";
        
        let isToday = (i === todayEth.day && eth.month === todayEth.month && eth.year === todayEth.year);
        let bgColor = isToday ? "#fef3c7" : "transparent";
        let border = isToday ? "2px solid #f59e0b" : "1px solid #f1f5f9";

        html += `<div onclick="checkDayStatus(${i}, ${eth.month})" style="padding:10px; cursor:pointer; background:${bgColor}; border-radius:10px; border:${border}; transition:0.2s;">
                <span style="font-size:14px; font-weight:bold;">${i}</span>
                <div style="width:6px; height:6px; background:${statusColor}; border-radius:50%; margin: 4px auto 0;"></div>
            </div>`;
    }
    grid.innerHTML = html;
}

function checkDayStatus(day, month) {
    const info = document.getElementById('holiday-info');
    const eth = getEthioDate(viewDate);
    const holidays = getHolidaysForYear(eth.year);
    const key = `${month}-${day}`;
    const lang = currentLang;

    if (holidays[key]) {
        let alert = ["4-29", "8-4", "1-1"].includes(key) ? `<br><span style="color:#d29922; font-size:12px;">🐑 Holiday Market: Sheep prices up!</span>` : "";
        info.innerHTML = `<b style="color:#b91c1c; font-size:18px;">✨ ${holidays[key][lang]}</b>${alert}<br><span style="color:#ef4444; font-weight:bold;">🚫 NATIONAL HOLIDAY</span>`;
    } else {
        let isWeekend = (day % 7 === 1 || day % 7 === 0);
        info.innerHTML = isWeekend ? `<b>${lang === 'en' ? 'Weekend' : 'የእረፍት ቀን'}</b><br><span style="color:#ef4444;">🛋️ OFF WORK</span>` :
            `<b>${lang === 'en' ? 'Regular Day' : 'መደበኛ ቀን'}</b><br><span style="color:#22c55e;">💼 BUSINESS AS USUAL</span>`;
    }
}

// --- 4. DATA & SYNC ---
async function syncLiveForex() {
    const list = document.getElementById('curr-list');
    const baseUSD = 157.15; 
    const currencies = [
        { code: 'USD', flag: '🇺🇸' }, { code: 'EUR', flag: '🇪🇺' }, 
        { code: 'GBP', flag: '🇬🇧' }, { code: 'CNY', flag: '🇨🇳' }, { code: 'SAR', flag: '🇸🇦' }
    ];

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        
        list.innerHTML = currencies.map(c => {
            const val = c.code === 'USD' ? baseUSD : (baseUSD / data.rates[c.code]);
            return `<div class="row" style="display:flex; justify-content:space-between; padding:5px 0;">
                <span>${c.flag} ${c.code}</span><b id="tick-${c.code.toLowerCase()}">${val.toFixed(2)}</b>
            </div>`;
        }).join('');
    } catch (e) {
        list.innerHTML = `<div style="color:red">Forex Sync Error</div>`;
    }
}

async function syncAddisWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=9.03&longitude=38.74&current_weather=true');
        const data = await res.json();
        document.getElementById('tick-temp').innerText = data.current_weather.temperature.toFixed(1);
        document.getElementById('w-icon').innerText = data.current_weather.weathercode >= 51 ? "🌧️" : "☀️";
        document.getElementById('w-status').innerText = "LIVE ADDIS SENSOR: ONLINE";
    } catch (e) { console.log("Weather Failed"); }
}

function renderMarketData() {
    const t = translations[currentLang];
    const essGrid = document.getElementById('ess-grid');
    if(essGrid) {
        essGrid.innerHTML = t.items.map(item => `
            <div class="box"><small>${item}</small><b>${item.includes("Bread") || item.includes("ዳቦ") ? "15" : (item.includes("Oil") || item.includes("ዘይት") ? "1450" : "185")} ETB</b></div>
        `).join('');
    }
    const fuel = document.getElementById('fuel-grid');
    if(fuel) {
        fuel.innerHTML = `<div class="box"><small>⛽ Benzene</small><b id="tick-benz">132.18</b></div>
            <div class="box"><small>⛽ Diesel</small><b id="tick-dies">139.84</b></div>`;
    }
    updateCalendarBox();
}

function startLiveTicker() {
    const allTicks = ['tick-usd', 'tick-eur', 'tick-gbp', 'tick-cny', 'tick-sar', 'tick-benz', 'tick-dies', 'tick-temp'];
    setInterval(() => {
        allTicks.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                let current = parseFloat(el.innerText);
                let jitter = (Math.random() * 0.04 - 0.02);
                el.innerText = (current + jitter).toFixed(2);
                el.style.color = jitter > 0 ? "#10b981" : "#ef4444";
                setTimeout(() => el.style.color = "#d29922", 1000);
            }
        });
    }, 3000);
}

// --- 5. INITIALIZE & HELPERS ---
function updateCalendarBox() {
    const today = getEthioDate(new Date());
    const t = translations[currentLang];
    document.getElementById('box-eth-date').innerText = `${t.ethMonths[today.month - 1]} ${today.day}, ${today.year}`;
    document.getElementById('box-eth-label').innerText = t.viewHol;
}

function openFullCalendar() { viewDate = new Date(); renderFullCalendar(); }
function changeMonth(offset) { viewDate.setMonth(viewDate.getMonth() + offset); renderFullCalendar(); }
function closeCalendar() { document.getElementById('calendar-modal').style.display = "none"; }

function handleMapClick(name) {
    let s = document.getElementById('start'), d = document.getElementById('dest');
    if (!s.value) s.value = name; 
    else if (!d.value && s.value !== name) d.value = name; 
    else { s.value = name; d.value = ""; }
}

function openComparison() {
    const sName = document.getElementById('start').value;
    const dName = document.getElementById('dest').value;
    if(!sName || !dName) return alert("Select 2 points on map!");

    const startCoords = hubs[sName];
    const destCoords = hubs[dName];
    const dist = (map.distance(startCoords, destCoords)/1000).toFixed(1);

    if (routeLine) { map.removeLayer(routeLine); }
    routeLine = L.polyline([startCoords, destCoords], {
        color: '#d29922', weight: 4, dashArray: '10, 10', opacity: 0.7
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    const t = translations[currentLang];
    document.getElementById('route-km').innerText = `${dist} KM`;
    document.getElementById('route-title').innerText = `${sName} ➔ ${dName}`;
    document.body.classList.add('split-active');
    document.getElementById('vertical-ride-list').innerHTML = providersRaw.map((p, i) => {
        const price = Math.round(p.base + (p.perKm * dist));
        return `<div class="ride-box" onclick="showFinal('${t.providers[i]}', ${price})">
            <div style="font-size:30px">${p.icon}</div>
            <div class="ride-name"><b>${t.providers[i]}</b></div>
            <div class="ride-price">${price} ETB</div>
        </div>`;
    }).join('');
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'am' : 'en';
    renderMarketData();
    syncLiveForex();
    const t = translations[currentLang];
    document.getElementById('lang-toggle').innerText = t.toggle;
    document.getElementById('main-title').innerHTML = `${t.title} <span class="accent">Pro</span>`;
    document.getElementById('main-sub').innerText = t.sub;
    document.getElementById('h-route').innerText = t.hRoute;
    document.getElementById('h-market').innerText = t.hMarket;
    document.getElementById('h-fuel').innerText = t.hFuel;
    document.getElementById('h-curr').innerText = t.hCurr;
    document.getElementById('btn-compare').innerText = t.btnCompare;
}

function showFinal(n, p) { 
    document.getElementById('confirm-brand').innerText = n; 
    document.getElementById('confirm-price').innerText = `${p} ETB`; 
    document.getElementById('confirm-modal').style.display = "flex"; 
}

function closeAll() { document.getElementById('confirm-modal').style.display = "none"; }

function closeSplitView() { 
    document.body.classList.remove('split-active'); 
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    map.setView([9.01, 38.76], 12);
}

window.onload = () => {
    renderMarketData();
    syncLiveForex();
    syncAddisWeather();
    startLiveTicker();
    Object.keys(hubs).forEach(name => {
        L.circleMarker(hubs[name], {color:'#d29922', radius:8, fillOpacity:0.8}).addTo(map)
         .on('click', () => handleMapClick(name));
        let li = document.createElement('li');
        li.innerHTML = `📍 ${name}`;
        li.onclick = () => handleMapClick(name);
        document.getElementById('hub-list').appendChild(li);
    });
};