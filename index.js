import { evaluate, format } from 'mathjs';

const formulaEl = document.getElementById('formula');
const resultEl = document.getElementById('result');

let state = {
    expr: "", 
    lastValue: 0,
    ansValue: 0, 
    isShift: false,
    viewMode: "standard" 
};

const solve = (str) => {
    let clean = str.replace(/Ans/g, `(${state.ansValue})`);
    clean = clean.replace(/(\d+)°(\d+)'(\d+(?:\.\d+)?)"/g, '($1 + $2/60 + $3/3600)');
    clean = clean.replace(/(\d+)°(\d+)'/g, '($1 + $2/60)');
    clean = clean.replace(/(\d+)°/g, '($1)');
    clean = clean.replace(/×/g, '*').replace(/÷/g, '/');
    
    clean = clean.replace(/asin\(([^)]+)\)/g, 'unit(asin($1), "rad") to "deg"');
    clean = clean.replace(/acos\(([^)]+)\)/g, 'unit(acos($1), "rad") to "deg"');
    clean = clean.replace(/atan\(([^)]+)\)/g, 'unit(atan($1), "rad") to "deg"');
    clean = clean.replace(/(?<!a)sin\(([^)]+)\)/g, 'sin($1 deg)');
    clean = clean.replace(/(?<!a)cos\(([^)]+)\)/g, 'cos($1 deg)');
    clean = clean.replace(/(?<!a)tan\(([^)]+)\)/g, 'tan($1 deg)');

    let open = (clean.match(/\(/g) || []).length;
    let close = (clean.match(/\)/g) || []).length;
    while (open > close) { clean += ")"; open--; }
    return clean;
};

const doWork = (val, wrapper) => {
    if (val === "SHIFT") { state.isShift = !state.isShift; updateUI(); return; }
    if (val === "AC") { state.expr = ""; formulaEl.innerText = ""; state.viewMode = "standard"; updateUI(); return; }
    if (val === "DEL") { state.expr = state.expr.slice(0, -1); updateUI(); return; }

    let action = val;
    if (state.isShift) {
        const goldElements = wrapper?.getElementsByClassName('label-gold');
        if (goldElements && goldElements.length > 0) {
            const goldText = goldElements[0].innerText.trim();
            if (goldText.includes('asin')) action = 'asin';
            else if (goldText.includes('acos')) action = 'acos';
            else if (goldText.includes('atan')) action = 'atan';
        }
        state.isShift = false;
    }

    if (action === "=") {
        if (!state.expr) return;
        try {
            const rawRes = evaluate(solve(state.expr));
            const numeric = (typeof rawRes === 'object' && rawRes.type === 'Unit') ? rawRes.toNumber('deg') : rawRes;
            formulaEl.innerText = state.expr + "=";
            state.ansValue = numeric;
            state.lastValue = numeric;
            state.viewMode = state.expr.match(/[°'"]/g) ? "DMS" : "standard";
            state.expr = format(numeric, { precision: 12, notation: 'fixed' }).replace(/\.?0+$/, '');
        } catch (err) {
            resultEl.innerText = "Math ERROR";
        }
    } else if (action === "DMS") {
        const lastToken = state.expr.split(/[+\-*/() ]/).pop();
        const lastChar = state.expr.slice(-1);
        if (/\d/.test(lastChar)) {
            const symbols = ["°", "'", '"'];
            const count = (lastToken.match(/[°'"]/g) || []).length;
            if (count < 3) state.expr += symbols[count];
        } else if (state.lastValue !== 0) {
            state.viewMode = (state.viewMode === "DMS") ? "standard" : "DMS";
        }
    } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt'].includes(action)) {
        state.expr += action + "(";
    } else {
        state.expr += action;
    }
    updateUI();
};

// MULTI-LAYERED UNIVERSAL BINDING
// Handles PointerEvents (modern), TouchEvents (mobile), and Click (legacy)
const bindButtons = () => {
    const btns = document.getElementsByTagName('button');
    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i];
        const val = btn.getAttribute('data-val') || btn.dataset.v; // Dual selector support
        const wrapper = btn.closest('.btn-wrapper');

        const handler = (e) => {
            // Only allow one trigger per action to prevent double inputs
            if (e.defaultPrevented) return;
            e.preventDefault();
            e.stopPropagation();
            
            doWork(val, wrapper);
        };

        // Aggressive property-level binding (Bypasses most CSP and event-blocking layers)
        btn.onclick = handler;
        btn.ontouchstart = handler;
        btn.onmousedown = handler;
        
        // Modern standard fallback
        btn.addEventListener('pointerdown', handler, { passive: false });
    }
};

// Initial binding after DOM content load (Crucial for static pages like GH-Pages)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
} else {
    bindButtons();
}

// Keep the heart-beat for dynamic HMR or partial re-renders
setInterval(bindButtons, 3000);

function updateUI() {
    let modeH = state.isShift ? "S " : "";
    if (state.viewMode === "DMS" && state.lastValue !== 0) {
        const abs = Math.abs(state.lastValue);
        const deg = Math.floor(abs);
        const remMin = (abs - deg) * 60;
        const min = Math.floor(remMin);
        const sec = ((remMin - min) * 60).toFixed(2);
        resultEl.innerText = modeH + `${state.lastValue < 0 ? '-' : ''}${deg}°${min}'${sec}"`;
    } else {
        resultEl.innerText = modeH + (state.expr === "" ? "0" : state.expr);
    }
}
