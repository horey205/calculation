// CASIO FX-570VN PLUS | INDEPENDENT ENGINE (NO EXTERNAL IMPORTS)
// This file is designed for static environments like GitHub Pages.

const formulaEl = document.getElementById('formula');
const resultEl = document.getElementById('result');

let state = {
    expr: "", 
    lastValue: 0,
    ansValue: 0, 
    isShift: false,
    viewMode: "standard" 
};

// 1. ROBUST INTERNAL MATH ENGINE (Native JavaScript)
const degToRad = (d) => d * (Math.PI / 180);
const radToDeg = (r) => r * (180 / Math.PI);

const calculateInternal = (str) => {
    try {
        let f = str.replace(/Ans/g, `(${state.ansValue})`);
        
        // DMS Parser: Convert X°Y'Z" to Decimal
        f = f.replace(/(\d+)°(\d+)'(\d+(?:\.\d+)?)"/g, '($1 + $2/60 + $3/3600)');
        f = f.replace(/(\d+)°(\d+)'/g, '($1 + $2/60)');
        f = f.replace(/(\d+)°/g, '($1)');

        // Map Operators
        f = f.replace(/×/g, '*').replace(/÷/g, '/');
        
        // Map Trig Functions (Forcing Degree Mode)
        f = f.replace(/asin\(([^)]+)\)/g, 'radToDeg(Math.asin($1))');
        f = f.replace(/acos\(([^)]+)\)/g, 'radToDeg(Math.acos($1))');
        f = f.replace(/atan\(([^)]+)\)/g, 'radToDeg(Math.atan($1))');
        
        f = f.replace(/(?<!a)sin\(([^)]+)\)/g, 'Math.sin(degToRad($1))');
        f = f.replace(/(?<!a)cos\(([^)]+)\)/g, 'Math.cos(degToRad($1))');
        f = f.replace(/(?<!a)tan\(([^)]+)\)/g, 'Math.tan(degToRad($1))');

        // Other Common Funcs
        f = f.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');

        // Balanced Parentheses
        let open = (f.match(/\(/g) || []).length;
        let close = (f.match(/\)/g) || []).length;
        while (open > close) { f += ")"; open--; }

        // Evaluation
        return eval(f);
    } catch (e) {
        throw new Error("Math ERROR");
    }
};

const processInput = (val, wrapper) => {
    if (val === "SHIFT") { state.isShift = !state.isShift; updateUI(); return; }
    if (val === "AC") { state.expr = ""; formulaEl.innerText = ""; state.viewMode = "standard"; updateUI(); return; }
    if (val === "DEL") { state.expr = state.expr.slice(0, -1); updateUI(); return; }

    let action = val;
    if (state.isShift) {
        const goldEls = wrapper?.getElementsByClassName('label-gold');
        if (goldEls && goldEls.length > 0) {
            const goldTxt = goldEls[0].innerText.trim();
            if (goldTxt.includes('asin')) action = 'asin';
            else if (goldTxt.includes('acos')) action = 'acos';
            else if (goldTxt.includes('atan')) action = 'atan';
        }
        state.isShift = false;
    }

    if (action === "=") {
        if (!state.expr) return;
        try {
            const result = calculateInternal(state.expr);
            formulaEl.innerText = state.expr + "=";
            state.ansValue = result;
            state.lastValue = result;
            state.viewMode = state.expr.match(/[°'"]/g) ? "DMS" : "standard";
            state.expr = Number.isSafeInteger(result) ? result.toString() : result.toFixed(10).replace(/\.?0+$/, '');
        } catch (err) {
            resultEl.innerText = "Math ERROR";
        }
    } else if (action === "DMS") {
        const lastT = state.expr.split(/[+\-*/() ]/).pop();
        const lastC = state.expr.slice(-1);
        if (/\d/.test(lastC)) {
            const syms = ["°", "'", '"'];
            const cnt = (lastT.match(/[°'"]/g) || []).length;
            if (cnt < 3) state.expr += syms[cnt];
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

const bindAll = () => {
    document.querySelectorAll('button').forEach(btn => {
        const val = btn.getAttribute('data-v') || btn.getAttribute('data-val');
        const wrap = btn.closest('.btn-wrapper');
        const trigger = (e) => {
            e.preventDefault();
            e.stopPropagation();
            processInput(val, wrap);
            btn.style.opacity = "0.5";
            setTimeout(() => { btn.style.opacity = "1"; }, 80);
            return false;
        };
        btn.onclick = trigger;
        btn.ontouchstart = trigger;
        btn.onmousedown = trigger;
    });
};

window.onload = bindAll;
setInterval(bindAll, 3000);

function toDMS(d) {
    const abs = Math.abs(d);
    const deg = Math.floor(abs);
    const remMin = (abs - deg) * 60;
    const min = Math.floor(remMin);
    const sec = ((remMin - min) * 60).toFixed(2);
    return `${d < 0 ? '-' : ''}${deg}°${min}'${sec}"`;
}

function updateUI() {
    let modeH = state.isShift ? "S " : "";
    if (state.viewMode === "DMS" && state.lastValue !== 0) {
        resultEl.innerText = modeH + toDMS(state.lastValue);
    } else {
        resultEl.innerText = modeH + (state.expr === "" ? "0" : state.expr);
    }
}
