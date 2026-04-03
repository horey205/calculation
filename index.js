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

// EXPLICIT ACTION FUNCTION
const doClick = (btnVal, btnWrapper) => {
    const val = btnVal;
    
    if (val === "SHIFT") { state.isShift = !state.isShift; update(); return; }
    if (val === "AC") { state.expr = ""; formulaEl.innerText = ""; state.viewMode = "standard"; update(); return; }
    if (val === "DEL") { state.expr = state.expr.slice(0, -1); update(); return; }

    let action = val;
    if (state.isShift) {
        // Re-read gold label since we might be in shift state
        const gold = btnWrapper?.querySelector('.label-gold')?.innerText.trim() || "";
        if (gold.includes('asin')) action = 'asin';
        else if (gold.includes('acos')) action = 'acos';
        else if (gold.includes('atan')) action = 'atan';
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
            const dmsSymbols = ["°", "'", '"'];
            const count = (lastToken.match(/[°'"]/g) || []).length;
            if (count < 3) state.expr += dmsSymbols[count];
        } else if (state.lastValue !== 0) {
            state.viewMode = (state.viewMode === "DMS") ? "standard" : "DMS";
        }
    } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt'].includes(action)) {
        state.expr += action + "(";
    } else {
        state.expr += action;
    }
    update();
};

// FINAL OVERHAUL FOR TOUCH RELIABILITY
// Using the most basic and compatible event attachment strategy
window.onload = () => {
    const buttons = document.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
        const b = buttons[i];
        
        // Use pointerdown or touchstart directly on the element
        const trigger = (e) => {
            e.preventDefault();
            e.stopPropagation();
            doClick(b.getAttribute('data-v'), b.closest('.btn-wrapper'));
        };

        b.addEventListener('pointerdown', trigger, { passive: false });
        b.addEventListener('click', trigger);
    }
};

function toDMS(d) {
    const abs = Math.abs(d);
    const deg = Math.floor(abs);
    const remMin = (abs - deg) * 60;
    const min = Math.floor(remMin);
    const sec = ((remMin - min) * 60).toFixed(2);
    return `${d < 0 ? '-' : ''}${deg}°${min}'${sec}"`;
}

function update() {
    let modeH = state.isShift ? "S " : "";
    if (state.viewMode === "DMS" && state.lastValue !== 0) {
        resultEl.innerText = modeH + toDMS(state.lastValue);
    } else {
        resultEl.innerText = modeH + (state.expr === "" ? "0" : state.expr);
    }
}
