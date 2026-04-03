import { evaluate, format } from 'mathjs';

const formulaEl = document.getElementById('formula');
const resultEl = document.getElementById('result');

let state = {
    expr: "", 
    lastValue: 0,
    ansValue: 0, 
    isShift: false,
    viewMode: "standard" // "standard", "DMS"
};

// 1. ADVANCED DMS PARSER (Converts input like 33°25'32" into decimal)
const solve = (str) => {
    let clean = str.replace(/Ans/g, `(${state.ansValue})`);
    
    // Convert 33°25'32" notation into numeric addition that evaluates correctly
    clean = clean.replace(/(\d+)°(\d+)'(\d+(?:\.\d+)?)"/g, '($1 + $2/60 + $3/3600)');
    clean = clean.replace(/(\d+)°(\d+)'/g, '($1 + $2/60)');
    clean = clean.replace(/(\d+)°/g, '($1)');

    clean = clean.replace(/×/g, '*').replace(/÷/g, '/');
    
    // Trig logic with degree forcing
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

// GLOBAL CLICK LISTENER
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    
    const val = btn.dataset.v;
    if (val === "SHIFT") { state.isShift = !state.isShift; update(); return; }
    if (val === "AC") { state.expr = ""; formulaEl.innerText = ""; state.viewMode = "standard"; update(); return; }
    if (val === "DEL") { state.expr = state.expr.slice(0, -1); update(); return; }

    if (val === "=") {
        if (!state.expr) return;
        try {
            const rawRes = evaluate(solve(state.expr));
            const numeric = (typeof rawRes === 'object' && rawRes.type === 'Unit') ? rawRes.toNumber('deg') : rawRes;
            
            formulaEl.innerText = state.expr + "=";
            state.ansValue = numeric;
            state.lastValue = numeric;
            
            // AUTO-DMS: If the input had DMS symbols, automatically display the result in DMS
            if (state.expr.match(/[°'"]/g)) {
                state.viewMode = "DMS";
            } else {
                state.viewMode = "standard";
            }
            
            state.expr = format(numeric, { precision: 12, notation: 'fixed' }).replace(/\.?0+$/, '');
        } catch (err) {
            resultEl.innerText = "Math ERROR";
        }
    } else if (val === "DMS") {
        const lastToken = state.expr.split(/[+\-*/() ]/).pop();
        const lastChar = state.expr.slice(-1);
        
        if (/\d/.test(lastChar)) {
            // Append symbols sequence in input mode
            const dmsSymbols = ["°", "'", '"'];
            const tokenSymbolsCount = (lastToken.match(/[°'"]/g) || []).length;
            if (tokenSymbolsCount < 3) {
                state.expr += dmsSymbols[tokenSymbolsCount];
            }
        } else if (state.lastValue !== 0) {
            // Manual toggle for results
            state.viewMode = (state.viewMode === "DMS") ? "standard" : "DMS";
        }
    } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt'].includes(val)) {
        state.expr += val + "(";
    } else {
        state.expr += val;
    }

    update();
});

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
